"""tenant user memberships for company provisioning

Revision ID: 20260611_0037
Revises: 20260610_0036
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260611_0037"
down_revision = "20260610_0036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS tenant_user_memberships (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role_key VARCHAR(64) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_tenant_user_memberships_tenant_id
            ON tenant_user_memberships (tenant_id)
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_tenant_user_memberships_user_id
            ON tenant_user_memberships (user_id)
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_user_memberships_tenant_user
            ON tenant_user_memberships (tenant_id, user_id)
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS tenant_user_memberships"))
