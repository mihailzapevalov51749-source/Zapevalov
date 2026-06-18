"""Create platform environment version registry tables.

Revision ID: 20260615_0068
Revises: 20260615_0067
Create Date: 2026-06-15
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260615_0068"
down_revision: Union[str, None] = "20260615_0067"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_environment_versions" not in table_names:
        op.create_table(
            "platform_environment_versions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("environment_key", sa.String(length=32), nullable=False),
            sa.Column("platform_version", sa.String(length=40), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
            sa.Column("installed_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("installed_by_id", sa.Integer(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("change_description", sa.Text(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["installed_by_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("tenant_id"),
        )
        op.create_index(
            "ix_platform_environment_versions_id",
            "platform_environment_versions",
            ["id"],
        )
        op.create_index(
            "ix_platform_environment_versions_tenant_id",
            "platform_environment_versions",
            ["tenant_id"],
        )
        op.create_index(
            "ix_platform_environment_versions_environment_key",
            "platform_environment_versions",
            ["environment_key"],
        )
        op.create_index(
            "ix_platform_environment_versions_status",
            "platform_environment_versions",
            ["status"],
        )
        op.create_index(
            "ix_platform_environment_versions_installed_by_id",
            "platform_environment_versions",
            ["installed_by_id"],
        )

    if "platform_version_history" not in table_names:
        op.create_table(
            "platform_version_history",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("environment_key", sa.String(length=32), nullable=False),
            sa.Column("platform_version", sa.String(length=40), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("installed_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("installed_by_id", sa.Integer(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("change_description", sa.Text(), nullable=True),
            sa.Column("recorded_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("superseded_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["installed_by_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_platform_version_history_id", "platform_version_history", ["id"])
        op.create_index(
            "ix_platform_version_history_tenant_id",
            "platform_version_history",
            ["tenant_id"],
        )
        op.create_index(
            "ix_platform_version_history_environment_key",
            "platform_version_history",
            ["environment_key"],
        )
        op.create_index(
            "ix_platform_version_history_status",
            "platform_version_history",
            ["status"],
        )
        op.create_index(
            "ix_platform_version_history_recorded_at",
            "platform_version_history",
            ["recorded_at"],
        )
        op.create_index(
            "ix_platform_version_history_installed_by_id",
            "platform_version_history",
            ["installed_by_id"],
        )

    from sqlalchemy.orm import Session

    from app.modules.platform_version_registry.seed import seed_platform_version_registry

    session = Session(bind=bind)
    try:
        seed_platform_version_registry(session, commit=True)
    finally:
        session.close()


def downgrade() -> None:
    op.drop_index("ix_platform_version_history_installed_by_id", table_name="platform_version_history")
    op.drop_index("ix_platform_version_history_recorded_at", table_name="platform_version_history")
    op.drop_index("ix_platform_version_history_status", table_name="platform_version_history")
    op.drop_index("ix_platform_version_history_environment_key", table_name="platform_version_history")
    op.drop_index("ix_platform_version_history_tenant_id", table_name="platform_version_history")
    op.drop_index("ix_platform_version_history_id", table_name="platform_version_history")
    op.drop_table("platform_version_history")

    op.drop_index("ix_platform_environment_versions_installed_by_id", table_name="platform_environment_versions")
    op.drop_index("ix_platform_environment_versions_status", table_name="platform_environment_versions")
    op.drop_index("ix_platform_environment_versions_environment_key", table_name="platform_environment_versions")
    op.drop_index("ix_platform_environment_versions_tenant_id", table_name="platform_environment_versions")
    op.drop_index("ix_platform_environment_versions_id", table_name="platform_environment_versions")
    op.drop_table("platform_environment_versions")
