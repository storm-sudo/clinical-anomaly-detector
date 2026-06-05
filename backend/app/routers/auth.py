from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, TokenResponse, UserUpdate, UserLogin
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])
_auth_service = AuthService()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Register a new user account."""
    user = await _auth_service.register(db, user_create)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login_json(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with JSON email/password and return JWT tokens."""
    return await _auth_service.login(db, credentials.email, credentials.password)


@router.post("/login/form", response_model=TokenResponse, include_in_schema=False)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """OAuth2 form-compatible login endpoint (username = email)."""
    return await _auth_service.login(db, form_data.username, form_data.password)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """Return the authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update the authenticated user's name or organization."""
    updated = await _auth_service.update_user(db, current_user, update)
    return UserResponse.model_validate(updated)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Log out — client should discard stored tokens.
    
    JWT tokens are stateless so server-side invalidation is not performed.
    """
    return {"message": "Logged out successfully"}
