"""Thread management router for conversation history."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.routers.auth import require_authenticated_session
from app.session import Session, session_store

logger = logging.getLogger(__name__)

router = APIRouter()


class ThreadResponse(BaseModel):
    """Response for thread creation."""

    thread_id: str
    session_id: str
    message: str


@router.post("/new", response_model=ThreadResponse)
async def create_thread(
    session: Annotated[Session, Depends(require_authenticated_session)],
):
    """Create a new conversation thread.

    Requires authenticated session (passcode + API key).
    Returns thread_id for subsequent chat messages.
    """
    if not session.is_authenticated():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not fully authenticated",
        )

    # Create new thread
    thread = session_store.create_thread(session.session_id)

    logger.info(
        "Created thread %s for session %s",
        thread.thread_id,
        session.session_id,
    )

    return ThreadResponse(
        thread_id=thread.thread_id,
        session_id=session.session_id,
        message="Thread created successfully",
    )


@router.get("/{thread_id}")
async def get_thread(
    thread_id: str,
    session: Annotated[Session, Depends(require_authenticated_session)],
):
    """Get thread information and message history."""
    thread = session_store.get_thread(thread_id)

    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found or expired",
        )

    # Verify thread belongs to session
    if thread.session_id != session.session_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Thread does not belong to this session",
        )

    return {
        "thread_id": thread.thread_id,
        "session_id": thread.session_id,
        "message_count": len(thread.messages),
        "messages": thread.messages,
        "created_at": thread.created_at,
        "last_accessed": thread.last_accessed,
    }
