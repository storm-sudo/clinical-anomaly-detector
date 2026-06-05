from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class AnalysisConfig(BaseModel):
    dataset_id: uuid.UUID
    columns_to_analyze: list[str] = []
    run_statistical: bool = True
    run_isolation_forest: bool = True
    run_lof: bool = True
    run_missing_analysis: bool = True
    run_duplicate_check: bool = True
    run_clinical_rules: bool = True
    contamination: float = 0.05
    zscore_threshold: float = 3.0
    iqr_factor: float = 1.5
    min_anomaly_score: float = 0.3
    data_type: str = "auto"

    @field_validator("contamination")
    @classmethod
    def contamination_range(cls, v: float) -> float:
        if not 0.0 < v < 0.5:
            raise ValueError("contamination must be between 0 and 0.5")
        return v

    @field_validator("zscore_threshold")
    @classmethod
    def zscore_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("zscore_threshold must be positive")
        return v

    @field_validator("min_anomaly_score")
    @classmethod
    def min_score_range(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("min_anomaly_score must be between 0 and 1")
        return v


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    dataset_id: uuid.UUID
    config: Optional[dict[str, Any]] = None
    status: str
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None
    total_rows_analyzed: Optional[int] = None
    total_anomalies_detected: Optional[int] = None
    anomaly_rate_percent: Optional[float] = None
    overall_data_quality_score: Optional[float] = None
    column_statistics: Optional[dict[str, Any]] = None
    algorithm_results: Optional[dict[str, Any]] = None
    anomaly_summary: Optional[dict[str, Any]] = None
    recommendations: Optional[list[str]] = None
    report_s3_key: Optional[str] = None
    report_s3_url: Optional[str] = None
    created_at: datetime


class AnalysisStatusResponse(BaseModel):
    id: uuid.UUID
    status: str
    error_message: Optional[str] = None
    total_anomalies_detected: Optional[int] = None
    overall_data_quality_score: Optional[float] = None
    processing_time_seconds: Optional[float] = None
