"""Application settings loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(_BACKEND_ROOT / ".env"),
            str(_BACKEND_ROOT / ".env.local"),
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: str = "local"
    log_level: str = "INFO"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    database_url: str
    test_database_url: str | None = None
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7

    openai_api_key: str = ""
    openai_vision_model: str = "gpt-4o"
    openai_chat_model: str = "gpt-4o-mini"
    openai_timeout_seconds: int = 30

    @field_validator("database_url", "test_database_url", mode="before")
    @classmethod
    def ensure_asyncpg_scheme(cls, value: Any) -> Any:
        """Hosts often provide postgresql://; async SQLAlchemy needs postgresql+asyncpg://."""
        if value is None or not isinstance(value, str):
            return value
        if value.startswith("postgresql+asyncpg://"):
            return value
        if value.startswith("postgres://"):
            return "postgresql+asyncpg://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            return "postgresql+asyncpg://" + value.removeprefix("postgresql://")
        return value

    @property
    def is_local(self) -> bool:
        return self.environment == "local"

    @property
    def docs_enabled(self) -> bool:
        return self.is_local


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
