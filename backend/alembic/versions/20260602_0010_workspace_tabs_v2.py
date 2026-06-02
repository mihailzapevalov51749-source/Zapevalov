"""workspace tabs v2 fields

Revision ID: 20260602_0010
Revises: 20250528_0009
Create Date: 2026-06-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260602_0010"
down_revision: Union[str, None] = "20250528_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "designer_workspace_tabs",
        sa.Column("slug_is_manual", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "designer_workspace_tabs",
        sa.Column("tab_type", sa.String(length=30), nullable=False, server_default="object"),
    )
    op.add_column(
        "designer_workspace_tabs",
        sa.Column("target_type", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "designer_workspace_tabs",
        sa.Column("target_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "designer_workspace_tabs",
        sa.Column("url", sa.Text(), nullable=True),
    )
    op.add_column(
        "designer_workspace_tabs",
        sa.Column("open_in_new_tab", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.execute(
        """
        UPDATE designer_workspace_tabs
        SET
            tab_type = CASE WHEN is_system THEN 'page' ELSE 'object' END,
            target_type = CASE WHEN is_system THEN 'page' ELSE 'object' END,
            target_id = CASE
                WHEN is_system THEN (
                    SELECT CAST(dw.home_page_id AS VARCHAR)
                    FROM designer_workspaces dw
                    WHERE dw.id = designer_workspace_tabs.workspace_id
                )
                ELSE CAST(object_type_id AS VARCHAR)
            END
        """
    )

    op.alter_column("designer_workspace_tabs", "slug_is_manual", server_default=None)
    op.alter_column("designer_workspace_tabs", "tab_type", server_default=None)
    op.alter_column("designer_workspace_tabs", "open_in_new_tab", server_default=None)


def downgrade() -> None:
    op.drop_column("designer_workspace_tabs", "open_in_new_tab")
    op.drop_column("designer_workspace_tabs", "url")
    op.drop_column("designer_workspace_tabs", "target_id")
    op.drop_column("designer_workspace_tabs", "target_type")
    op.drop_column("designer_workspace_tabs", "tab_type")
    op.drop_column("designer_workspace_tabs", "slug_is_manual")
