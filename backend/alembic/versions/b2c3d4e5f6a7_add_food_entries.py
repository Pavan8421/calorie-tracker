"""add food_entries

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-24 19:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

meal_type_enum = postgresql.ENUM(
    "breakfast",
    "lunch",
    "dinner",
    "snacks",
    name="meal_type",
    create_type=False,
)
entry_source_enum = postgresql.ENUM(
    "manual",
    "ai_image",
    "pdf_import",
    "chat",
    name="entry_source",
    create_type=False,
)


def upgrade() -> None:
    meal_type_enum.create(op.get_bind(), checkfirst=True)
    entry_source_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "food_entries",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("meal_type", meal_type_enum, nullable=False),
        sa.Column("food_name", sa.String(length=200), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_on", sa.Date(), nullable=False),
        sa.Column("calories_kcal", sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column(
            "protein_g",
            sa.Numeric(precision=7, scale=2),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "carbs_g",
            sa.Numeric(precision=7, scale=2),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "fat_g",
            sa.Numeric(precision=7, scale=2),
            server_default="0",
            nullable=False,
        ),
        sa.Column("fiber_g", sa.Numeric(precision=7, scale=2), nullable=True),
        sa.Column("sugar_g", sa.Numeric(precision=7, scale=2), nullable=True),
        sa.Column(
            "micronutrients",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "source",
            entry_source_enum,
            server_default="manual",
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("quantity > 0", name="ck_food_entries_quantity"),
        sa.CheckConstraint(
            "calories_kcal >= 0 AND calories_kcal <= 10000",
            name="ck_food_entries_calories",
        ),
        sa.CheckConstraint("protein_g >= 0", name="ck_food_entries_protein"),
        sa.CheckConstraint("carbs_g >= 0", name="ck_food_entries_carbs"),
        sa.CheckConstraint("fat_g >= 0", name="ck_food_entries_fat"),
        sa.CheckConstraint("fiber_g IS NULL OR fiber_g >= 0", name="ck_food_entries_fiber"),
        sa.CheckConstraint("sugar_g IS NULL OR sugar_g >= 0", name="ck_food_entries_sugar"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_food_entries_user_id"), "food_entries", ["user_id"], unique=False)
    op.create_index(
        "ix_food_entries_user_consumed_on",
        "food_entries",
        ["user_id", "consumed_on"],
        unique=False,
    )
    op.create_index(
        "ix_food_entries_user_meal_consumed_on",
        "food_entries",
        ["user_id", "meal_type", "consumed_on"],
        unique=False,
    )
    op.execute(
        "CREATE INDEX ix_food_entries_user_food_name_lower "
        "ON food_entries (user_id, lower(food_name))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_food_entries_user_food_name_lower")
    op.drop_index("ix_food_entries_user_meal_consumed_on", table_name="food_entries")
    op.drop_index("ix_food_entries_user_consumed_on", table_name="food_entries")
    op.drop_index(op.f("ix_food_entries_user_id"), table_name="food_entries")
    op.drop_table("food_entries")
    entry_source_enum.drop(op.get_bind(), checkfirst=True)
    meal_type_enum.drop(op.get_bind(), checkfirst=True)
