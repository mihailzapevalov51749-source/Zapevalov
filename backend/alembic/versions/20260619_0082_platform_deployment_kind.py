"""Add deployment_kind to platform_deployments (WI-IMPL-005).

Revision ID: 20260619_0082
Revises: 20260618_0081
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260619_0082"
down_revision = "20260618_0081"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("platform_deployments")}

    if "deployment_kind" not in columns:
        op.add_column(
            "platform_deployments",
            sa.Column("deployment_kind", sa.String(length=32), nullable=True),
        )

    op.execute(
        """
        UPDATE platform_deployments
        SET deployment_kind = CASE
            WHEN deployment_manifest_json->>'created_via' = 'platform_releases_api_adapter'
                THEN 'template_publish'
            WHEN deployment_manifest_json->>'created_via' = 'tenant_update_apply'
                THEN 'company_update'
            WHEN deployment_manifest_json->>'created_via' = 'provision_baseline'
                THEN 'provision_baseline'
            WHEN deployment_manifest_json->>'created_via' = 'deployment_rollback'
                THEN 'rollback'
            WHEN deployment_manifest_json->>'created_via' = 'dev_deploy'
                THEN 'dev_deploy'
            WHEN deployment_manifest_json->>'deployment_kind' IN (
                'template_publish', 'company_update', 'provision_baseline', 'rollback', 'dev_deploy'
            ) THEN deployment_manifest_json->>'deployment_kind'
            WHEN target_environment_type = 'dev' THEN 'dev_deploy'
            WHEN previous_release_package_id IS NOT NULL
                AND deployment_manifest_json ? 'parent_deployment_id'
                THEN 'rollback'
            WHEN target_environment_type = 'client' THEN 'company_update'
            ELSE 'template_publish'
        END
        WHERE deployment_kind IS NULL
        """
    )

    op.alter_column("platform_deployments", "deployment_kind", nullable=False)
    op.create_index(
        "ix_platform_deployments_deployment_kind",
        "platform_deployments",
        ["deployment_kind"],
        unique=False,
    )
    op.create_check_constraint(
        "ck_platform_deployments_deployment_kind",
        "platform_deployments",
        "deployment_kind IN ("
        "'template_publish', 'company_update', 'provision_baseline', 'rollback', 'dev_deploy'"
        ")",
    )


def downgrade() -> None:
    op.drop_constraint("ck_platform_deployments_deployment_kind", "platform_deployments", type_="check")
    op.drop_index("ix_platform_deployments_deployment_kind", table_name="platform_deployments")
    op.drop_column("platform_deployments", "deployment_kind")
