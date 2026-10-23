"""Settings helpers."""

from __future__ import annotations

from app.core.config import Settings


def test_database_url_asyncpg_rewrite() -> None:
    settings = Settings(
        database_url="postgresql://user:pass@host:5432/db",
        jwt_secret="secret",
        redis_url="redis://localhost:6379/0",
    )
    assert settings.database_url == "postgresql+asyncpg://user:pass@host:5432/db"


def test_postgres_scheme_rewrite() -> None:
    settings = Settings(
        database_url="postgres://user:pass@host:5432/db",
        jwt_secret="secret",
        redis_url="redis://localhost:6379/0",
    )
    assert settings.database_url.startswith("postgresql+asyncpg://")


def test_asyncpg_scheme_unchanged() -> None:
    url = "postgresql+asyncpg://user:pass@host:5432/db"
    settings = Settings(
        database_url=url,
        jwt_secret="secret",
        redis_url="redis://localhost:6379/0",
    )
    assert settings.database_url == url
