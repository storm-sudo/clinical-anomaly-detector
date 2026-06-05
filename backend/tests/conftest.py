from __future__ import annotations

import asyncio
from typing import AsyncGenerator, Generator
import pytest
import pandas as pd
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.dependencies import get_db
from app.main import app
from app.config import get_settings
from app.utils.security import get_password_hash, create_access_token

# Use SQLite in-memory for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an instance of the default event loop for each test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def init_test_db():
    """Initialise tables before testing."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Fixture that yields a database session and rolls back transactions after each test."""
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

@pytest.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Fixture that returns a test client with overridden database dependency."""
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
async def test_user(db: AsyncSession) -> dict[str, Any]:
    """Helper fixture that inserts a test user into the database."""
    from app.models.user import User, UserRole
    
    # Check if exists
    from sqlalchemy import select
    res = await db.execute(select(User).where(User.email == "test@clinicaldetector.dev"))
    existing = res.scalar_one_or_none()
    if existing:
        return {
            "id": str(existing.id),
            "email": existing.email,
            "name": existing.name
        }

    hashed_pw = get_password_hash("TestPassword123!")
    user = User(
        name="Test Analyst",
        email="test@clinicaldetector.dev",
        hashed_password=hashed_pw,
        role=UserRole.USER,
        organization="Test Org",
    )
    db.add(user)
    await db.flush()
    await db.commit()
    
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name
    }

@pytest.fixture
async def auth_headers(test_user: dict[str, Any]) -> dict[str, str]:
    """Helper fixture returning a JWT header for the test user."""
    token = create_access_token({"sub": test_user["id"]})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def sample_df() -> pd.DataFrame:
    """Fixture yielding a clean sample lab vitals dataframe with 1 outlier."""
    data = {
        "subject_id": ["SUBJ-01", "SUBJ-01", "SUBJ-02", "SUBJ-02", "SUBJ-03"],
        "visit": [1, 2, 1, 2, 1],
        "heart_rate": [72.0, 75.0, 71.0, 68.0, 240.0],  # 240 is outlier
        "systolic_bp": [120.0, 118.0, 122.0, 121.0, 119.0],
        "diastolic_bp": [80.0, 78.0, 82.0, 79.0, 81.0]
    }
    return pd.DataFrame(data)
