"""Create platform deployment registry table.

Revision ID: 20260616_0072
Revises: 20260616_0071
Create Date: 2026-06-16
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260616_0072"
down_revision: Union[str, None] = "20260616_0071"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_deployments" not in table_names:
        op.create_table(
            "platform_deployments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("deployment_key", sa.String(length=32), nullable=False),
            sa.Column("release_package_id", sa.Integer(), nullable=False),
            sa.Column("target_environment_type", sa.String(length=32), nullable=False),
            sa.Column("target_environment_id", sa.String(length=64), nullable=True),
            sa.Column("target_tenant_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="planned"),
            sa.Column("target_platform_version", sa.String(length=40), nullable=False),
            sa.Column("target_schema_revision", sa.String(length=64), nullable=True),
            sa.Column("previous_platform_version", sa.String(length=40), nullable=True),
            sa.Column("previous_release_package_id", sa.Integer(), nullable=True),
            sa.Column(
                "deployment_manifest_json",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("failure_reason", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["release_package_id"], ["platform_release_packages.id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["target_tenant_id"], ["portals.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["previous_release_package_id"], ["platform_release_packages.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("deployment_key", name="uq_platform_deployments_deployment_key"),
            sa.CheckConstraint(
                "target_environment_type IN ('template','client','dev')",
                name="ck_platform_deployments_target_environment_type",
            ),
            sa.CheckConstraint(
                "status IN ('planned','running','succeeded','failed','cancelled','rolled_back')",
                name="ck_platform_deployments_status",
            ),
        )
        op.create_index("ix_platform_deployments_id", "platform_deployments", ["id"])
        op.create_index("ix_platform_deployments_deployment_key", "platform_deployments", ["deployment_key"])
        op.create_index("ix_platform_deployments_release_package_id", "platform_deployments", ["release_package_id"])
        op.create_index(
            "ix_platform_deployments_target_environment_type",
            "platform_deployments",
            ["target_environment_type"],
        )
        op.create_index("ix_platform_deployments_target_tenant_id", "platform_deployments", ["target_tenant_id"])
        op.create_index("ix_platform_deployments_status", "platform_deployments", ["status"])
        op.create_index("ix_platform_deployments_created_at", "platform_deployments", ["created_at"])
        op.create_index(
            "ix_platform_deployments_previous_release_package_id",
            "platform_deployments",
            ["previous_release_package_id"],
        )
        op.create_index(
            "ix_platform_deployments_target_platform_version",
            "platform_deployments",
            ["target_platform_version"],
        )
        op.create_index(
            "ix_platform_deployments_target_schema_revision",
            "platform_deployments",
            ["target_schema_revision"],
        )
        op.create_index(
            "ix_platform_deployments_previous_platform_version",
            "platform_deployments",
            ["previous_platform_version"],
        )
        op.create_index("ix_platform_deployments_created_by", "platform_deployments", ["created_by"])


def downgrade() -> None:
    op.drop_index("ix_platform_deployments_created_by", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_previous_platform_version", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_target_schema_revision", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_target_platform_version", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_previous_release_package_id", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_created_at", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_status", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_target_tenant_id", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_target_environment_type", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_release_package_id", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_deployment_key", table_name="platform_deployments")
    op.drop_index("ix_platform_deployments_id", table_name="platform_deployments")
    op.drop_table("platform_deployments")

