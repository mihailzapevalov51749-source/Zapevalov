"""create user_workspace_tabs

Revision ID: 20260609_0025
Revises: 20260608_0024
Create Date: 2026-06-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260609_0025"
down_revision: Union[str, None] = "20260608_0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_workspace_tabs (
            id UUID PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            tenant_id INTEGER NULL REFERENCES portals(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            route VARCHAR(2048) NOT NULL,
            module_key VARCHAR(64) NOT NULL,
            page_type VARCHAR(64) NOT NULL,
            icon_key VARCHAR(64) NULL,
            context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
            is_minimized BOOLEAN NOT NULL DEFAULT FALSE,
            sort_order INTEGER NOT NULL DEFAULT 100,
            last_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_user_workspace_tabs_user_route UNIQUE (user_id, route)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_user_workspace_tabs_user_id
        ON user_workspace_tabs (user_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_user_workspace_tabs_tenant_id
        ON user_workspace_tabs (tenant_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_user_workspace_tabs_module_key
        ON user_workspace_tabs (module_key)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_user_workspace_tabs_last_opened_at
        ON user_workspace_tabs (last_opened_at)
        """
    )


def downgrade() -> None:
    op.drop_index("ix_user_workspace_tabs_last_opened_at", table_name="user_workspace_tabs")
    op.drop_index("ix_user_workspace_tabs_module_key", table_name="user_workspace_tabs")
    op.drop_index("ix_user_workspace_tabs_tenant_id", table_name="user_workspace_tabs")
    op.drop_index("ix_user_workspace_tabs_user_id", table_name="user_workspace_tabs")
    op.drop_table("user_workspace_tabs")
