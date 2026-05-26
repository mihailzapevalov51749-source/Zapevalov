"""create designer_field_definitions

Revision ID: 20250525_0002
Revises: 20250525_0001
Create Date: 2025-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250525_0002"
down_revision: Union[str, None] = "20250525_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "designer_field_definitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("object_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("field_type", sa.String(length=32), nullable=False),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "is_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_unique",
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
            "default_value_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "settings_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "validation_json",
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
        "ix_designer_field_definitions_tenant_object_type",
        "designer_field_definitions",
        ["tenant_id", "object_type_id"],
        unique=False,
    )
    op.create_index(
        "ix_designer_field_definitions_object_type_sort_order",
        "designer_field_definitions",
        ["object_type_id", "sort_order"],
        unique=False,
    )
    op.create_index(
        "ix_designer_field_definitions_tenant_field_type",
        "designer_field_definitions",
        ["tenant_id", "field_type"],
        unique=False,
    )
    op.create_index(
        "uq_designer_field_definitions_object_type_key_active",
        "designer_field_definitions",
        ["tenant_id", "object_type_id", "key"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_designer_field_definitions_object_type_key_active",
        table_name="designer_field_definitions",
    )
    op.drop_index(
        "ix_designer_field_definitions_tenant_field_type",
        table_name="designer_field_definitions",
    )
    op.drop_index(
        "ix_designer_field_definitions_object_type_sort_order",
        table_name="designer_field_definitions",
    )
    op.drop_index(
        "ix_designer_field_definitions_tenant_object_type",
        table_name="designer_field_definitions",
    )
    op.drop_table("designer_field_definitions")
