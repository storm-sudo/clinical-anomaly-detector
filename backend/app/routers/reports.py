from __future__ import annotations

import io
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_active_user, get_db
from app.models.analysis import Analysis, AnalysisStatus
from app.models.anomaly import Anomaly
from app.models.dataset import Dataset
from app.models.user import User
from app.services.report_service import ReportService
from app.services.s3_service import StorageService
from app.config import get_settings
from app.schemas.analysis import AnalysisResponse

router = APIRouter(prefix="/api/analyses", tags=["reports"])
_report_service = ReportService()
_settings = get_settings()
logger = logging.getLogger(__name__)


async def _get_analysis_for_user(
    db: AsyncSession, analysis_id: str, user_id: str
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


@router.get("/{analysis_id}/report", response_model=AnalysisResponse)
async def get_report_metadata(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    """Return analysis metadata including report URL if generated."""
    analysis = await _get_analysis_for_user(db, analysis_id, str(current_user.id))
    return AnalysisResponse.model_validate(analysis)


@router.post("/{analysis_id}/report/generate", response_model=dict)
async def generate_report(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate and store a PDF report for a completed analysis."""
    analysis = await _get_analysis_for_user(db, analysis_id, str(current_user.id))

    if analysis.status != AnalysisStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only generate report for completed analyses",
        )

    # Load anomalies
    anomaly_result = await db.execute(
        select(Anomaly).where(Anomaly.analysis_id == analysis_id)
    )
    anomalies = list(anomaly_result.scalars().all())

    # Load dataset
    dataset_result = await db.execute(
        select(Dataset).where(Dataset.id == analysis.dataset_id)
    )
    dataset = dataset_result.scalar_one_or_none()

    # Generate PDF
    try:
        pdf_bytes = _report_service.generate_pdf_report(analysis, anomalies, dataset)
    except Exception as exc:
        logger.error("PDF generation failed for analysis %s: %s", analysis_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {exc}",
        )

    # Upload to storage
    storage = StorageService(_settings)
    report_key = f"reports/{str(current_user.id)}/{analysis_id}.pdf"
    try:
        s3_key, s3_url = await storage.upload_file(
            pdf_bytes, report_key, content_type="application/pdf"
        )
        analysis.report_s3_key = s3_key
        analysis.report_s3_url = s3_url
        db.add(analysis)
        await db.flush()
    except Exception as exc:
        logger.error("Failed to store report for analysis %s: %s", analysis_id, exc)

    return {
        "message": "Report generated successfully",
        "report_url": analysis.report_s3_url,
        "report_s3_key": analysis.report_s3_key,
    }


@router.get("/{analysis_id}/report/download")
async def download_report(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream the generated PDF report for download."""
    analysis = await _get_analysis_for_user(db, analysis_id, str(current_user.id))

    if not analysis.report_s3_key:
        # Generate on-the-fly
        anomaly_result = await db.execute(
            select(Anomaly).where(Anomaly.analysis_id == analysis_id)
        )
        anomalies = list(anomaly_result.scalars().all())
        dataset_result = await db.execute(
            select(Dataset).where(Dataset.id == analysis.dataset_id)
        )
        dataset = dataset_result.scalar_one_or_none()
        try:
            pdf_bytes = _report_service.generate_pdf_report(analysis, anomalies, dataset)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Report generation failed: {exc}",
            )
    else:
        storage = StorageService(_settings)
        pdf_bytes = await storage.download_file(analysis.report_s3_key)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="report_{analysis_id}.pdf"'
        },
    )
