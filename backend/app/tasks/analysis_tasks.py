from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
import pandas as pd
from celery import Celery
from sqlalchemy import select, delete

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.analysis import Analysis, AnalysisStatus
from app.models.dataset import Dataset
from app.models.anomaly import Anomaly
from app.models.user import User
from app.services.s3_service import StorageService
from app.services.email_service import EmailService
from app.ml.pipeline import AnomalyDetectionPipeline
from app.utils.csv_parser import parse_csv_file

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Celery app
celery_app = Celery(
    'clinical_detector',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Optional configuration overrides for Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

async def _run_analysis_async(analysis_id: str) -> None:
    """Async implementation of the analysis worker task."""
    logger.info("Starting background analysis task for Analysis ID: %s", analysis_id)
    
    async with AsyncSessionLocal() as db:
        # 1. Fetch analysis record
        analysis_result = await db.execute(
            select(Analysis).where(Analysis.id == analysis_id)
        )
        analysis = analysis_result.scalar_one_or_none()
        if not analysis:
            logger.error("Analysis record %s not found in database. Aborting.", analysis_id)
            return

        # 2. Update status to PROCESSING
        analysis.status = AnalysisStatus.PROCESSING
        analysis.started_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(analysis)

        try:
            # 3. Fetch dataset and user details
            dataset_result = await db.execute(
                select(Dataset).where(Dataset.id == analysis.dataset_id)
            )
            dataset = dataset_result.scalar_one_or_none()
            if not dataset:
                raise ValueError(f"Dataset {analysis.dataset_id} not found.")

            user_result = await db.execute(
                select(User).where(User.id == analysis.user_id)
            )
            user = user_result.scalar_one_or_none()

            # 4. Download file from S3 / Local storage
            storage = StorageService(settings)
            file_bytes = await storage.download_file(dataset.s3_key)
            
            # 5. Parse CSV bytes
            df = parse_csv_file(file_bytes)

            # 6. Run pipeline
            pipeline = AnomalyDetectionPipeline(analysis.config or {})
            result = pipeline.run(df)

            # 7. Clear old anomalies for this analysis if any (re-run safety)
            await db.execute(
                delete(Anomaly).where(Anomaly.analysis_id == analysis_id)
            )

            # 8. Save detected anomalies to database
            anomaly_objects = []
            for anom in result.anomalies:
                db_anom = Anomaly(
                    analysis_id=analysis_id,
                    row_index=anom['row_index'],
                    column_name=anom['column_name'],
                    subject_id=anom['subject_id'],
                    value=anom['value'],
                    expected_range_min=anom['expected_range_min'],
                    expected_range_max=anom['expected_range_max'],
                    z_score=anom['z_score'],
                    anomaly_score=anom['anomaly_score'],
                    severity=anom['severity'],
                    detection_method=anom['detection_method'],
                    anomaly_type=anom['anomaly_type'],
                    clinical_significance=anom['clinical_significance'],
                    suggested_action=anom['suggested_action']
                )
                db.add(db_anom)
                anomaly_objects.append(db_anom)

            # 9. Update analysis metrics and status to COMPLETED
            analysis.status = AnalysisStatus.COMPLETED
            analysis.completed_at = datetime.now(timezone.utc)
            
            # Record processing time
            if analysis.started_at:
                delta = analysis.completed_at - analysis.started_at
                analysis.processing_time_seconds = delta.total_seconds()
            else:
                analysis.processing_time_seconds = result.processing_time_seconds

            analysis.total_rows_analyzed = result.total_rows_analyzed
            analysis.total_anomalies_detected = result.total_anomalies_detected
            analysis.anomaly_rate_percent = result.anomaly_rate_percent
            analysis.overall_data_quality_score = result.overall_data_quality_score
            
            analysis.column_statistics = result.column_statistics
            analysis.algorithm_results = result.algorithm_results
            analysis.anomaly_summary = result.anomaly_summary
            analysis.recommendations = result.recommendations

            await db.commit()
            logger.info("Successfully completed analysis %s. Found %d anomalies.", analysis_id, len(anomaly_objects))

            # 10. Send email notification
            if user and user.email:
                try:
                    email_service = EmailService(
                        api_key=settings.SENDGRID_API_KEY,
                        from_email=settings.FROM_EMAIL
                    )
                    email_service.send_analysis_complete(
                        user_email=user.email,
                        user_name=user.name,
                        analysis_id=analysis_id,
                        anomaly_count=len(anomaly_objects),
                        quality_score=result.overall_data_quality_score
                    )
                except Exception as email_err:
                    logger.warning("Could not send analysis completion email to %s: %s", user.email, email_err)

        except Exception as e:
            logger.error("Analysis %s failed with exception: %s", analysis_id, e, exc_info=True)
            # Rollback any partial additions, then set status to FAILED
            await db.rollback()
            
            # Fetch fresh reference to set status
            fail_result = await db.execute(
                select(Analysis).where(Analysis.id == analysis_id)
            )
            fail_analysis = fail_result.scalar_one()
            fail_analysis.status = AnalysisStatus.FAILED
            fail_analysis.error_message = str(e)
            fail_analysis.completed_at = datetime.now(timezone.utc)
            await db.commit()

@celery_app.task(name='run_analysis')
def run_analysis_task(analysis_id: str) -> None:
    """Synchronous Celery entry point that runs the async analysis pipeline."""
    asyncio.run(_run_analysis_async(analysis_id))

# Alias used by analysis_service.py for inline execution
run_analysis_sync = run_analysis_task

