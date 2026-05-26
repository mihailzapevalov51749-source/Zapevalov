"""create runtime entity tables

Revision ID: 20250525_0006
Revises: 20250525_0005
Create Date: 2025-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250525_0006"
down_revision: Union[str, None] = "20250525_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "runtime_entities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("object_type_key", sa.String(length=64), nullable=False),
        sa.Column("object_type_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("catalog_version", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="active",
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
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "runtime_entity_values",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_key", sa.String(length=64), nullable=False),
        sa.Column("field_type", sa.String(length=32), nullable=False),
        sa.Column("value_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
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
        sa.ForeignKeyConstraint(["entity_id"], ["runtime_entities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tenant_id",
            "entity_id",
            "field_key",
            name="uq_runtime_entity_values_tenant_entity_field",
        ),
    )

    op.create_index(
        "ix_runtime_entities_tenant_object_type_key",
        "runtime_entities",
        ["tenant_id", "object_type_key"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_entities_tenant_catalog_version",
        "runtime_entities",
        ["tenant_id", "catalog_version"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_entities_tenant_status",
        "runtime_entities",
        ["tenant_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_entities_tenant_deleted_at",
        "runtime_entities",
        ["tenant_id", "deleted_at"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_entity_values_tenant_entity",
        "runtime_entity_values",
        ["tenant_id", "entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_entity_values_tenant_field_key",
        "runtime_entity_values",
        ["tenant_id", "field_key"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_runtime_entity_values_tenant_field_key",
        table_name="runtime_entity_values",
    )
    op.drop_index(
        "ix_runtime_entity_values_tenant_entity",
        table_name="runtime_entity_values",
    )
    op.drop_index("ix_runtime_entities_tenant_deleted_at", table_name="runtime_entities")
    op.drop_index("ix_runtime_entities_tenant_status", table_name="runtime_entities")
    op.drop_index(
        "ix_runtime_entities_tenant_catalog_version",
        table_name="runtime_entities",
    )
    op.drop_index(
        "ix_runtime_entities_tenant_object_type_key",
        table_name="runtime_entities",
    )
    op.drop_table("runtime_entity_values")
    op.drop_table("runtime_entities")
