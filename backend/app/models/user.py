"""User account model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.chat import ChatConversation
    from app.models.food_entry import FoodEntry
    from app.models.goal import Goal
    from app.models.import_job import ImportJob
    from app.models.refresh_token import RefreshToken
    from app.models.weight_log import WeightLog


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    timezone: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="UTC",
        server_default="UTC",
    )

    refresh_tokens: Mapped[list[RefreshToken]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    goals: Mapped[list[Goal]] = relationship(
        "Goal",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    weight_logs: Mapped[list[WeightLog]] = relationship(
        "WeightLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    food_entries: Mapped[list[FoodEntry]] = relationship(
        "FoodEntry",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    chat_conversations: Mapped[list[ChatConversation]] = relationship(
        "ChatConversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    import_jobs: Mapped[list[ImportJob]] = relationship(
        "ImportJob",
        back_populates="user",
        cascade="all, delete-orphan",
    )
