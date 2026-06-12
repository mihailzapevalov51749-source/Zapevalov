"""add bootstrap owner fields to users

Revision ID: 20260610_0034
Revises: 20260610_0033
Create Date: 2026-06-10
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260610_0034"
down_revision = "20260610_0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_system_user BOOLEAN NOT NULL DEFAULT FALSE
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_hidden_user BOOLEAN NOT NULL DEFAULT FALSE
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS login_disabled BOOLEAN NOT NULL DEFAULT FALSE
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'active'
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS account_status"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS login_disabled"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS is_hidden_user"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS is_system_user"))
