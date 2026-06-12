"""drop universal table schema

Revision ID: 20260612_0046
Revises: 20260612_0045
Create Date: 2026-06-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260612_0046"
down_revision: Union[str, None] = "20260612_0045"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Child tables first (internal FK only; no external tables reference universal_*).
    op.drop_table("universal_table_rows")
    op.drop_table("universal_table_columns")
    op.drop_table("universal_views")
    op.drop_table("universal_tables")


def downgrade() -> None:
    op.create_table(
        "universal_tables",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("block_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(), nullable=False, server_default="Новая таблица"),
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_index("ix_universal_tables_id", "universal_tables", ["id"])
    op.create_index("ix_universal_tables_block_id", "universal_tables", ["block_id"])
    op.create_index(
        "universal_tables_block_id_unique",
        "universal_tables",
        ["block_id"],
        unique=True,
    )

    op.create_table(
        "universal_table_columns",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "table_id",
            sa.Integer(),
            sa.ForeignKey("universal_tables.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False, server_default="text"),
        sa.Column("system_key", sa.String(), nullable=True),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("width", sa.Integer(), nullable=False, server_default="180"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "options",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("multiple", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("align", sa.String(), nullable=False, server_default="left"),
        sa.Column(
            "lookup",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_readonly", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("lock_position", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("lock_width", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("lock_delete", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_index("ix_universal_table_columns_id", "universal_table_columns", ["id"])
    op.create_index(
        "ix_universal_table_columns_table_id",
        "universal_table_columns",
        ["table_id"],
    )
    op.create_index(
        "ix_universal_table_columns_system_key",
        "universal_table_columns",
        ["system_key"],
    )

    op.create_table(
        "universal_table_rows",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "table_id",
            sa.Integer(),
            sa.ForeignKey("universal_tables.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_row_id",
            sa.Integer(),
            sa.ForeignKey("universal_table_rows.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("number", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "values",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_index("ix_universal_table_rows_id", "universal_table_rows", ["id"])
    op.create_index("ix_universal_table_rows_table_id", "universal_table_rows", ["table_id"])
    op.create_index(
        "ix_universal_table_rows_parent_row_id",
        "universal_table_rows",
        ["parent_row_id"],
    )
    op.create_index("ix_universal_table_rows_number", "universal_table_rows", ["number"])

    op.create_table(
        "universal_views",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "table_id",
            sa.Integer(),
            sa.ForeignKey("universal_tables.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False, server_default="table"),
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "layout",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "filters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "sorting",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "grouping",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "visible_fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_universal_views_id", "universal_views", ["id"])
    op.create_index("ix_universal_views_table_id", "universal_views", ["table_id"])
