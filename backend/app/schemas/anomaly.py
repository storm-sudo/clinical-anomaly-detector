from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class AnomalyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    analysis_id: uuid.UUID
    row_index: int
    column_name: str
    subject_id: Optional[str] = None
    value: Optional[str] = None
    expected_range_min: Optional[float] = None
    expected_range_max: Optional[float] = None
    z_score: Optional[float] = None
    anomaly_score: float
    severity: str
    detection_method: str
    anomaly_type: str
    clinical_significance: Optional[str] = None
    suggested_action: Optional[str] = None
    is_reviewed: bool
    review_note: Optional[str] = None
    is_false_positive: Optional[bool] = None
    created_at: datetime


class AnomalyReviewUpdate(BaseModel):
    review_note: str


class AnomalyFalsePositiveUpdate(BaseModel):
    is_false_positive: bool


class AnomalySummaryResponse(BaseModel):
    total: int
    by_severity: dict[str, int]
    by_column: dict[str, int]
    by_method: dict[str, int]


class PaginatedAnomalyResponse(BaseModel):
    items: list[AnomalyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
