"""Authentication router for passcode and API key management."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.config import settings
from app.session import Session, session_store

logger = logging.getLogger(__name__)

router = APIRouter()


class LoginRequest(BaseModel):
    """Login request with passcode."""

    passcode: str = Field(..., min_length=1, description="Application passcode")


class SetKeyRequest(BaseModel):
    """Set user API key request."""

    api_key: str = Field(..., min_length=1, description="User's OpenAI API key")


class AuthResponse(BaseModel):
    """Authentication response."""

    success: bool
    message: str
    session_id: str | None = None


def get_session_cookie(
    session_id: Annotated[str | None, Cookie()] = None,
    x_session_id: Annotated[str | None, Header()] = None,
) -> str | None:
    """Dependency to extract session ID from cookie or header.

    Fallback to X-Session-ID header for cross-domain requests
    where cookies may be blocked by browser.
    """
    return session_id or x_session_id


def get_session(
    session_id: Annotated[str | None, Depends(get_session_cookie)]
) -> Session:
    """Dependency to get current session, raising 401 if invalid."""
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No session cookie found",
        )

    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    return session


def require_authenticated_session(
    session: Annotated[Session, Depends(get_session)]
) -> Session:
    """Dependency to require fully authenticated session (passcode + API key)."""
    if not session.is_authenticated():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not fully authenticated. Please provide API key.",
        )
    return session


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, response: Response):
    """Verify passcode and create session.

    Sets HttpOnly session cookie on success.
    """
    if request.passcode != settings.app_passcode:
        logger.warning("Failed login attempt with incorrect passcode")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid passcode",
        )

    # Create new session
    session = session_store.create_session()
    session.passcode_verified = True

    # Set session cookie
    # Use samesite="none" for cross-domain cookies (API and Web on different Railway domains)
    response.set_cookie(
        key="session_id",
        value=session.session_id,
        httponly=True,
        secure=True,  # HTTPS required when samesite="none"
        samesite="none",  # Allow cross-domain cookies
        max_age=settings.session_ttl,
    )

    logger.info("User logged in successfully, session: %s", session.session_id)

    return AuthResponse(
        success=True,
        message="Login successful",
        session_id=session.session_id,
    )


@router.post("/set-key", response_model=AuthResponse)
async def set_key(
    request: SetKeyRequest,
    session: Annotated[Session, Depends(get_session)],
):
    """Set user's OpenAI API key for the session.

    Requires valid session from /login first.
    """
    if not session.passcode_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please login with passcode first",
        )

    # Store API key in session (memory only, never persisted)
    session.user_api_key = request.api_key
    logger.info("API key set for session: %s", session.session_id)

    return AuthResponse(
        success=True,
        message="API key set successfully",
        session_id=session.session_id,
    )


@router.post("/logout")
async def logout(
    response: Response,
    session_id: Annotated[str | None, Depends(get_session_cookie)] = None,
):
    """Logout user and destroy session."""
    if session_id:
        session_store.delete_session(session_id)
        logger.info("User logged out, session: %s", session_id)

    # Clear session cookie
    response.delete_cookie(key="session_id")

    return {"success": True, "message": "Logged out successfully"}


@router.get("/session-status")
async def session_status(
    session: Annotated[Session, Depends(get_session)],
):
    """Get current session authentication status."""
    return {
        "passcode_verified": session.passcode_verified,
        "api_key_set": session.user_api_key is not None,
        "fully_authenticated": session.is_authenticated(),
        "session_id": session.session_id,
    }
