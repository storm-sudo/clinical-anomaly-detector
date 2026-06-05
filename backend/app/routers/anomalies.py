from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io

from app.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.anomaly import (
    AnomalyFalsePositiveUpdate,
    AnomalyResponse,
    AnomalyReviewUpdate,
    AnomalySummaryResponse,
    PaginatedAnomalyResponse,
)
from app.services.anomaly_service import AnomalyService

router = APIRouter(tags=["anomalies"])
_anomaly_service = AnomalyService()


@router.get(
    "/api/analyses/{analysis_id}/anomalies",
    response_model=PaginatedAnomalyResponse,
)
async def list_anomalies(
    analysis_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    severity: Optional[str] = Query(None, description="LOW|MEDIUM|HIGH|CRITICAL"),
    column: Optional[str] = Query(None),
    is_reviewed: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedAnomalyResponse:
    """Return paginated, optionally filtered anomalies for an analysis."""
    return await _anomaly_service.get_anomalies(
        db=db,
        analysis_id=analysis_id,
        user_id=str(current_user.id),
        page=page,
        page_size=page_size,
        severity=severity,
        column=column,
        is_reviewed=is_reviewed,
    )


@router.get(
    "/api/analyses/{analysis_id}/anomalies/summary",
    response_model=AnomalySummaryResponse,
)
async def get_anomaly_summary(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AnomalySummaryResponse:
    """Return aggregate anomaly counts by severity, column, and detection method."""
    return await _anomaly_service.get_summary(
        db, analysis_id, str(current_user.id)
    )


@router.patch(
    "/api/anomalies/{anomaly_id}/review",
    response_model=AnomalyResponse,
)
async def mark_reviewed(
    anomaly_id: str,
    body: AnomalyReviewUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AnomalyResponse:
    """Mark an anomaly as reviewed and attach a review note."""
    anomaly = await _anomaly_service.mark_reviewed(
        db, anomaly_id, str(current_user.id), body.review_note
    )
    return AnomalyResponse.model_validate(anomaly)


@router.patch(
    "/api/anomalies/{anomaly_id}/false-positive",
    response_model=AnomalyResponse,
)
async def mark_false_positive(
    anomaly_id: str,
    body: AnomalyFalsePositiveUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AnomalyResponse:
    """Mark or unmark an anomaly as a false positive."""
    anomaly = await _anomaly_service.mark_false_positive(
        db, anomaly_id, str(current_user.id), body.is_false_positive
    )
    return AnomalyResponse.model_validate(anomaly)


@router.get(
    "/api/analyses/{analysis_id}/anomalies/export",
    response_class=StreamingResponse,
)
async def export_anomalies_csv(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Download all anomalies for an analysis as a CSV file."""
    csv_bytes = await _anomaly_service.export_csv(
        db, analysis_id, str(current_user.id)
    )
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="anomalies_{analysis_id}.csv"'
        },
    )
