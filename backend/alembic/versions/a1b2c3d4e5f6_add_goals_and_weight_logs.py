"""add goals and weight_logs

Revision ID: a1b2c3d4e5f6
Revises: 6ff80dcc46ff
Create Date: 2026-10-24 18:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "6ff80dcc46ff"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("calories_kcal", sa.Integer(), nullable=False),
        sa.Column("protein_g", sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column("carbs_g", sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column("fat_g", sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column("fiber_g", sa.Numeric(precision=7, scale=2), nullable=True),
        sa.Column("target_weight_kg", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("effective_from", sa.Date(), nullable=False),
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
        sa.CheckConstraint("calories_kcal >= 800 AND calories_kcal <= 10000", name="ck_goals_calories"),
        sa.CheckConstraint("protein_g >= 0", name="ck_goals_protein"),
        sa.CheckConstraint("carbs_g >= 0", name="ck_goals_carbs"),
        sa.CheckConstraint("fat_g >= 0", name="ck_goals_fat"),
        sa.CheckConstraint("fiber_g IS NULL OR fiber_g >= 0", name="ck_goals_fiber"),
        sa.CheckConstraint(
            "target_weight_kg IS NULL OR (target_weight_kg >= 20 AND target_weight_kg <= 400)",
            name="ck_goals_target_weight",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "effective_from", name="uq_goals_user_effective_from"),
    )
    op.create_index(op.f("ix_goals_user_id"), "goals", ["user_id"], unique=False)

    op.create_table(
        "weight_logs",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("logged_on", sa.Date(), nullable=False),
        sa.Column("weight_kg", sa.Numeric(precision=5, scale=2), nullable=False),
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
        sa.CheckConstraint(
            "weight_kg >= 20 AND weight_kg <= 400",
            name="ck_weight_logs_weight",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "logged_on", name="uq_weight_logs_user_logged_on"),
    )
    op.create_index(op.f("ix_weight_logs_user_id"), "weight_logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_weight_logs_user_id"), table_name="weight_logs")
    op.drop_table("weight_logs")
    op.drop_index(op.f("ix_goals_user_id"), table_name="goals")
    op.drop_table("goals")
