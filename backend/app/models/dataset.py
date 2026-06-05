from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUID, generate_uuid


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    original_filename = Column(String(500), nullable=False)

    # Storage
    s3_key = Column(String(1000), nullable=True)
    s3_url = Column(Text, nullable=True)

    # File metadata
    file_size_bytes = Column(BigInteger, nullable=True)
    file_hash = Column(String(64), nullable=True, index=True)

    # Data shape
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    columns = Column(JSON, nullable=True)          # list of column names
    column_types = Column(JSON, nullable=True)     # {col: type}

    # Summary metadata
    missing_value_summary = Column(JSON, nullable=True)   # {col: missing_count}
    preview_data = Column(JSON, nullable=True)            # first 10 rows as list[dict]

    # Clinical metadata
    trial_name = Column(String(255), nullable=True)
    trial_phase = Column(String(50), nullable=True)
    data_type = Column(String(50), nullable=True, default="auto")
    timepoint_column = Column(String(255), nullable=True)
    subject_id_column = Column(String(255), nullable=True)

    is_archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    # Relationships
    user = relationship("User", back_populates="datasets")
    analyses = relationship("Analysis", back_populates="dataset", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Dataset id={self.id} name={self.name}>"
