from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.dataset import (
    DatasetCreate,
    DatasetPreviewResponse,
    DatasetResponse,
    DatasetUpdate,
    PresignedUrlRequest,
    PresignedUrlResponse,
)
from app.services.dataset_service import DatasetService
from app.services.s3_service import StorageService
from app.config import get_settings

router = APIRouter(prefix="/api/datasets", tags=["datasets"])
_dataset_service = DatasetService()
_settings = get_settings()


def _get_storage() -> StorageService:
    return StorageService(_settings)


@router.get("", response_model=list[DatasetResponse])
async def list_datasets(
    include_archived: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> list[DatasetResponse]:
    """Return all datasets belonging to the current user."""
    datasets = await _dataset_service.get_user_datasets(
        db, str(current_user.id), include_archived=include_archived
    )
    return [DatasetResponse.model_validate(d) for d in datasets]


@router.post("", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    file: UploadFile = File(..., description="CSV file to upload"),
    name: str = Form(...),
    trial_name: Optional[str] = Form(None),
    trial_phase: Optional[str] = Form(None),
    data_type: str = Form("auto"),
    timepoint_column: Optional[str] = Form(None),
    subject_id_column: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetResponse:
    """Upload a CSV file and create a new dataset record."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided",
        )

    content = await file.read()

    metadata = DatasetCreate(
        name=name,
        trial_name=trial_name,
        trial_phase=trial_phase,
        data_type=data_type,
        timepoint_column=timepoint_column,
        subject_id_column=subject_id_column,
    )

    storage = _get_storage()
    dataset = await _dataset_service.create_dataset(
        db=db,
        user_id=str(current_user.id),
        file_content=content,
        filename=file.filename,
        metadata=metadata,
        storage=storage,
    )
    return DatasetResponse.model_validate(dataset)


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetResponse:
    """Return a single dataset by ID."""
    dataset = await _dataset_service.get_dataset(db, dataset_id, str(current_user.id))
    return DatasetResponse.model_validate(dataset)


@router.put("/{dataset_id}", response_model=DatasetResponse)
async def update_dataset(
    dataset_id: str,
    update: DatasetUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetResponse:
    """Update dataset metadata (name, trial info, column hints)."""
    dataset = await _dataset_service.update_dataset(
        db, dataset_id, str(current_user.id), update
    )
    return DatasetResponse.model_validate(dataset)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete a dataset and its underlying file from storage."""
    storage = _get_storage()
    await _dataset_service.delete_dataset(
        db, dataset_id, str(current_user.id), storage
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
async def preview_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> DatasetPreviewResponse:
    """Return column types, missing summary, and first 10 rows."""
    storage = _get_storage()
    return await _dataset_service.get_preview(
        db, dataset_id, str(current_user.id), storage
    )


@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_url(
    request: PresignedUrlRequest,
    current_user: User = Depends(get_current_active_user),
) -> PresignedUrlResponse:
    """Generate a presigned upload URL (S3) or internal path (local mode)."""
    import uuid
    key = f"datasets/{current_user.id}/{uuid.uuid4()}_{request.filename}"
    storage = _get_storage()
    url = await storage.get_presigned_upload_url(key)
    return PresignedUrlResponse(upload_url=url, s3_key=key)
