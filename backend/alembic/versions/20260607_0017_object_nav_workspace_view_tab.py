"""object show_in_navigation migration + workspace object_view_id

Revision ID: 20260607_0017
Revises: 20260605_0016
Create Date: 2026-06-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260607_0017"
down_revision: Union[str, None] = "20260605_0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _workspace_tab_columns() -> set[str]:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return {c["name"] for c in insp.get_columns("designer_workspace_tabs")}


def upgrade() -> None:
    cols = _workspace_tab_columns()
    if "object_view_id" not in cols:
        op.add_column(
            "designer_workspace_tabs",
            sa.Column(
                "object_view_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("designer_view_definitions.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
        op.create_index(
            "ix_designer_workspace_tabs_object_view_id",
            "designer_workspace_tabs",
            ["object_view_id"],
            unique=False,
        )

    # Backfill object_view_id from default/active view per object type tab.
    op.execute(
        """
        UPDATE designer_workspace_tabs wt
        SET object_view_id = sub.view_id
        FROM (
            SELECT DISTINCT ON (wt2.id)
                wt2.id AS tab_id,
                vd.id AS view_id
            FROM designer_workspace_tabs wt2
            JOIN designer_view_definitions vd
              ON vd.object_type_id = wt2.object_type_id::uuid
             AND vd.deleted_at IS NULL
             AND vd.is_active = TRUE
            WHERE wt2.tab_type = 'object'
              AND wt2.object_type_id IS NOT NULL
              AND wt2.deleted_at IS NULL
            ORDER BY wt2.id, vd.is_default DESC, vd.sort_order ASC, vd.key ASC
        ) sub
        WHERE wt.id = sub.tab_id
          AND wt.object_view_id IS NULL
        """
    )

    # Existing menu placements keep navigation visibility (backward compatibility).
    op.execute(
        """
        UPDATE designer_object_types ot
        SET settings_json = COALESCE(ot.settings_json, '{}'::jsonb)
            || jsonb_build_object('show_in_navigation', TRUE)
        WHERE ot.deleted_at IS NULL
          AND ot.id IN (
              SELECT DISTINCT ni.object_type_id
              FROM navigation_items ni
              WHERE ni.object_type_id IS NOT NULL
          )
          AND COALESCE(ot.settings_json->>'show_in_navigation', '') = ''
        """
    )


def downgrade() -> None:
    cols = _workspace_tab_columns()
    if "object_view_id" in cols:
        op.drop_index("ix_designer_workspace_tabs_object_view_id", table_name="designer_workspace_tabs")
        op.drop_column("designer_workspace_tabs", "object_view_id")
