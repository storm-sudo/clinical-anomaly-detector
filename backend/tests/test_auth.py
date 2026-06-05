from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

pytestmark = pytest.mark.asyncio

async def test_register_user_success(client: AsyncClient, db: AsyncSession):
    # Ensure user does not exist
    result = await db.execute(select(User).where(User.email == "newuser@clinicaldetector.dev"))
    assert result.scalar_one_or_none() is None

    payload = {
        "name": "John Doe",
        "email": "newuser@clinicaldetector.dev",
        "password": "SecurePassword123!",
        "organization": "BioPharma Inc"
    }

    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert data["email"] == "newuser@clinicaldetector.dev"
    assert data["name"] == "John Doe"
    assert "id" in data
    assert "password" not in data

async def test_register_user_duplicate_email(client: AsyncClient, test_user: dict):
    payload = {
        "name": "Duplicate User",
        "email": test_user["email"],  # already registered by fixture
        "password": "Password123!",
        "organization": "Other Corp"
    }

    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]

async def test_register_user_invalid_password(client: AsyncClient):
    payload = {
        "name": "Weak Pass User",
        "email": "weakpass@clinicaldetector.dev",
        "password": "123",  # Less than 8 chars
        "organization": "Other Corp"
    }

    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 422

async def test_login_success(client: AsyncClient, test_user: dict):
    payload = {
        "email": test_user["email"],
        "password": "TestPassword123!"  # Password set in fixture
    }

    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == test_user["email"]

async def test_login_invalid_credentials(client: AsyncClient, test_user: dict):
    payload = {
        "email": test_user["email"],
        "password": "WrongPassword!"
    }

    response = await client.post("/api/auth/login", json=payload)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

async def test_get_me_authenticated(client: AsyncClient, auth_headers: dict, test_user: dict):
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["email"] == test_user["email"]
    assert data["id"] == test_user["id"]

async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401
