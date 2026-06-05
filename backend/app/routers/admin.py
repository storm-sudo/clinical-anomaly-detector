from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_admin
from app.models.analysis import Analysis
from app.models.anomaly import Anomaly
from app.models.dataset import Dataset
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
async def list_all_users(
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    """List all registered users (admin only)."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = list(result.scalars().all())
    return [UserResponse.model_validate(u) for u in users]


@router.get("/stats")
async def platform_stats(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return platform-level aggregate statistics (admin only)."""
    user_count = (await db.execute(select(func.count(User.id)))).scalar_one()
    dataset_count = (await db.execute(select(func.count(Dataset.id)))).scalar_one()
    analysis_count = (await db.execute(select(func.count(Analysis.id)))).scalar_one()
    anomaly_count = (await db.execute(select(func.count(Anomaly.id)))).scalar_one()

    active_users = (
        await db.execute(select(func.count(User.id)).where(User.is_active == True))  # noqa: E712
    ).scalar_one()

    return {
        "total_users": user_count,
        "active_users": active_users,
        "total_datasets": dataset_count,
        "total_analyses": analysis_count,
        "total_anomalies_detected": anomaly_count,
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Deactivate (soft-delete) a user account (admin only)."""
    if str(admin_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    user.is_active = False
    db.add(user)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
