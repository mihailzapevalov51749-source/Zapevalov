"""portal tenant environment fields

Revision ID: 20260610_0030
Revises: 20260610_0029
Create Date: 2026-06-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0030"
down_revision: Union[str, None] = "20260610_0029"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "portals",
        sa.Column("tenant_type", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "portals",
        sa.Column(
            "template_version",
            sa.String(length=32),
            nullable=False,
            server_default="1.0.0",
        ),
    )
    op.add_column(
        "portals",
        sa.Column(
            "tenant_status",
            sa.String(length=32),
            nullable=False,
            server_default="ACTIVE",
        ),
    )
    op.add_column(
        "portals",
        sa.Column("source_tenant_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "portals",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_foreign_key(
        "fk_portals_source_tenant_id",
        "portals",
        "portals",
        ["source_tenant_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_portals_tenant_type", "portals", ["tenant_type"], unique=False)

    op.execute(
        """
        UPDATE portals
        SET tenant_type = 'DEV',
            template_version = COALESCE(template_version, '1.0.0'),
            tenant_status = COALESCE(tenant_status, 'ACTIVE')
        WHERE id = 1
        """
    )
    op.execute(
        """
        UPDATE portals
        SET tenant_type = 'TEMPLATE',
            template_version = COALESCE(template_version, '1.0.0'),
            tenant_status = COALESCE(tenant_status, 'ACTIVE')
        WHERE id = 2
        """
    )
    op.execute(
        """
        UPDATE portals
        SET tenant_type = 'DEMO',
            template_version = COALESCE(template_version, '1.0.0'),
            tenant_status = COALESCE(tenant_status, 'ACTIVE')
        WHERE id = 3
        """
    )
    op.execute(
        """
        UPDATE portals
        SET tenant_type = 'LEGACY_TEMPLATE',
            template_version = COALESCE(template_version, '1.0.0'),
            tenant_status = COALESCE(tenant_status, 'ACTIVE')
        WHERE id = 13
        """
    )
    op.execute(
        """
        UPDATE portals
        SET tenant_type = 'CLIENT',
            template_version = COALESCE(template_version, '1.0.0'),
            tenant_status = COALESCE(tenant_status, 'ACTIVE')
        WHERE tenant_type IS NULL
        """
    )

    op.alter_column("portals", "tenant_type", nullable=False, server_default="CLIENT")


def downgrade() -> None:
    op.drop_index("ix_portals_tenant_type", table_name="portals")
    op.drop_constraint("fk_portals_source_tenant_id", "portals", type_="foreignkey")
    op.drop_column("portals", "notes")
    op.drop_column("portals", "source_tenant_id")
    op.drop_column("portals", "tenant_status")
    op.drop_column("portals", "template_version")
    op.drop_column("portals", "tenant_type")
