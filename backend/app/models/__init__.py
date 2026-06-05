"""Import all models so Alembic and init_db() can discover them."""
from app.models.user import User, UserRole  # noqa: F401
from app.models.dataset import Dataset  # noqa: F401
from app.models.analysis import Analysis, AnalysisStatus  # noqa: F401
from app.models.anomaly import Anomaly, AnomalySeverity  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401

__all__ = [
    "User",
    "UserRole",
    "Dataset",
    "Analysis",
    "AnalysisStatus",
    "Anomaly",
    "AnomalySeverity",
    "AuditLog",
]
