"""sync users.tenant_id and users.role_id with User model (idempotent)

Revision ID: 20260610_0036
Revises: 20260610_0035
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260610_0036"
down_revision = "20260610_0035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'role_id'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN role_id INTEGER REFERENCES roles(id);
                END IF;
            END $$;
            """
        )
    )

    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'tenant_id'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN tenant_id INTEGER REFERENCES portals(id) ON DELETE CASCADE;
                END IF;
            END $$;
            """
        )
    )

    op.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_users_tenant_id
            ON users (tenant_id)
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ix_users_tenant_id"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS tenant_id"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS role_id"))
