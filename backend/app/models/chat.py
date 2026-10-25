"""Chat conversations and messages."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ChatRole

if TYPE_CHECKING:
    from app.models.user import User


class ChatConversation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "chat_conversations"
    __table_args__ = (
        Index("ix_chat_conversations_user_updated", "user_id", "updated_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="chat_conversations")
    messages: Mapped[list[ChatMessage]] = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("ix_chat_messages_conversation_created", "conversation_id", "created_at"),
    )

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[ChatRole] = mapped_column(
        Enum(ChatRole, name="chat_role", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    tool_calls: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSONB, nullable=True)
    tool_call_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    conversation: Mapped[ChatConversation] = relationship(
        "ChatConversation",
        back_populates="messages",
    )
