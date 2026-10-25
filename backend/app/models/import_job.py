"""PDF import jobs and parsed preview rows."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum, ForeignKey, Index, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ImportStatus

if TYPE_CHECKING:
    from app.models.food_entry import FoodEntry
    from app.models.user import User


class ImportJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "import_jobs"
    __table_args__ = (
        Index("ix_import_jobs_user_created", "user_id", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    date_format: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="DMY",
        server_default="DMY",
    )
    status: Mapped[ImportStatus] = mapped_column(
        Enum(
            ImportStatus,
            name="import_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=ImportStatus.pending,
        server_default=ImportStatus.pending.value,
    )
    parsed_rows: Mapped[list[Any] | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    imported_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    user: Mapped[User] = relationship("User", back_populates="import_jobs")
    food_entries: Mapped[list[FoodEntry]] = relationship(
        "FoodEntry",
        back_populates="import_job",
    )
