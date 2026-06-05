from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.analysis import AnalysisConfig, AnalysisResponse, AnalysisStatusResponse
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/analyses", tags=["analyses"])
_analysis_service = AnalysisService()


@router.get("", response_model=list[AnalysisResponse])
async def list_analyses(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[AnalysisResponse]:
    """Return all analyses for the current user."""
    analyses = await _analysis_service.list_analyses(db, str(current_user.id))
    return [AnalysisResponse.model_validate(a) for a in analyses]


@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    config: AnalysisConfig,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    """Create and dispatch a new anomaly detection analysis."""
    analysis = await _analysis_service.create_analysis(
        db, str(current_user.id), config
    )
    return AnalysisResponse.model_validate(analysis)

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return dashboard statistics for the current user."""
    from sqlalchemy import select, func
    from sqlalchemy.orm import joinedload
    from datetime import datetime, timedelta, timezone
    from collections import Counter
    from app.models.dataset import Dataset
    from app.models.anomaly import Anomaly
    from app.models.analysis import Analysis, AnalysisStatus
    
    user_id = str(current_user.id)
    
    # 1. Total datasets (non-archived)
    datasets_count_res = await db.execute(
        select(func.count(Dataset.id)).where(
            Dataset.user_id == user_id,
            Dataset.is_archived == False
        )
    )
    total_datasets = datasets_count_res.scalar_one() or 0

    # 2. Total analyses
    analyses_count_res = await db.execute(
        select(func.count(Analysis.id)).where(
            Analysis.user_id == user_id
        )
    )
    total_analyses = analyses_count_res.scalar_one() or 0

    # 3. Average quality score of completed analyses
    avg_quality_res = await db.execute(
        select(func.avg(Analysis.overall_data_quality_score)).where(
            Analysis.user_id == user_id,
            Analysis.status == AnalysisStatus.COMPLETED
        )
    )
    avg_quality_score = avg_quality_res.scalar_one() or 0.0

    # 4. Total anomalies detected
    anomalies_count_res = await db.execute(
        select(func.count(Anomaly.id))
        .join(Analysis, Anomaly.analysis_id == Analysis.id)
        .where(Analysis.user_id == user_id)
    )
    total_anomalies = anomalies_count_res.scalar_one() or 0

    # 5. Recent critical anomalies
    recent_anom_res = await db.execute(
        select(Anomaly)
        .join(Analysis, Anomaly.analysis_id == Analysis.id)
        .where(Analysis.user_id == user_id)
        .order_by(Anomaly.created_at.desc())
        .limit(10)
    )
    recent_anomalies = list(recent_anom_res.scalars().all())
    recent_anoms_list = [
        {
            "id": str(a.id),
            "column_name": a.column_name,
            "row_index": a.row_index,
            "value": a.value,
            "severity": a.severity,
        }
        for a in recent_anomalies
    ]

    # 6. Recent analyses with dataset names
    recent_anal_res = await db.execute(
        select(Analysis)
        .options(joinedload(Analysis.dataset))
        .where(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc())
        .limit(5)
    )
    recent_analyses = list(recent_anal_res.scalars().all())
    recent_analyses_list = []
    for a in recent_analyses:
        recent_analyses_list.append({
            "id": str(a.id),
            "created_at": a.created_at.isoformat(),
            "total_rows_analyzed": a.total_rows_analyzed or 0,
            "total_anomalies_detected": a.total_anomalies_detected or 0,
            "overall_data_quality_score": a.overall_data_quality_score or 0.0,
            "status": a.status.value if hasattr(a.status, "value") else a.status,
            "processing_time_seconds": a.processing_time_seconds or 0.0,
            "dataset": {
                "name": a.dataset.name if a.dataset else "Dataset"
            }
        })

    # 7. Anomalies by day for the last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    anom_times_res = await db.execute(
        select(Anomaly.created_at)
        .join(Analysis, Anomaly.analysis_id == Analysis.id)
        .where(
            Analysis.user_id == user_id,
            Anomaly.created_at >= thirty_days_ago
        )
    )
    all_times = anom_times_res.scalars().all()
    
    days_counter = Counter(t.date().isoformat() for t in all_times)
    anomalies_by_day = []
    for i in range(30):
        d = (datetime.now(timezone.utc) - timedelta(days=29 - i)).date().isoformat()
        anomalies_by_day.append({
            "date": d,
            "count": days_counter[d]
        })

    return {
        "total_datasets": total_datasets,
        "total_analyses": total_analyses,
        "total_anomalies": total_anomalies,
        "avg_quality_score": round(float(avg_quality_score), 1),
        "recent_analyses": recent_analyses_list,
        "recent_anomalies": recent_anoms_list,
        "anomalies_by_day": anomalies_by_day,
    }


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisResponse:
    """Return full analysis results by ID."""
    analysis = await _analysis_service.get_analysis(
        db, analysis_id, str(current_user.id)
    )
    return AnalysisResponse.model_validate(analysis)


@router.get("/{analysis_id}/status", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisStatusResponse:
    """Lightweight endpoint for polling analysis status."""
    status_dict = await _analysis_service.get_analysis_status(
        db, analysis_id, str(current_user.id)
    )
    return AnalysisStatusResponse(**status_dict)


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete an analysis and all associated anomalies."""
    await _analysis_service.delete_analysis(
        db, analysis_id, str(current_user.id)
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
