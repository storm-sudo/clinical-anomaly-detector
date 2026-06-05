from __future__ import annotations

import asyncio
import os
import shutil
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.database import AsyncSessionLocal, init_db, engine
from app.config import get_settings
from app.models.user import User, UserRole
from app.models.dataset import Dataset
from app.models.analysis import Analysis, AnalysisStatus
from app.models.anomaly import Anomaly
from app.utils.security import get_password_hash
from app.utils.csv_parser import (
    compute_file_hash,
    get_column_types,
    get_missing_summary,
    get_preview_data,
    parse_csv_file,
)
from app.ml.pipeline import AnomalyDetectionPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

settings = get_settings()

DEMO_USER_EMAIL = "demo@clinicaldetector.dev"
DEMO_USER_PASSWORD = "Demo1234!"  # Complies with length check >= 8

SAMPLE_DATASETS = [
    {
        "filename": "sample_lab_values.csv",
        "name": "Phase II Lab Safety Panel",
        "trial_name": "Safety Evaluation of Compound ABX-402",
        "trial_phase": "Phase IIa",
        "data_type": "auto",
        "timepoint_column": "visit",
        "subject_id_column": "subject_id",
    },
    {
        "filename": "sample_vitals.csv",
        "name": "Vital Signs Monitoring",
        "trial_name": "Efficacy Study of Cardiox-12",
        "trial_phase": "Phase III",
        "data_type": "auto",
        "timepoint_column": "timepoint",
        "subject_id_column": "subject_id",
    },
    {
        "filename": "sample_adverse_events.csv",
        "name": "Adverse Events Log",
        "trial_name": "Oncology Safety and Tolerability Study",
        "trial_phase": "Phase I",
        "data_type": "auto",
        "timepoint_column": "day",
        "subject_id_column": "subject_id",
    }
]

async def seed_data() -> None:
    logger.info("Initializing database for seeding...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # 1. Create or fetch demo user
        result = await db.execute(
            select(User).where(User.email == DEMO_USER_EMAIL)
        )
        demo_user = result.scalar_one_or_none()

        if not demo_user:
            logger.info("Creating demo user: %s", DEMO_USER_EMAIL)
            hashed_pw = get_password_hash(DEMO_USER_PASSWORD)
            demo_user = User(
                name="Dr. Sarah Jenkins",
                email=DEMO_USER_EMAIL,
                hashed_password=hashed_pw,
                role=UserRole.ADMIN,
                organization="BioClinica Therapeutics",
            )
            db.add(demo_user)
            await db.flush()
            logger.info("Demo user created with ID: %s", demo_user.id)
        else:
            logger.info("Demo user already exists.")

        user_id = str(demo_user.id)

        # Ensure upload folder exists
        upload_dir = Path(settings.local_upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Path to project root sample data
        root_sample_dir = Path(__file__).parent / "sample_data"
        if not root_sample_dir.exists():
            root_sample_dir = Path(__file__).parent.parent / "sample_data"

        logger.info("Seeding datasets...")
        for ds_info in SAMPLE_DATASETS:
            src_file = root_sample_dir / ds_info["filename"]
            if not src_file.exists():
                logger.warning("Sample file %s not found at %s. Skipping.", ds_info["filename"], src_file.absolute())
                continue

            # Read file bytes
            file_bytes = src_file.read_bytes()
            file_hash = compute_file_hash(file_bytes)

            # Check if dataset already exists
            existing_ds_res = await db.execute(
                select(Dataset).where(
                    Dataset.user_id == user_id,
                    Dataset.file_hash == file_hash,
                    Dataset.is_archived == False
                )
            )
            existing_ds = existing_ds_res.scalar_one_or_none()

            if existing_ds:
                logger.info("Dataset '%s' already seeded. Skipping upload.", ds_info["name"])
                dataset = existing_ds
            else:
                # Copy file to uploads folder
                storage_filename = f"{demo_user.id}_{ds_info['filename']}"
                dest_file = upload_dir / storage_filename
                shutil.copy2(src_file, dest_file)
                logger.info("Copied %s to %s", ds_info["filename"], dest_file)

                # Parse metadata
                df = parse_csv_file(file_bytes)
                col_types = get_column_types(df)
                missing_summary = get_missing_summary(df)
                preview = get_preview_data(df, n=10)

                dataset = Dataset(
                    user_id=user_id,
                    name=ds_info["name"],
                    original_filename=ds_info["filename"],
                    s3_key=storage_filename,
                    s3_url=f"/uploads/{storage_filename}" if settings.USE_LOCAL_STORAGE else None,
                    file_size_bytes=src_file.stat().st_size,
                    file_hash=file_hash,
                    row_count=len(df),
                    column_count=len(df.columns),
                    columns=list(df.columns),
                    column_types=col_types,
                    missing_value_summary=missing_summary,
                    preview_data=preview,
                    trial_name=ds_info["trial_name"],
                    trial_phase=ds_info["trial_phase"],
                    data_type=ds_info["data_type"],
                    timepoint_column=ds_info["timepoint_column"],
                    subject_id_column=ds_info["subject_id_column"],
                )
                db.add(dataset)
                await db.flush()
                logger.info("Persisted Dataset record for '%s'", ds_info["name"])

            # 2. Run analysis on seeded datasets
            # Check if analysis exists for this dataset
            existing_anal_res = await db.execute(
                select(Analysis).where(
                    Analysis.dataset_id == str(dataset.id),
                    Analysis.status == AnalysisStatus.COMPLETED
                )
            )
            existing_anal = existing_anal_res.scalar_one_or_none()

            if existing_anal:
                logger.info("Completed analysis already exists for dataset '%s'.", dataset.name)
            else:
                logger.info("Running anomaly detection analysis for dataset '%s'...", dataset.name)
                
                # Configuration for analysis
                config = {
                    "dataset_id": str(dataset.id),
                    "columns_to_analyze": [],
                    "run_statistical": True,
                    "run_isolation_forest": True,
                    "run_lof": True,
                    "run_missing_analysis": True,
                    "run_duplicate_check": True,
                    "run_clinical_rules": True,
                    "run_autoencoder": True,
                    "contamination": 0.05,
                    "zscore_threshold": 3.0,
                    "iqr_factor": 1.5,
                    "min_anomaly_score": 0.3,
                    "data_type": "auto"
                }

                # Create analysis record
                analysis = Analysis(
                    user_id=user_id,
                    dataset_id=str(dataset.id),
                    config=config,
                    status=AnalysisStatus.PROCESSING,
                    started_at=datetime.now(timezone.utc),
                )
                db.add(analysis)
                await db.flush()

                # Execute pipeline
                df = parse_csv_file(file_bytes)
                pipeline = AnomalyDetectionPipeline(config)
                pipeline_result = pipeline.run(df)

                # Save anomalies
                anomaly_count = 0
                for anom in pipeline_result.anomalies:
                    db_anom = Anomaly(
                        analysis_id=str(analysis.id),
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
                    anomaly_count += 1

                # Update analysis record
                analysis.status = AnalysisStatus.COMPLETED
                analysis.completed_at = datetime.now(timezone.utc)
                delta = analysis.completed_at - analysis.started_at
                analysis.processing_time_seconds = delta.total_seconds()
                
                analysis.total_rows_analyzed = pipeline_result.total_rows_analyzed
                analysis.total_anomalies_detected = pipeline_result.total_anomalies_detected
                analysis.anomaly_rate_percent = pipeline_result.anomaly_rate_percent
                analysis.overall_data_quality_score = pipeline_result.overall_data_quality_score
                
                analysis.column_statistics = pipeline_result.column_statistics
                analysis.algorithm_results = pipeline_result.algorithm_results
                analysis.anomaly_summary = pipeline_result.anomaly_summary
                analysis.recommendations = pipeline_result.recommendations

                logger.info("Completed analysis for dataset '%s' with %d anomalies.", dataset.name, anomaly_count)

        await db.commit()
        logger.info("Database seeding successfully completed!")

if __name__ == "__main__":
    asyncio.run(seed_data())
