"""portal original_name — immutable company name at creation

Revision ID: 20260616_0076
Revises: 20260616_0075
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260616_0076"
down_revision = "20260616_0075"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("portals", sa.Column("original_name", sa.String(length=255), nullable=True))
    op.execute("UPDATE portals SET original_name = name")
    op.alter_column("portals", "original_name", nullable=False)


def downgrade() -> None:
    op.drop_column("portals", "original_name")
