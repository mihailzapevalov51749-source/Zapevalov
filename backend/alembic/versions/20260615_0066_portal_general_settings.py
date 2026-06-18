"""portal general settings columns

Revision ID: 20260615_0066
Revises: 20260615_0065
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260615_0066"
down_revision = "20260615_0065"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "portals",
        sa.Column(
            "timezone",
            sa.String(length=128),
            nullable=False,
            server_default="(UTC+03:00) Москва",
        ),
    )
    op.add_column(
        "portals",
        sa.Column(
            "date_format",
            sa.String(length=32),
            nullable=False,
            server_default="DD.MM.YYYY",
        ),
    )
    op.add_column(
        "portals",
        sa.Column(
            "time_format",
            sa.String(length=16),
            nullable=False,
            server_default="24h",
        ),
    )
    op.add_column(
        "portals",
        sa.Column(
            "week_start_day",
            sa.String(length=32),
            nullable=False,
            server_default="Понедельник",
        ),
    )
    op.add_column(
        "portals",
        sa.Column(
            "default_language",
            sa.String(length=16),
            nullable=False,
            server_default="ru",
        ),
    )


def downgrade() -> None:
    op.drop_column("portals", "default_language")
    op.drop_column("portals", "week_start_day")
    op.drop_column("portals", "time_format")
    op.drop_column("portals", "date_format")
    op.drop_column("portals", "timezone")
