"""create designer_relation_definitions

Revision ID: 20250525_0003
Revises: 20250525_0002
Create Date: 2025-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250525_0003"
down_revision: Union[str, None] = "20250525_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "designer_relation_definitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_object_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_object_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relation_type", sa.String(length=32), nullable=False),
        sa.Column("reverse_name", sa.String(length=255), nullable=True),
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
            "bidirectional",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "cascade_delete",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
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
            ["source_object_type_id"],
            ["designer_object_types.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["target_object_type_id"],
            ["designer_object_types.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_designer_relation_definitions_tenant_source",
        "designer_relation_definitions",
        ["tenant_id", "source_object_type_id"],
        unique=False,
    )
    op.create_index(
        "ix_designer_relation_definitions_tenant_target",
        "designer_relation_definitions",
        ["tenant_id", "target_object_type_id"],
        unique=False,
    )
    op.create_index(
        "ix_designer_relation_definitions_tenant_relation_type",
        "designer_relation_definitions",
        ["tenant_id", "relation_type"],
        unique=False,
    )
    op.create_index(
        "ix_designer_relation_definitions_tenant_is_active",
        "designer_relation_definitions",
        ["tenant_id", "is_active"],
        unique=False,
    )
    op.create_index(
        "uq_designer_relation_definitions_tenant_key_active",
        "designer_relation_definitions",
        ["tenant_id", "key"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_designer_relation_definitions_tenant_key_active",
        table_name="designer_relation_definitions",
    )
    op.drop_index(
        "ix_designer_relation_definitions_tenant_is_active",
        table_name="designer_relation_definitions",
    )
    op.drop_index(
        "ix_designer_relation_definitions_tenant_relation_type",
        table_name="designer_relation_definitions",
    )
    op.drop_index(
        "ix_designer_relation_definitions_tenant_target",
        table_name="designer_relation_definitions",
    )
    op.drop_index(
        "ix_designer_relation_definitions_tenant_source",
        table_name="designer_relation_definitions",
    )
    op.drop_table("designer_relation_definitions")
