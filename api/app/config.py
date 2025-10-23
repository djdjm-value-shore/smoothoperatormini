"""Application configuration using pydantic-settings."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "SmoothOperator API"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "INFO"

    # Security
    app_passcode: str = Field(description="Passcode for /login authentication")
    session_secret: str = Field(description="Secret key for session cookies")

    # CORS
    allowed_origins: str = Field(
        default="http://localhost:5173",
        description="Comma-separated list of allowed CORS origins",
    )

    # Server
    port: int = Field(default=8000, description="Server port")
    host: str = Field(default="0.0.0.0", description="Server host")
    workers: int = Field(default=1, description="Number of worker processes")

    # Session
    session_ttl: int = Field(default=3600, description="Session TTL in seconds")
    thread_ttl: int = Field(default=7200, description="Thread TTL in seconds")

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated origins into list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Global settings instance
settings = Settings()
