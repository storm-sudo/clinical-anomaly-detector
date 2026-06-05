from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis, AnalysisStatus
from app.models.dataset import Dataset
from app.schemas.analysis import AnalysisConfig

logger = logging.getLogger(__name__)


class AnalysisService:
    """Creates and manages anomaly detection analyses."""

    async def create_analysis(
        self,
        db: AsyncSession,
        user_id: str,
        config: AnalysisConfig,
    ) -> Analysis:
        """Validate dataset ownership, create Analysis record, dispatch to worker."""
        # 1. Verify dataset belongs to user
        dataset_result = await db.execute(
            select(Dataset).where(
                Dataset.id == str(config.dataset_id),
                Dataset.user_id == user_id,
            )
        )
        dataset = dataset_result.scalar_one_or_none()
        if dataset is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found",
            )

        # 2. Create analysis record
        analysis = Analysis(
            user_id=user_id,
            dataset_id=str(config.dataset_id),
            config=config.model_dump(mode="json"),
            status=AnalysisStatus.PENDING,
        )
        db.add(analysis)
        await db.flush()
        await db.refresh(analysis)

        analysis_id = str(analysis.id)
        logger.info("Created analysis %s for user %s", analysis_id, user_id)

        # 3. Dispatch to Celery (or run inline if Celery unavailable)
        await self._dispatch_task(analysis_id)

        return analysis

    async def _dispatch_task(self, analysis_id: str) -> None:
        """Try to dispatch Celery task; fall back to async inline execution."""
        try:
            from app.tasks.analysis_tasks import run_analysis_task
            run_analysis_task.delay(analysis_id)
            logger.info("Dispatched analysis task %s to Celery", analysis_id)
        except Exception as exc:
            logger.warning(
                "Celery unavailable (%s). Running analysis inline (async).", exc
            )
            # Run in background task to avoid blocking the HTTP response
            asyncio.create_task(self._run_inline(analysis_id))

    async def _run_inline(self, analysis_id: str) -> None:
        """Run the pipeline inline without Celery (development mode)."""
        try:
            from app.tasks.analysis_tasks import run_analysis_sync
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, run_analysis_sync, analysis_id)
        except Exception as exc:
            logger.error("Inline analysis %s failed: %s", analysis_id, exc)

    async def get_analysis(
        self, db: AsyncSession, analysis_id: str, user_id: str
    ) -> Analysis:
        """Return analysis by ID, enforcing ownership."""
        result = await db.execute(
            select(Analysis).where(
                Analysis.id == analysis_id,
                Analysis.user_id == user_id,
            )
        )
        analysis = result.scalar_one_or_none()
        if analysis is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found",
            )
        return analysis

    async def list_analyses(
        self, db: AsyncSession, user_id: str
    ) -> list[Analysis]:
        """Return all analyses for a user, newest first."""
        result = await db.execute(
            select(Analysis)
            .where(Analysis.user_id == user_id)
            .order_by(Analysis.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_analysis_status(
        self, db: AsyncSession, analysis_id: str, user_id: str
    ) -> dict:
        """Return a lightweight status dict for polling."""
        analysis = await self.get_analysis(db, analysis_id, user_id)
        return {
            "id": str(analysis.id),
            "status": analysis.status,
            "error_message": analysis.error_message,
            "total_anomalies_detected": analysis.total_anomalies_detected,
            "overall_data_quality_score": analysis.overall_data_quality_score,
            "processing_time_seconds": analysis.processing_time_seconds,
        }

    async def delete_analysis(
        self, db: AsyncSession, analysis_id: str, user_id: str
    ) -> None:
        """Delete an analysis and its anomalies (cascade)."""
        analysis = await self.get_analysis(db, analysis_id, user_id)
        await db.delete(analysis)
        await db.flush()
        logger.info("Deleted analysis %s", analysis_id)
