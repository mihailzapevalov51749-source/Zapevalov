"""office user table views

Revision ID: 20260605_0015
Revises: 20260604_0014
Create Date: 2026-06-05

"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260605_0015"
down_revision: Union[str, None] = "20260604_0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS runtime_office_user_table_views (
            id UUID PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
            owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            object_type_key VARCHAR(64) NOT NULL,
            view_key VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            view_type VARCHAR(32) NOT NULL DEFAULT 'table',
            is_default BOOLEAN NOT NULL DEFAULT FALSE,
            is_visible BOOLEAN NOT NULL DEFAULT TRUE,
            settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            visibility_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_runtime_office_user_table_views_scope_key
                UNIQUE (tenant_id, owner_user_id, object_type_key, view_key)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_runtime_office_user_table_views_scope
        ON runtime_office_user_table_views (tenant_id, owner_user_id, object_type_key)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS runtime_office_user_table_views")
