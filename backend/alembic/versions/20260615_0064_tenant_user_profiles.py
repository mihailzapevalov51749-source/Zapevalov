"""tenant user profiles and membership status

Revision ID: 20260615_0064
Revises: 20260614_0063
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260615_0064"
down_revision = "20260614_0063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            ALTER TABLE tenant_user_memberships
            ADD COLUMN IF NOT EXISTS membership_status VARCHAR(32) NOT NULL DEFAULT 'active'
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE tenant_user_memberships
            SET membership_status = CASE
                WHEN is_active THEN 'active'
                ELSE 'dismissed'
            END
            WHERE membership_status IS NULL OR membership_status = 'active'
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS tenant_user_profiles (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                display_name VARCHAR(255),
                phone VARCHAR(50),
                position VARCHAR(255),
                department VARCHAR(255),
                city VARCHAR(255),
                manager VARCHAR(255),
                mentor VARCHAR(255),
                avatar_url VARCHAR(500),
                avatar_settings JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_user_profiles_tenant_user
            ON tenant_user_profiles (tenant_id, user_id)
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS ix_tenant_user_profiles_tenant_id
            ON tenant_user_profiles (tenant_id)
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO tenant_user_profiles (
                tenant_id,
                user_id,
                display_name,
                phone,
                position,
                department,
                city,
                manager,
                mentor,
                avatar_url,
                avatar_settings
            )
            SELECT
                m.tenant_id,
                u.id,
                u.full_name,
                u.phone,
                u.position,
                u.department,
                u.city,
                u.manager,
                u.mentor,
                u.avatar_url,
                u.avatar_settings
            FROM tenant_user_memberships m
            JOIN users u ON u.id = m.user_id
            ON CONFLICT (tenant_id, user_id) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS tenant_user_profiles"))
    op.execute(
        sa.text(
            """
            ALTER TABLE tenant_user_memberships
            DROP COLUMN IF EXISTS membership_status
            """
        )
    )
