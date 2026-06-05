from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db
from app.routers import auth, datasets, analyses, anomalies, reports, admin

logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle."""
    # ── Startup ───────────────────────────────────────────────────────────────
    logger.info("Starting Clinical Data Anomaly Detector API (%s)", settings.ENVIRONMENT)

    # Create DB tables (no-op if already exist)
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as exc:
        logger.warning("Database init skipped (may not be connected): %s", exc)

    # Setup Redis client
    redis_client: aioredis.Redis | None = None
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        app.state.redis = redis_client
        logger.info("Redis connected at %s", settings.REDIS_URL)
    except Exception as exc:
        logger.warning("Redis unavailable (rate limiting disabled): %s", exc)
        app.state.redis = None

    # Ensure local upload directory exists
    if settings.USE_LOCAL_STORAGE:
        Path(settings.local_upload_dir).mkdir(parents=True, exist_ok=True)

    # Sentry integration
    if settings.SENTRY_DSN:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                integrations=[FastApiIntegration(), SqlalchemyIntegration()],
                environment=settings.ENVIRONMENT,
                traces_sample_rate=0.2,
            )
            logger.info("Sentry SDK initialized")
        except Exception as exc:
            logger.warning("Sentry init failed: %s", exc)

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    if redis_client is not None:
        await redis_client.aclose()
        logger.info("Redis connection closed")
    logger.info("Shutdown complete")


# ── Application ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Clinical Data Anomaly Detector",
    description=(
        "ML-powered anomaly detection for clinical trial data. "
        "Upload CSV datasets, run multi-algorithm detection pipelines, "
        "and get actionable insights with clinical context."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(analyses.router)
app.include_router(anomalies.router)
app.include_router(reports.router)
app.include_router(admin.router)

# ── Static file serving for local uploads ─────────────────────────────────────
uploads_dir = Path(settings.local_upload_dir)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check(request: Request) -> dict:
    """Liveness probe — returns service health status."""
    redis_ok = False
    if hasattr(request.app.state, "redis") and request.app.state.redis:
        try:
            await request.app.state.redis.ping()
            redis_ok = True
        except Exception:
            pass

    return {
        "status": "ok",
        "service": "clinical-anomaly-detector",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "redis": "connected" if redis_ok else "unavailable",
    }


# ── Global exception handlers ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s: %s", request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
