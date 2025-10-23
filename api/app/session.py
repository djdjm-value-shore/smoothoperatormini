"""In-memory session management for SmoothOperator API.

This module provides session storage with TTL-based cleanup.
Sessions store: passcode verification, user API key, and associated threads.
"""

from __future__ import annotations

import asyncio
import logging
import secrets
import time
from dataclasses import dataclass, field
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class Session:
    """Session data structure."""

    session_id: str
    passcode_verified: bool = False
    user_api_key: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    ttl: int = settings.session_ttl

    def is_expired(self) -> bool:
        """Check if session has expired based on TTL."""
        return time.time() - self.last_accessed > self.ttl

    def refresh(self) -> None:
        """Update last accessed timestamp."""
        self.last_accessed = time.time()

    def is_authenticated(self) -> bool:
        """Check if session is fully authenticated (passcode + API key)."""
        return self.passcode_verified and self.user_api_key is not None


@dataclass
class Thread:
    """Chat thread data structure."""

    thread_id: str
    session_id: str
    messages: list[dict] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    ttl: int = settings.thread_ttl

    def is_expired(self) -> bool:
        """Check if thread has expired based on TTL."""
        return time.time() - self.last_accessed > self.ttl

    def refresh(self) -> None:
        """Update last accessed timestamp."""
        self.last_accessed = time.time()


class SessionStore:
    """In-memory session store with automatic TTL cleanup."""

    def __init__(self):
        """Initialize session store."""
        self.sessions: dict[str, Session] = {}
        self.threads: dict[str, Thread] = {}
        self.notes: dict[str, dict[str, str]] = {}  # session_id -> {title: content}
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start_cleanup(self) -> None:
        """Start background task for cleaning expired sessions/threads."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
            logger.info("Session cleanup task started")

    async def stop_cleanup(self) -> None:
        """Stop background cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
            logger.info("Session cleanup task stopped")

    async def _cleanup_loop(self) -> None:
        """Background loop to clean expired sessions and threads."""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in cleanup loop: %s", e, exc_info=True)

    def _cleanup_expired(self) -> None:
        """Remove expired sessions and threads."""
        # Cleanup sessions
        expired_sessions = [
            sid for sid, session in self.sessions.items() if session.is_expired()
        ]
        for sid in expired_sessions:
            del self.sessions[sid]
            # Also cleanup associated notes
            if sid in self.notes:
                del self.notes[sid]
            logger.debug("Removed expired session: %s", sid)

        # Cleanup threads
        expired_threads = [
            tid for tid, thread in self.threads.items() if thread.is_expired()
        ]
        for tid in expired_threads:
            del self.threads[tid]
            logger.debug("Removed expired thread: %s", tid)

        if expired_sessions or expired_threads:
            logger.info(
                "Cleaned up %d sessions and %d threads",
                len(expired_sessions),
                len(expired_threads),
            )

    def create_session(self) -> Session:
        """Create a new session with unique ID."""
        session_id = secrets.token_urlsafe(32)
        session = Session(session_id=session_id)
        self.sessions[session_id] = session
        self.notes[session_id] = {}  # Initialize notes dict for session
        logger.debug("Created session: %s", session_id)
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID, refreshing TTL if found."""
        session = self.sessions.get(session_id)
        if session and not session.is_expired():
            session.refresh()
            return session
        elif session:
            # Session expired, remove it
            del self.sessions[session_id]
            if session_id in self.notes:
                del self.notes[session_id]
        return None

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and associated data."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            if session_id in self.notes:
                del self.notes[session_id]
            logger.debug("Deleted session: %s", session_id)
            return True
        return False

    def create_thread(self, session_id: str) -> Thread:
        """Create a new thread associated with a session."""
        thread_id = secrets.token_urlsafe(16)
        thread = Thread(thread_id=thread_id, session_id=session_id)
        self.threads[thread_id] = thread
        logger.debug("Created thread: %s for session: %s", thread_id, session_id)
        return thread

    def get_thread(self, thread_id: str) -> Optional[Thread]:
        """Get thread by ID, refreshing TTL if found."""
        thread = self.threads.get(thread_id)
        if thread and not thread.is_expired():
            thread.refresh()
            return thread
        elif thread:
            # Thread expired, remove it
            del self.threads[thread_id]
        return None

    def get_notes(self, session_id: str) -> dict[str, str]:
        """Get notes dict for a session."""
        return self.notes.get(session_id, {})

    def save_note(self, session_id: str, title: str, content: str) -> None:
        """Save a note for a session."""
        if session_id not in self.notes:
            self.notes[session_id] = {}
        self.notes[session_id][title] = content
        logger.debug("Saved note '%s' for session: %s", title, session_id)

    def get_note(self, session_id: str, title: str) -> Optional[str]:
        """Get a specific note by title."""
        return self.notes.get(session_id, {}).get(title)

    def list_note_titles(self, session_id: str) -> list[str]:
        """List all note titles for a session."""
        return list(self.notes.get(session_id, {}).keys())


# Global session store instance
session_store = SessionStore()
