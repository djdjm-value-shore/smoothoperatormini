"""Agent orchestration using OpenAI Agents SDK pattern.

This module implements the multi-agent pattern with:
- Concierge: Front-facing agent that handles general queries
- Archivist: Specialist agent that manages notes via MCP tools

Note: This implementation follows the OpenAI Agents SDK patterns
based on the research findings. When the actual SDK is available,
the core structure will remain similar with updated imports.
"""

from __future__ import annotations

import json
import logging
from enum import Enum
from typing import Any, AsyncGenerator

from openai import AsyncOpenAI

from app.mcp.note_server import NoteMCPServer

logger = logging.getLogger(__name__)


class AgentType(str, Enum):
    """Agent types in the system."""

    CONCIERGE = "concierge"
    ARCHIVIST = "archivist"


class AgentMessage:
    """Message in agent conversation."""

    def __init__(
        self,
        role: str,
        content: str,
        agent: AgentType | None = None,
        tool_calls: list[dict] | None = None,
        tool_call_id: str | None = None,
    ):
        self.role = role
        self.content = content
        self.agent = agent
        self.tool_calls = tool_calls or []
        self.tool_call_id = tool_call_id

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API calls."""
        result = {"role": self.role, "content": self.content}
        if self.tool_calls:
            result["tool_calls"] = self.tool_calls
        if self.tool_call_id:
            result["tool_call_id"] = self.tool_call_id
        return result


class AgentOrchestrator:
    """Orchestrates multiple agents with handoff capabilities.

    This follows the pattern from OpenAI Agents SDK where:
    - Agents can hand off to each other
    - Tool calls are visible in the stream
    - Handoffs appear as agent_updated events
    """

    def __init__(self, api_key: str, session_id: str):
        """Initialize orchestrator with user's API key and session."""
        self.client = AsyncOpenAI(api_key=api_key)
        self.session_id = session_id
        self.mcp_server = NoteMCPServer(session_id)
        self.current_agent = AgentType.CONCIERGE
        self.conversation_history: list[AgentMessage] = []

        # Agent definitions
        self.agents = {
            AgentType.CONCIERGE: {
                "name": "Concierge",
                "instructions": """You are the Concierge, a friendly front-facing assistant.
You help users with general queries and can hand off to the Archivist for note-related tasks.

When users want to:
- Save a note
- Retrieve a note
- List notes
- Manage their notes in any way

Respond with: "I'll hand this over to our Archivist specialist who handles notes."
And use the handoff_to_archivist function.

For all other queries, help the user directly.""",
                "tools": [
                    {
                        "type": "function",
                        "function": {
                            "name": "handoff_to_archivist",
                            "description": "Hand off conversation to the Archivist for note management",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "reason": {
                                        "type": "string",
                                        "description": "Reason for handoff",
                                    }
                                },
                                "required": ["reason"],
                            },
                        },
                    }
                ],
            },
            AgentType.ARCHIVIST: {
                "name": "Archivist",
                "instructions": """You are the Archivist, a specialist in managing notes.
You have access to three tools:
- save_note: Save a note with title and content
- get_note: Retrieve a note by title
- list_titles: List all available notes

After completing note operations, you can return control to the Concierge
using handoff_to_concierge if the user has additional non-note queries.

Be efficient and clear in your note management.""",
                "tools": [
                    {
                        "type": "function",
                        "function": {
                            "name": "save_note",
                            "description": "Save a note with title and content",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "title": {
                                        "type": "string",
                                        "description": "Title of the note",
                                    },
                                    "content": {
                                        "type": "string",
                                        "description": "Content of the note",
                                    },
                                },
                                "required": ["title", "content"],
                            },
                        },
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "get_note",
                            "description": "Retrieve a note by title",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "title": {
                                        "type": "string",
                                        "description": "Title of the note",
                                    },
                                },
                                "required": ["title"],
                            },
                        },
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "list_titles",
                            "description": "List all note titles",
                            "parameters": {
                                "type": "object",
                                "properties": {},
                            },
                        },
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "handoff_to_concierge",
                            "description": "Return control to the Concierge",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "summary": {
                                        "type": "string",
                                        "description": "Summary of completed work",
                                    }
                                },
                                "required": ["summary"],
                            },
                        },
                    },
                ],
            },
        }

    async def process_message_stream(
        self, user_message: str
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Process a user message and stream responses with agent handoffs.

        This yields events including:
        - agent_updated: When handoff occurs
        - content_delta: Partial response text
        - tool_call: When a tool is called
        - tool_result: Result of tool execution
        """
        # Add user message to history
        self.conversation_history.append(
            AgentMessage(role="user", content=user_message)
        )

        # Yield user message event
        yield {
            "type": "user_message",
            "content": user_message,
        }

        # Process with current agent
        max_iterations = 10  # Prevent infinite loops
        for _ in range(max_iterations):
            agent_type = self.current_agent
            agent_config = self.agents[agent_type]

            # Yield agent event
            yield {
                "type": "agent_updated",
                "agent": agent_type.value,
                "agent_name": agent_config["name"],
            }

            # Build messages for API call
            messages = [
                {"role": "system", "content": agent_config["instructions"]}
            ] + [msg.to_dict() for msg in self.conversation_history]

            # Call OpenAI API with streaming
            try:
                response = await self.client.chat.completions.create(
                    model="gpt-4-turbo-preview",
                    messages=messages,
                    tools=agent_config["tools"],
                    stream=True,
                )

                # Collect response
                full_content = ""
                tool_calls = []
                current_tool_call = None

                async for chunk in response:
                    delta = chunk.choices[0].delta if chunk.choices else None
                    if not delta:
                        continue

                    # Content streaming
                    if delta.content:
                        full_content += delta.content
                        yield {
                            "type": "content_delta",
                            "agent": agent_type.value,
                            "delta": delta.content,
                        }

                    # Tool call streaming
                    if delta.tool_calls:
                        for tool_call in delta.tool_calls:
                            if tool_call.index is not None:
                                # Start new tool call
                                if current_tool_call is None or current_tool_call["index"] != tool_call.index:
                                    if current_tool_call:
                                        tool_calls.append(current_tool_call)
                                    current_tool_call = {
                                        "index": tool_call.index,
                                        "id": tool_call.id or "",
                                        "type": "function",
                                        "function": {
                                            "name": tool_call.function.name or "",
                                            "arguments": "",
                                        },
                                    }

                                # Accumulate arguments
                                if tool_call.function and tool_call.function.arguments:
                                    current_tool_call["function"]["arguments"] += tool_call.function.arguments

                # Add last tool call
                if current_tool_call:
                    tool_calls.append(current_tool_call)

                # Add assistant message to history
                assistant_msg = AgentMessage(
                    role="assistant",
                    content=full_content or "",
                    agent=agent_type,
                    tool_calls=tool_calls if tool_calls else None,
                )
                self.conversation_history.append(assistant_msg)

                # Process tool calls
                if tool_calls:
                    handoff_occurred = False

                    for tool_call in tool_calls:
                        func_name = tool_call["function"]["name"]
                        func_args = json.loads(tool_call["function"]["arguments"])

                        yield {
                            "type": "tool_call",
                            "agent": agent_type.value,
                            "tool": func_name,
                            "arguments": func_args,
                        }

                        # Handle handoffs
                        if func_name == "handoff_to_archivist":
                            self.current_agent = AgentType.ARCHIVIST
                            handoff_occurred = True
                            result = {"success": True, "handoff": "archivist"}
                        elif func_name == "handoff_to_concierge":
                            self.current_agent = AgentType.CONCIERGE
                            handoff_occurred = True
                            result = {"success": True, "handoff": "concierge"}
                        else:
                            # MCP tool call
                            result = await self.mcp_server.call_tool(func_name, func_args)

                        # Yield tool result
                        yield {
                            "type": "tool_result",
                            "agent": agent_type.value,
                            "tool": func_name,
                            "result": result,
                        }

                        # Add tool result to history
                        # Must include tool_call_id for OpenAI API
                        self.conversation_history.append(
                            AgentMessage(
                                role="tool",
                                content=json.dumps(result),
                                tool_call_id=tool_call["id"],
                            )
                        )

                    # Continue loop if handoff occurred
                    if handoff_occurred:
                        continue

                # No tool calls or no handoff, we're done
                break

            except Exception as e:
                logger.error("Error in agent processing: %s", e, exc_info=True)
                yield {
                    "type": "error",
                    "agent": agent_type.value,
                    "error": str(e),
                }
                break

        # Yield completion event
        yield {
            "type": "done",
            "agent": self.current_agent.value,
        }


def create_orchestrator(api_key: str, session_id: str) -> AgentOrchestrator:
    """Factory function to create agent orchestrator."""
    return AgentOrchestrator(api_key, session_id)
