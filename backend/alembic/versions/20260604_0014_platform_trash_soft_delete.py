"""platform trash soft delete columns

Revision ID: 20260604_0014
Revises: 20260604_0013
Create Date: 2026-06-04

"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260604_0014"
down_revision: Union[str, None] = "20260604_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES_WITH_DELETED_AT = (
    "pages",
    "navigation_items",
    "designer_workspaces",
    "designer_workspace_tabs",
)

_TABLES_WITH_DELETED_BY_ONLY = (
    "designer_object_types",
    "designer_field_definitions",
    "designer_view_definitions",
    "designer_relation_definitions",
)


def upgrade() -> None:
    for table in _TABLES_WITH_DELETED_AT:
        op.execute(
            f"""
            ALTER TABLE {table}
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL
            """
        )
        op.execute(
            f"""
            ALTER TABLE {table}
            ADD COLUMN IF NOT EXISTS deleted_by INTEGER NULL
            REFERENCES users(id)
            """
        )

    for table in _TABLES_WITH_DELETED_BY_ONLY:
        op.execute(
            f"""
            ALTER TABLE {table}
            ADD COLUMN IF NOT EXISTS deleted_by INTEGER NULL
            REFERENCES users(id)
            """
        )


def downgrade() -> None:
    for table in _TABLES_WITH_DELETED_AT:
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS deleted_by")
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS deleted_at")

    for table in _TABLES_WITH_DELETED_BY_ONLY:
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS deleted_by")
