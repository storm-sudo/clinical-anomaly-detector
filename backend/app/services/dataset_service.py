from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dataset import Dataset
from app.schemas.dataset import DatasetCreate, DatasetPreviewResponse, DatasetUpdate
from app.services.s3_service import StorageService
from app.utils.csv_parser import (
    compute_file_hash,
    get_column_types,
    get_missing_summary,
    get_preview_data,
    parse_csv_file,
)
from app.utils.validators import validate_csv_content

logger = logging.getLogger(__name__)


class DatasetService:
    """Handles dataset upload, metadata extraction, retrieval, and deletion."""

    async def create_dataset(
        self,
        db: AsyncSession,
        user_id: str,
        file_content: bytes,
        filename: str,
        metadata: DatasetCreate,
        storage: StorageService,
    ) -> Dataset:
        """Validate, upload, and persist a new dataset record."""
        # 1. Validate CSV
        validate_csv_content(file_content)

        # 2. Compute hash and check for duplicates
        file_hash = compute_file_hash(file_content)
        result = await db.execute(
            select(Dataset).where(
                Dataset.user_id == user_id,
                Dataset.file_hash == file_hash,
                Dataset.is_archived == False,  # noqa: E712
            )
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Identical file already uploaded as dataset '{existing.name}'",
            )

        # 3. Parse CSV for metadata
        df = parse_csv_file(file_content)
        col_types = get_column_types(df)
        missing_summary = get_missing_summary(df)
        preview = get_preview_data(df, n=10)
        row_count, col_count = df.shape

        # 4. Upload to storage
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "csv"
        s3_key = f"datasets/{user_id}/{uuid.uuid4()}.{ext}"
        s3_key, s3_url = await storage.upload_file(
            file_content, s3_key, content_type="text/csv"
        )

        # 5. Persist dataset record
        dataset = Dataset(
            user_id=user_id,
            name=metadata.name.strip() or filename,
            original_filename=filename,
            s3_key=s3_key,
            s3_url=s3_url,
            file_size_bytes=len(file_content),
            file_hash=file_hash,
            row_count=row_count,
            column_count=col_count,
            columns=df.columns.tolist(),
            column_types=col_types,
            missing_value_summary=missing_summary,
            preview_data=preview,
            trial_name=metadata.trial_name,
            trial_phase=metadata.trial_phase,
            data_type=metadata.data_type,
            timepoint_column=metadata.timepoint_column,
            subject_id_column=metadata.subject_id_column,
        )
        db.add(dataset)
        await db.flush()
        await db.refresh(dataset)
        logger.info("Created dataset %s for user %s", dataset.id, user_id)
        return dataset

    async def get_user_datasets(
        self,
        db: AsyncSession,
        user_id: str,
        include_archived: bool = False,
    ) -> list[Dataset]:
        """Return all datasets belonging to the user."""
        stmt = select(Dataset).where(Dataset.user_id == user_id)
        if not include_archived:
            stmt = stmt.where(Dataset.is_archived == False)  # noqa: E712
        stmt = stmt.order_by(Dataset.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_dataset(
        self, db: AsyncSession, dataset_id: str, user_id: str
    ) -> Dataset:
        """Return a specific dataset, verifying ownership."""
        result = await db.execute(
            select(Dataset).where(
                Dataset.id == dataset_id,
                Dataset.user_id == user_id,
            )
        )
        dataset = result.scalar_one_or_none()
        if dataset is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found",
            )
        return dataset

    async def update_dataset(
        self,
        db: AsyncSession,
        dataset_id: str,
        user_id: str,
        update: DatasetUpdate,
    ) -> Dataset:
        """Update mutable dataset metadata fields."""
        dataset = await self.get_dataset(db, dataset_id, user_id)
        if update.name is not None:
            dataset.name = update.name.strip()
        if update.trial_name is not None:
            dataset.trial_name = update.trial_name
        if update.trial_phase is not None:
            dataset.trial_phase = update.trial_phase
        if update.data_type is not None:
            dataset.data_type = update.data_type
        if update.timepoint_column is not None:
            dataset.timepoint_column = update.timepoint_column
        if update.subject_id_column is not None:
            dataset.subject_id_column = update.subject_id_column
        db.add(dataset)
        await db.flush()
        await db.refresh(dataset)
        return dataset

    async def delete_dataset(
        self,
        db: AsyncSession,
        dataset_id: str,
        user_id: str,
        storage: StorageService,
    ) -> None:
        """Delete a dataset and its underlying storage object."""
        dataset = await self.get_dataset(db, dataset_id, user_id)
        if dataset.s3_key:
            try:
                await storage.delete_file(dataset.s3_key)
            except Exception as exc:
                logger.warning("Could not delete storage object %s: %s", dataset.s3_key, exc)
        await db.delete(dataset)
        await db.flush()
        logger.info("Deleted dataset %s", dataset_id)

    async def get_preview(
        self,
        db: AsyncSession,
        dataset_id: str,
        user_id: str,
        storage: StorageService,
    ) -> DatasetPreviewResponse:
        """Return preview data for a dataset (re-parse from storage)."""
        dataset = await self.get_dataset(db, dataset_id, user_id)

        if dataset.preview_data and dataset.column_types and dataset.columns:
            # Use cached preview stored in DB
            return DatasetPreviewResponse(
                columns=dataset.columns,
                column_types=dataset.column_types,
                row_count=dataset.row_count or 0,
                preview_rows=dataset.preview_data,
                missing_summary=dataset.missing_value_summary or {},
            )

        # Fall back to re-parsing from storage
        content = await storage.download_file(dataset.s3_key)
        df = parse_csv_file(content)
        col_types = get_column_types(df)
        missing_summary = get_missing_summary(df)
        preview_rows = get_preview_data(df, n=10)

        return DatasetPreviewResponse(
            columns=df.columns.tolist(),
            column_types=col_types,
            row_count=len(df),
            preview_rows=preview_rows,
            missing_summary=missing_summary,
        )
