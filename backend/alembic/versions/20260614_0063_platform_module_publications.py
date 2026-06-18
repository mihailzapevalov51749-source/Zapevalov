"""Create platform_module_publications and link offers to publications.

Revision ID: 20260614_0063
Revises: 20260614_0062
Create Date: 2026-06-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "20260614_0063"
down_revision: Union[str, None] = "20260614_0062"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_module_publications" not in table_names:
        op.create_table(
            "platform_module_publications",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("source_tenant_id", sa.Integer(), nullable=False),
            sa.Column("target_tenant_id", sa.Integer(), nullable=False),
            sa.Column("from_module_version", sa.String(length=32), nullable=False),
            sa.Column("to_module_version", sa.String(length=32), nullable=False),
            sa.Column("from_config_version", sa.String(length=32), nullable=False),
            sa.Column("to_config_version", sa.String(length=32), nullable=False),
            sa.Column("manifest_version", sa.String(length=32), nullable=True),
            sa.Column("publication_status", sa.String(length=32), nullable=False, server_default="draft"),
            sa.Column("publication_type", sa.String(length=64), nullable=False, server_default="module_configuration"),
            sa.Column("release_summary", sa.Text(), nullable=True),
            sa.Column("snapshot_payload", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
            sa.Column("risk_level", sa.String(length=32), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("reviewed_by", sa.Integer(), nullable=True),
            sa.Column("approved_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("review_started_at", sa.DateTime(), nullable=True),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column("published_at", sa.DateTime(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["module_key"], ["platform_modules.module_key"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["source_tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["target_tenant_id"], ["portals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["approved_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_platform_module_publications_id", "platform_module_publications", ["id"])
        op.create_index(
            "ix_platform_module_publications_module_key",
            "platform_module_publications",
            ["module_key"],
        )
        op.create_index(
            "ix_platform_module_publications_source_tenant_id",
            "platform_module_publications",
            ["source_tenant_id"],
        )
        op.create_index(
            "ix_platform_module_publications_target_tenant_id",
            "platform_module_publications",
            ["target_tenant_id"],
        )
        op.create_index(
            "ix_platform_module_publications_publication_status",
            "platform_module_publications",
            ["publication_status"],
        )

    offer_columns = {column["name"] for column in inspector.get_columns("tenant_module_update_offers")}
    if "publication_id" not in offer_columns:
        op.add_column(
            "tenant_module_update_offers",
            sa.Column("publication_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_tenant_module_update_offers_publication_id",
            "tenant_module_update_offers",
            "platform_module_publications",
            ["publication_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index(
            "ix_tenant_module_update_offers_publication_id",
            "tenant_module_update_offers",
            ["publication_id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "tenant_module_update_offers" in table_names:
        offer_columns = {column["name"] for column in inspector.get_columns("tenant_module_update_offers")}
        if "publication_id" in offer_columns:
            op.drop_index(
                "ix_tenant_module_update_offers_publication_id",
                table_name="tenant_module_update_offers",
            )
            op.drop_constraint(
                "fk_tenant_module_update_offers_publication_id",
                "tenant_module_update_offers",
                type_="foreignkey",
            )
            op.drop_column("tenant_module_update_offers", "publication_id")

    if "platform_module_publications" in table_names:
        op.drop_index(
            "ix_platform_module_publications_publication_status",
            table_name="platform_module_publications",
        )
        op.drop_index(
            "ix_platform_module_publications_target_tenant_id",
            table_name="platform_module_publications",
        )
        op.drop_index(
            "ix_platform_module_publications_source_tenant_id",
            table_name="platform_module_publications",
        )
        op.drop_index(
            "ix_platform_module_publications_module_key",
            table_name="platform_module_publications",
        )
        op.drop_index("ix_platform_module_publications_id", table_name="platform_module_publications")
        op.drop_table("platform_module_publications")
