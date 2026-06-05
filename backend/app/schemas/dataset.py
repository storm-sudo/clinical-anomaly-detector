from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class DatasetCreate(BaseModel):
    name: str
    trial_name: Optional[str] = None
    trial_phase: Optional[str] = None
    data_type: str = "auto"
    timepoint_column: Optional[str] = None
    subject_id_column: Optional[str] = None


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    trial_name: Optional[str] = None
    trial_phase: Optional[str] = None
    data_type: Optional[str] = None
    timepoint_column: Optional[str] = None
    subject_id_column: Optional[str] = None


class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    original_filename: str
    s3_key: Optional[str] = None
    s3_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    file_hash: Optional[str] = None
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    columns: Optional[list[str]] = None
    column_types: Optional[dict[str, str]] = None
    missing_value_summary: Optional[dict[str, Any]] = None
    preview_data: Optional[list[dict[str, Any]]] = None
    trial_name: Optional[str] = None
    trial_phase: Optional[str] = None
    data_type: Optional[str] = None
    timepoint_column: Optional[str] = None
    subject_id_column: Optional[str] = None
    is_archived: bool
    created_at: datetime


class DatasetPreviewResponse(BaseModel):
    columns: list[str]
    column_types: dict[str, str]
    row_count: int
    preview_rows: list[dict[str, Any]]
    missing_summary: dict[str, Any]


class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str = "text/csv"


class PresignedUrlResponse(BaseModel):
    upload_url: str
    s3_key: str
