"""create runtime relation instances table

Revision ID: 20250525_0007
Revises: 20250525_0006
Create Date: 2025-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250525_0007"
down_revision: Union[str, None] = "20250525_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "runtime_relation_instances",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("relation_key", sa.String(length=64), nullable=False),
        sa.Column("relation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("catalog_version", sa.Integer(), nullable=False),
        sa.Column("source_entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_object_type_key", sa.String(length=64), nullable=False),
        sa.Column("target_object_type_key", sa.String(length=64), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["source_entity_id"],
            ["runtime_entities.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["target_entity_id"],
            ["runtime_entities.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_runtime_relation_instances_tenant_relation_key",
        "runtime_relation_instances",
        ["tenant_id", "relation_key"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_relation_instances_tenant_source_entity",
        "runtime_relation_instances",
        ["tenant_id", "source_entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_relation_instances_tenant_target_entity",
        "runtime_relation_instances",
        ["tenant_id", "target_entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_relation_instances_tenant_catalog_version",
        "runtime_relation_instances",
        ["tenant_id", "catalog_version"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_relation_instances_tenant_status",
        "runtime_relation_instances",
        ["tenant_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_runtime_relation_instances_tenant_deleted_at",
        "runtime_relation_instances",
        ["tenant_id", "deleted_at"],
        unique=False,
    )
    op.create_index(
        "uq_runtime_relation_instances_active_pair",
        "runtime_relation_instances",
        ["tenant_id", "relation_key", "source_entity_id", "target_entity_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_runtime_relation_instances_active_pair",
        table_name="runtime_relation_instances",
    )
    op.drop_index(
        "ix_runtime_relation_instances_tenant_deleted_at",
        table_name="runtime_relation_instances",
    )
    op.drop_index(
        "ix_runtime_relation_instances_tenant_status",
        table_name="runtime_relation_instances",
    )
    op.drop_index(
        "ix_runtime_relation_instances_tenant_catalog_version",
        table_name="runtime_relation_instances",
    )
    op.drop_index(
        "ix_runtime_relation_instances_tenant_target_entity",
        table_name="runtime_relation_instances",
    )
    op.drop_index(
        "ix_runtime_relation_instances_tenant_source_entity",
        table_name="runtime_relation_instances",
    )
    op.drop_index(
        "ix_runtime_relation_instances_tenant_relation_key",
        table_name="runtime_relation_instances",
    )
    op.drop_table("runtime_relation_instances")
