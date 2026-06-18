"""platform users registry

Revision ID: 20260615_0065
Revises: 20260615_0064
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260615_0065"
down_revision = "20260615_0064"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS platform_users (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                platform_role VARCHAR(64) NOT NULL,
                status VARCHAR(32) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_platform_users_user_id UNIQUE (user_id)
            )
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO platform_users (user_id, platform_role, status, created_at, updated_at)
            SELECT ps.platform_owner_user_id, 'platform_owner', 'active', NOW(), NOW()
            FROM platform_settings ps
            WHERE ps.platform_owner_user_id IS NOT NULL
            ON CONFLICT (user_id) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS platform_users"))
