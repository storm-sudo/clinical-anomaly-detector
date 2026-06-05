from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUID, generate_uuid


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AnalysisStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(UUID(), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(UUID(), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)

    # Configuration used for this run
    config = Column(JSON, nullable=True)

    # Status
    status = Column(
        Enum(AnalysisStatus),
        nullable=False,
        default=AnalysisStatus.PENDING,
        index=True,
    )
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_time_seconds = Column(Float, nullable=True)

    # Results — aggregate metrics
    total_rows_analyzed = Column(Integer, nullable=True)
    total_anomalies_detected = Column(Integer, nullable=True)
    anomaly_rate_percent = Column(Float, nullable=True)
    overall_data_quality_score = Column(Float, nullable=True)

    # Results — detailed JSON blobs
    column_statistics = Column(JSON, nullable=True)
    algorithm_results = Column(JSON, nullable=True)
    anomaly_summary = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)

    # Report
    report_s3_key = Column(String(1000), nullable=True)
    report_s3_url = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    # Relationships
    user = relationship("User", back_populates="analyses")
    dataset = relationship("Dataset", back_populates="analyses")
    anomalies = relationship("Anomaly", back_populates="analysis", lazy="selectin", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="analysis", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Analysis id={self.id} status={self.status}>"
