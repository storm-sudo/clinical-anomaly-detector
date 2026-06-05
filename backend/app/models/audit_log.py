from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    String,
)
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import UUID, generate_uuid


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(), primary_key=True, default=generate_uuid)
    user_id = Column(UUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    analysis_id = Column(UUID(), ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True, index=True)

    action = Column(String(255), nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(64), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    # Relationships
    analysis = relationship("Analysis", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action}>"
