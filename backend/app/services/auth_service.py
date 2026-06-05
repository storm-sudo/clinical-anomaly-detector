from __future__ import annotations

import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, TokenResponse, UserResponse, UserUpdate
from app.utils.security import get_password_hash, verify_password, create_access_token, create_refresh_token

logger = logging.getLogger(__name__)


class AuthService:
    """Handles user registration, login, and token management."""

    async def register(self, db: AsyncSession, user_create: UserCreate) -> User:
        """Create a new user. Raises 409 if email already exists."""
        result = await db.execute(
            select(User).where(User.email == user_create.email.lower())
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        hashed = get_password_hash(user_create.password)
        user = User(
            name=user_create.name.strip(),
            email=user_create.email.lower(),
            hashed_password=hashed,
            organization=user_create.organization,
            role=UserRole.USER,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        logger.info("Registered new user: %s", user.email)
        return user

    async def login(
        self, db: AsyncSession, email: str, password: str
    ) -> TokenResponse:
        """Validate credentials and return access + refresh tokens."""
        result = await db.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()

        if user is None or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        sub = str(user.id)
        access_token = create_access_token({"sub": sub})
        refresh_token = create_refresh_token({"sub": sub})

        user_response = UserResponse.model_validate(user)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=user_response,
        )

    async def get_current_user_by_token(
        self, db: AsyncSession, token: str
    ) -> User:
        """Decode JWT and return the User record."""
        from app.utils.security import decode_token

        payload = decode_token(token)
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        return user

    async def update_user(
        self, db: AsyncSession, user: User, update: UserUpdate
    ) -> User:
        """Update mutable user fields."""
        if update.name is not None:
            user.name = update.name.strip()
        if update.organization is not None:
            user.organization = update.organization
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user
