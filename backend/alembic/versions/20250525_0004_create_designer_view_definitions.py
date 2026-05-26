"""create designer_view_definitions

Revision ID: 20250525_0004
Revises: 20250525_0003
Create Date: 2025-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250525_0004"
down_revision: Union[str, None] = "20250525_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "designer_view_definitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("object_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("view_type", sa.String(length=32), nullable=False),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_system",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "settings_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "layout_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "filters_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "visibility_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "draft_revision",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["object_type_id"],
            ["designer_object_types.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_designer_view_definitions_tenant_object_type",
        "designer_view_definitions",
        ["tenant_id", "object_type_id"],
        unique=False,
    )
    op.create_index(
        "ix_designer_view_definitions_object_type_sort_order",
        "designer_view_definitions",
        ["object_type_id", "sort_order"],
        unique=False,
    )
    op.create_index(
        "ix_designer_view_definitions_tenant_view_type",
        "designer_view_definitions",
        ["tenant_id", "view_type"],
        unique=False,
    )
    op.create_index(
        "ix_designer_view_definitions_tenant_is_active",
        "designer_view_definitions",
        ["tenant_id", "is_active"],
        unique=False,
    )
    op.create_index(
        "uq_designer_view_definitions_object_type_key_active",
        "designer_view_definitions",
        ["tenant_id", "object_type_id", "key"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "uq_designer_view_definitions_object_type_default_active",
        "designer_view_definitions",
        ["object_type_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND is_default = true"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_designer_view_definitions_object_type_default_active",
        table_name="designer_view_definitions",
    )
    op.drop_index(
        "uq_designer_view_definitions_object_type_key_active",
        table_name="designer_view_definitions",
    )
    op.drop_index(
        "ix_designer_view_definitions_tenant_is_active",
        table_name="designer_view_definitions",
    )
    op.drop_index(
        "ix_designer_view_definitions_tenant_view_type",
        table_name="designer_view_definitions",
    )
    op.drop_index(
        "ix_designer_view_definitions_object_type_sort_order",
        table_name="designer_view_definitions",
    )
    op.drop_index(
        "ix_designer_view_definitions_tenant_object_type",
        table_name="designer_view_definitions",
    )
    op.drop_table("designer_view_definitions")
