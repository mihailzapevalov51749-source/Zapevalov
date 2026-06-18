"""portal short_name, is_protected, environment_role

Revision ID: 20260615_0067
Revises: 20260615_0066
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260615_0067"
down_revision = "20260615_0066"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "portals",
        sa.Column("short_name", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "portals",
        sa.Column(
            "is_protected",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "portals",
        sa.Column("environment_role", sa.String(length=32), nullable=True),
    )

    op.execute(
        """
        UPDATE portals
        SET is_protected = TRUE,
            environment_role = 'DEV'
        WHERE id = 1
        """
    )
    op.execute(
        """
        UPDATE portals
        SET is_protected = TRUE,
            environment_role = 'TEMPLATE'
        WHERE id = 2
        """
    )


def downgrade() -> None:
    op.drop_column("portals", "environment_role")
    op.drop_column("portals", "is_protected")
    op.drop_column("portals", "short_name")
