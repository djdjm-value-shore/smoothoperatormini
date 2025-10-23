"""ChatKit SSE endpoint for streaming agent responses."""

from __future__ import annotations

import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.agents.orchestrator import create_orchestrator
from app.routers.auth import require_authenticated_session
from app.session import Session

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    """Chat request with user message."""

    message: str = Field(..., min_length=1, description="User message")
    thread_id: str | None = Field(None, description="Optional thread ID for conversation history")


@router.post("/chatkit")
async def chatkit_stream(
    request: ChatRequest,
    session: Annotated[Session, Depends(require_authenticated_session)],
):
    """ChatKit SSE endpoint for streaming agent responses.

    This endpoint:
    1. Accepts user message
    2. Creates agent orchestrator with user's API key
    3. Streams agent responses in SSE format
    4. Shows visible handoffs between agents
    5. Shows tool calls and results
    """
    if not session.user_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key not set. Please configure in settings.",
        )

    logger.info(
        "Starting chat stream for session %s: %s",
        session.session_id,
        request.message[:50],
    )

    # Create orchestrator with user's API key
    orchestrator = create_orchestrator(
        api_key=session.user_api_key,
        session_id=session.session_id,
    )

    async def event_generator():
        """Generate SSE events from agent orchestrator."""
        try:
            async for event in orchestrator.process_message_stream(request.message):
                # Convert event to SSE format
                event_type = event.get("type", "message")

                # Format event data
                if event_type == "content_delta":
                    # Text streaming
                    yield {
                        "event": "delta",
                        "data": json.dumps({
                            "agent": event.get("agent"),
                            "content": event.get("delta"),
                        }),
                    }

                elif event_type == "agent_updated":
                    # Agent handoff - THIS IS THE VISIBLE HANDOFF
                    yield {
                        "event": "agent_handoff",
                        "data": json.dumps({
                            "agent": event.get("agent"),
                            "agent_name": event.get("agent_name"),
                            "message": f"→ Handing off to {event.get('agent_name')}",
                        }),
                    }

                elif event_type == "tool_call":
                    # Tool being called
                    yield {
                        "event": "tool_call",
                        "data": json.dumps({
                            "agent": event.get("agent"),
                            "tool": event.get("tool"),
                            "arguments": event.get("arguments"),
                        }),
                    }

                elif event_type == "tool_result":
                    # Tool result
                    yield {
                        "event": "tool_result",
                        "data": json.dumps({
                            "agent": event.get("agent"),
                            "tool": event.get("tool"),
                            "result": event.get("result"),
                        }),
                    }

                elif event_type == "error":
                    # Error occurred
                    yield {
                        "event": "error",
                        "data": json.dumps({
                            "error": event.get("error"),
                        }),
                    }

                elif event_type == "done":
                    # Stream complete
                    yield {
                        "event": "done",
                        "data": json.dumps({
                            "agent": event.get("agent"),
                        }),
                    }

        except Exception as e:
            logger.error("Error in event generator: %s", e, exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"error": "Internal server error"}),
            }

    return EventSourceResponse(event_generator())


@router.get("/chatkit/health")
async def chatkit_health():
    """Health check for ChatKit endpoint."""
    return {"status": "healthy", "endpoint": "chatkit"}
