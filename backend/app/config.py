from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/clinical_detector"

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-a-very-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── AWS / Storage ─────────────────────────────────────────────────────────
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET_NAME: str = "clinical-detector-uploads"
    USE_LOCAL_STORAGE: bool = True

    # ── Redis / Rate Limiting ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    MAX_ANALYSES_PER_HOUR: int = 5

    # ── Email ─────────────────────────────────────────────────────────────────
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "noreply@clinicaldetector.dev"

    # ── Monitoring ────────────────────────────────────────────────────────────
    SENTRY_DSN: Optional[str] = None
    ENVIRONMENT: str = "development"

    # ── App URLs ──────────────────────────────────────────────────────────────
    APP_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000"

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if not v:
            raise ValueError("DATABASE_URL must be set")
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"

    @property
    def access_token_expire_seconds(self) -> int:
        return self.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    @property
    def refresh_token_expire_seconds(self) -> int:
        return self.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600

    @property
    def local_upload_dir(self) -> str:
        return "uploads"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
