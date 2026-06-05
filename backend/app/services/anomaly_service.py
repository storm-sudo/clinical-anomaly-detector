from __future__ import annotations

import csv
import io
import logging
import math
from collections import defaultdict
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis
from app.models.anomaly import Anomaly
from app.schemas.anomaly import AnomalySummaryResponse, PaginatedAnomalyResponse, AnomalyResponse

logger = logging.getLogger(__name__)


class AnomalyService:
    """Provides anomaly retrieval, filtering, review workflow, and export."""

    async def _verify_analysis_ownership(
        self, db: AsyncSession, analysis_id: str, user_id: str
    ) -> Analysis:
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

    async def get_anomalies(
        self,
        db: AsyncSession,
        analysis_id: str,
        user_id: str,
        page: int = 1,
        page_size: int = 50,
        severity: Optional[str] = None,
        column: Optional[str] = None,
        is_reviewed: Optional[bool] = None,
    ) -> PaginatedAnomalyResponse:
        """Return a paginated, filtered list of anomalies for an analysis."""
        await self._verify_analysis_ownership(db, analysis_id, user_id)

        base_stmt = select(Anomaly).where(Anomaly.analysis_id == analysis_id)
        if severity:
            base_stmt = base_stmt.where(Anomaly.severity == severity.upper())
        if column:
            base_stmt = base_stmt.where(Anomaly.column_name == column)
        if is_reviewed is not None:
            base_stmt = base_stmt.where(Anomaly.is_reviewed == is_reviewed)

        # Count total
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar_one()

        # Paginate
        offset = (page - 1) * page_size
        paginated = base_stmt.order_by(
            Anomaly.anomaly_score.desc(), Anomaly.row_index
        ).offset(offset).limit(page_size)
        result = await db.execute(paginated)
        anomalies = list(result.scalars().all())

        total_pages = math.ceil(total / page_size) if page_size > 0 else 1

        return PaginatedAnomalyResponse(
            items=[AnomalyResponse.model_validate(a) for a in anomalies],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_summary(
        self, db: AsyncSession, analysis_id: str, user_id: str
    ) -> AnomalySummaryResponse:
        """Aggregate anomalies by severity, column, and detection method."""
        await self._verify_analysis_ownership(db, analysis_id, user_id)

        result = await db.execute(
            select(Anomaly).where(Anomaly.analysis_id == analysis_id)
        )
        anomalies = list(result.scalars().all())

        by_severity: dict[str, int] = defaultdict(int)
        by_column: dict[str, int] = defaultdict(int)
        by_method: dict[str, int] = defaultdict(int)

        for a in anomalies:
            by_severity[str(a.severity)] += 1
            by_column[a.column_name] += 1
            by_method[a.detection_method] += 1

        # Sort by_column descending
        by_column_sorted = dict(
            sorted(by_column.items(), key=lambda x: x[1], reverse=True)
        )

        return AnomalySummaryResponse(
            total=len(anomalies),
            by_severity=dict(by_severity),
            by_column=by_column_sorted,
            by_method=dict(by_method),
        )

    async def mark_reviewed(
        self,
        db: AsyncSession,
        anomaly_id: str,
        user_id: str,
        note: str,
    ) -> Anomaly:
        """Mark an anomaly as reviewed with a note."""
        anomaly = await self._get_anomaly_for_user(db, anomaly_id, user_id)
        anomaly.is_reviewed = True
        anomaly.review_note = note
        db.add(anomaly)
        await db.flush()
        await db.refresh(anomaly)
        return anomaly

    async def mark_false_positive(
        self,
        db: AsyncSession,
        anomaly_id: str,
        user_id: str,
        is_fp: bool,
    ) -> Anomaly:
        """Mark or unmark an anomaly as a false positive."""
        anomaly = await self._get_anomaly_for_user(db, anomaly_id, user_id)
        anomaly.is_false_positive = is_fp
        if is_fp:
            anomaly.is_reviewed = True
        db.add(anomaly)
        await db.flush()
        await db.refresh(anomaly)
        return anomaly

    async def export_csv(
        self, db: AsyncSession, analysis_id: str, user_id: str
    ) -> bytes:
        """Generate a CSV export of all anomalies for the given analysis."""
        await self._verify_analysis_ownership(db, analysis_id, user_id)

        result = await db.execute(
            select(Anomaly)
            .where(Anomaly.analysis_id == analysis_id)
            .order_by(Anomaly.anomaly_score.desc())
        )
        anomalies = list(result.scalars().all())

        fields = [
            "id", "row_index", "column_name", "subject_id", "value",
            "expected_range_min", "expected_range_max", "z_score",
            "anomaly_score", "severity", "detection_method", "anomaly_type",
            "clinical_significance", "suggested_action",
            "is_reviewed", "review_note", "is_false_positive", "created_at",
        ]

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        for a in anomalies:
            writer.writerow({f: getattr(a, f, "") for f in fields})

        return output.getvalue().encode("utf-8")

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _get_anomaly_for_user(
        self, db: AsyncSession, anomaly_id: str, user_id: str
    ) -> Anomaly:
        """Fetch an anomaly and verify it belongs to the user via the analysis."""
        result = await db.execute(
            select(Anomaly)
            .join(Analysis, Anomaly.analysis_id == Analysis.id)
            .where(Anomaly.id == anomaly_id, Analysis.user_id == user_id)
        )
        anomaly = result.scalar_one_or_none()
        if anomaly is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Anomaly not found",
            )
        return anomaly
