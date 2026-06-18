"""Create platform release package registry table.

Revision ID: 20260616_0071
Revises: 20260616_0070
Create Date: 2026-06-16
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260616_0071"
down_revision: Union[str, None] = "20260616_0070"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_release_packages" not in table_names:
        op.create_table(
            "platform_release_packages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("package_key", sa.String(length=32), nullable=False),
            sa.Column("platform_version", sa.String(length=40), nullable=False),
            sa.Column("build_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
            sa.Column(
                "package_manifest_json",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column(
                "module_bom_json",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("release_notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("ready_at", sa.DateTime(), nullable=True),
            sa.Column("published_at", sa.DateTime(), nullable=True),
            sa.Column("deprecated_at", sa.DateTime(), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("cancelled_by", sa.Integer(), nullable=True),
            sa.Column("cancellation_reason", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["build_id"], ["platform_code_builds.id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["cancelled_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("package_key", name="uq_platform_release_packages_package_key"),
            sa.UniqueConstraint("platform_version", name="uq_platform_release_packages_platform_version"),
            sa.CheckConstraint(
                "status IN ('draft','ready','published','deprecated','cancelled')",
                name="ck_platform_release_packages_status",
            ),
        )
        op.create_index("ix_platform_release_packages_id", "platform_release_packages", ["id"])
        op.create_index("ix_platform_release_packages_package_key", "platform_release_packages", ["package_key"])
        op.create_index(
            "ix_platform_release_packages_platform_version",
            "platform_release_packages",
            ["platform_version"],
        )
        op.create_index("ix_platform_release_packages_build_id", "platform_release_packages", ["build_id"])
        op.create_index("ix_platform_release_packages_status", "platform_release_packages", ["status"])
        op.create_index("ix_platform_release_packages_created_at", "platform_release_packages", ["created_at"])
        op.create_index("ix_platform_release_packages_created_by", "platform_release_packages", ["created_by"])
        op.create_index(
            "ix_platform_release_packages_cancelled_by",
            "platform_release_packages",
            ["cancelled_by"],
        )


def downgrade() -> None:
    op.drop_index("ix_platform_release_packages_cancelled_by", table_name="platform_release_packages")
    op.drop_index("ix_platform_release_packages_created_by", table_name="platform_release_packages")
    op.drop_index("ix_platform_release_packages_created_at", table_name="platform_release_packages")
    op.drop_index("ix_platform_release_packages_status", table_name="platform_release_packages")
    op.drop_index("ix_platform_release_packages_build_id", table_name="platform_release_packages")
    op.drop_index("ix_platform_release_packages_platform_version", table_name="platform_release_packages")
    op.drop_index("ix_platform_release_packages_package_key", table_name="platform_release_packages")
    op.drop_index("ix_platform_release_packages_id", table_name="platform_release_packages")
    op.drop_table("platform_release_packages")

