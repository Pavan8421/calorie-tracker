"""Food diary entries (nutrition snapshots)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    column,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import EntrySource, MealType

if TYPE_CHECKING:
    from app.models.user import User


class FoodEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "food_entries"
    __table_args__ = (
        Index("ix_food_entries_user_consumed_on", "user_id", "consumed_on"),
        Index(
            "ix_food_entries_user_meal_consumed_on",
            "user_id",
            "meal_type",
            "consumed_on",
        ),
        Index(
            "ix_food_entries_user_food_name_lower",
            "user_id",
            func.lower(column("food_name")),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    meal_type: Mapped[MealType] = mapped_column(
        Enum(MealType, name="meal_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    food_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    consumed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_on: Mapped[date] = mapped_column(Date, nullable=False)
    calories_kcal: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    protein_g: Mapped[Decimal] = mapped_column(
        Numeric(7, 2), nullable=False, default=Decimal("0"), server_default="0"
    )
    carbs_g: Mapped[Decimal] = mapped_column(
        Numeric(7, 2), nullable=False, default=Decimal("0"), server_default="0"
    )
    fat_g: Mapped[Decimal] = mapped_column(
        Numeric(7, 2), nullable=False, default=Decimal("0"), server_default="0"
    )
    fiber_g: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    sugar_g: Mapped[Decimal | None] = mapped_column(Numeric(7, 2), nullable=True)
    micronutrients: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    source: Mapped[EntrySource] = mapped_column(
        Enum(
            EntrySource,
            name="entry_source",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=EntrySource.manual,
        server_default=EntrySource.manual.value,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="food_entries")
