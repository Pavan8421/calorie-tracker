"""Versioned nutrition / weight goals."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class Goal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "goals"
    __table_args__ = (
        UniqueConstraint("user_id", "effective_from", name="uq_goals_user_effective_from"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    calories_kcal: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_g: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    carbs_g: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    fat_g: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    fiber_g: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    target_weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)

    user: Mapped[User] = relationship("User", back_populates="goals")
