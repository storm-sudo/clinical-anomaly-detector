from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUID, generate_uuid


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AnomalySeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(UUID(), primary_key=True, default=generate_uuid)
    analysis_id = Column(UUID(), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)

    row_index = Column(Integer, nullable=False, index=True)
    column_name = Column(String(255), nullable=False, index=True)
    subject_id = Column(String(255), nullable=True, index=True)
    value = Column(String(500), nullable=True)   # stored as string for flexibility

    expected_range_min = Column(Float, nullable=True)
    expected_range_max = Column(Float, nullable=True)
    z_score = Column(Float, nullable=True)
    anomaly_score = Column(Float, nullable=False)

    severity = Column(Enum(AnomalySeverity), nullable=False, index=True)
    detection_method = Column(String(255), nullable=False)
    anomaly_type = Column(String(255), nullable=False)

    clinical_significance = Column(Text, nullable=True)
    suggested_action = Column(String(500), nullable=True)

    is_reviewed = Column(Boolean, nullable=False, default=False)
    review_note = Column(Text, nullable=True)
    is_false_positive = Column(Boolean, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    # Relationships
    analysis = relationship("Analysis", back_populates="anomalies")

    def __repr__(self) -> str:
        return f"<Anomaly id={self.id} col={self.column_name} severity={self.severity}>"
