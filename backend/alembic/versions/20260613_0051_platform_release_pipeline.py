"""Create platform release pipeline tables.

Revision ID: 20260613_0051
Revises: 20260613_0050
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_0051"
down_revision: Union[str, None] = "20260613_0050"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "platform_releases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="draft"),
        sa.Column("source_tenant_id", sa.Integer(), nullable=False),
        sa.Column("target_template_tenant_id", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["source_tenant_id"], ["portals.id"]),
        sa.ForeignKeyConstraint(["target_template_tenant_id"], ["portals.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version"),
    )
    op.create_index("ix_platform_releases_id", "platform_releases", ["id"])
    op.create_index("ix_platform_releases_version", "platform_releases", ["version"])
    op.create_index("ix_platform_releases_status", "platform_releases", ["status"])
    op.create_index("ix_platform_releases_source_tenant_id", "platform_releases", ["source_tenant_id"])
    op.create_index(
        "ix_platform_releases_target_template_tenant_id",
        "platform_releases",
        ["target_template_tenant_id"],
    )
    op.create_index("ix_platform_releases_created_by", "platform_releases", ["created_by"])

    op.create_table(
        "release_changes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("release_id", sa.Integer(), nullable=False),
        sa.Column("change_type", sa.String(length=40), nullable=False, server_default="other"),
        sa.Column("entity_type", sa.String(length=80), nullable=True),
        sa.Column("entity_id", sa.String(length=80), nullable=True),
        sa.Column("system_key", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("risk_level", sa.String(length=20), nullable=False, server_default="low"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["release_id"], ["platform_releases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_release_changes_id", "release_changes", ["id"])
    op.create_index("ix_release_changes_release_id", "release_changes", ["release_id"])

    op.create_table(
        "tenant_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("current_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id"),
    )
    op.create_index("ix_tenant_versions_id", "tenant_versions", ["id"])
    op.create_index("ix_tenant_versions_tenant_id", "tenant_versions", ["tenant_id"])

    op.create_table(
        "tenant_update_offers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("release_id", sa.Integer(), nullable=False),
        sa.Column("from_version", sa.String(length=32), nullable=False),
        sa.Column("to_version", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="available"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("applied_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["release_id"], ["platform_releases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tenant_update_offers_id", "tenant_update_offers", ["id"])
    op.create_index("ix_tenant_update_offers_tenant_id", "tenant_update_offers", ["tenant_id"])
    op.create_index("ix_tenant_update_offers_release_id", "tenant_update_offers", ["release_id"])
    op.create_index("ix_tenant_update_offers_status", "tenant_update_offers", ["status"])


def downgrade() -> None:
    op.drop_index("ix_tenant_update_offers_status", table_name="tenant_update_offers")
    op.drop_index("ix_tenant_update_offers_release_id", table_name="tenant_update_offers")
    op.drop_index("ix_tenant_update_offers_tenant_id", table_name="tenant_update_offers")
    op.drop_index("ix_tenant_update_offers_id", table_name="tenant_update_offers")
    op.drop_table("tenant_update_offers")

    op.drop_index("ix_tenant_versions_tenant_id", table_name="tenant_versions")
    op.drop_index("ix_tenant_versions_id", table_name="tenant_versions")
    op.drop_table("tenant_versions")

    op.drop_index("ix_release_changes_release_id", table_name="release_changes")
    op.drop_index("ix_release_changes_id", table_name="release_changes")
    op.drop_table("release_changes")

    op.drop_index("ix_platform_releases_created_by", table_name="platform_releases")
    op.drop_index("ix_platform_releases_target_template_tenant_id", table_name="platform_releases")
    op.drop_index("ix_platform_releases_source_tenant_id", table_name="platform_releases")
    op.drop_index("ix_platform_releases_status", table_name="platform_releases")
    op.drop_index("ix_platform_releases_version", table_name="platform_releases")
    op.drop_index("ix_platform_releases_id", table_name="platform_releases")
    op.drop_table("platform_releases")
