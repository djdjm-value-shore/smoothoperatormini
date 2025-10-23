"""FastMCP server for note-taking tools.

This MCP server provides three tools for managing notes:
- save_note: Save a note with title and content
- get_note: Retrieve note content by title
- list_titles: List all note titles

The server runs in-process over stdio and uses the session-based
note storage from the SessionStore.
"""

from __future__ import annotations

import logging
from typing import Any

from app.session import session_store

logger = logging.getLogger(__name__)


class NoteMCPServer:
    """Simplified MCP server for note operations.

    Note: This is a simplified implementation that follows MCP patterns.
    In production with actual FastMCP, this would use decorators like:

        from fastmcp import FastMCP

        mcp = FastMCP("note_server")

        @mcp.tool
        def save_note(title: str, content: str) -> str:
            ...

    For now, we implement the tool interface manually to maintain
    compatibility with the architecture.
    """

    def __init__(self, session_id: str):
        """Initialize MCP server for a specific session."""
        self.session_id = session_id
        logger.debug("Initialized NoteMCPServer for session: %s", session_id)

    def get_tools(self) -> list[dict[str, Any]]:
        """Return list of available tools in MCP format."""
        return [
            {
                "name": "save_note",
                "description": "Save a note with the given title and content",
                "inputSchema": {
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
            {
                "name": "get_note",
                "description": "Retrieve the content of a note by its title",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Title of the note to retrieve",
                        },
                    },
                    "required": ["title"],
                },
            },
            {
                "name": "list_titles",
                "description": "List all available note titles",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                },
            },
        ]

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool by name with given arguments."""
        if tool_name == "save_note":
            return await self.save_note(arguments["title"], arguments["content"])
        elif tool_name == "get_note":
            return await self.get_note(arguments["title"])
        elif tool_name == "list_titles":
            return await self.list_titles()
        else:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}",
            }

    async def save_note(self, title: str, content: str) -> dict[str, Any]:
        """Save a note with title and content.

        Args:
            title: Note title
            content: Note content

        Returns:
            Result dictionary with success status
        """
        try:
            session_store.save_note(self.session_id, title, content)
            logger.info("Saved note '%s' for session %s", title, self.session_id)
            return {
                "success": True,
                "message": f"Note '{title}' saved successfully",
            }
        except Exception as e:
            logger.error("Error saving note: %s", e, exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def get_note(self, title: str) -> dict[str, Any]:
        """Retrieve note content by title.

        Args:
            title: Note title

        Returns:
            Result dictionary with content or error
        """
        try:
            content = session_store.get_note(self.session_id, title)
            if content is None:
                return {
                    "success": False,
                    "error": f"Note '{title}' not found",
                }
            logger.info("Retrieved note '%s' for session %s", title, self.session_id)
            return {
                "success": True,
                "title": title,
                "content": content,
            }
        except Exception as e:
            logger.error("Error retrieving note: %s", e, exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }

    async def list_titles(self) -> dict[str, Any]:
        """List all note titles for the session.

        Returns:
            Result dictionary with list of titles
        """
        try:
            titles = session_store.list_note_titles(self.session_id)
            logger.info(
                "Listed %d note titles for session %s",
                len(titles),
                self.session_id,
            )
            return {
                "success": True,
                "titles": titles,
                "count": len(titles),
            }
        except Exception as e:
            logger.error("Error listing note titles: %s", e, exc_info=True)
            return {
                "success": False,
                "error": str(e),
            }


def create_mcp_server(session_id: str) -> NoteMCPServer:
    """Factory function to create MCP server for a session."""
    return NoteMCPServer(session_id)
