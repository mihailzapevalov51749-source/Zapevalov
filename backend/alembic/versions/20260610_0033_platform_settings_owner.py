"""add platform owner fields to platform_settings

Revision ID: 20260610_0033
Revises: 20260610_0032
Create Date: 2026-06-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0033"
down_revision: Union[str, None] = "20260610_0032"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            ALTER TABLE platform_settings
            ADD COLUMN IF NOT EXISTS platform_owner_user_id INTEGER
                REFERENCES users(id) ON DELETE SET NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE platform_settings
            ADD COLUMN IF NOT EXISTS platform_owner_full_name VARCHAR(255)
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE platform_settings
            ADD COLUMN IF NOT EXISTS platform_owner_email VARCHAR(255)
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE platform_settings
            ADD COLUMN IF NOT EXISTS platform_owner_phone VARCHAR(50)
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE platform_settings
            ADD COLUMN IF NOT EXISTS platform_owner_avatar_url VARCHAR(500)
            """
        )
    )
    op.execute(
        sa.text(
            """
            ALTER TABLE platform_settings
            ADD COLUMN IF NOT EXISTS platform_owner_avatar_settings JSONB
            """
        )
    )
    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_settings_owner_user_id
            ON platform_settings (platform_owner_user_id)
            WHERE platform_owner_user_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS uq_platform_settings_owner_user_id"))
    op.execute(sa.text("ALTER TABLE platform_settings DROP COLUMN IF EXISTS platform_owner_avatar_settings"))
    op.execute(sa.text("ALTER TABLE platform_settings DROP COLUMN IF EXISTS platform_owner_avatar_url"))
    op.execute(sa.text("ALTER TABLE platform_settings DROP COLUMN IF EXISTS platform_owner_phone"))
    op.execute(sa.text("ALTER TABLE platform_settings DROP COLUMN IF EXISTS platform_owner_email"))
    op.execute(sa.text("ALTER TABLE platform_settings DROP COLUMN IF EXISTS platform_owner_full_name"))
    op.execute(sa.text("ALTER TABLE platform_settings DROP COLUMN IF EXISTS platform_owner_user_id"))
