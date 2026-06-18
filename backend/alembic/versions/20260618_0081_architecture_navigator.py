"""architecture navigator tables

Revision ID: 20260618_0081
Revises: 20260617_0080
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260618_0081"
down_revision = "20260617_0080"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "architecture_components",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("component_key", sa.String(length=128), nullable=False),
        sa.Column("technical_name", sa.String(length=255), nullable=False),
        sa.Column("component_type", sa.String(length=64), nullable=False),
        sa.Column("category_key", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column("parent_key", sa.String(length=128), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "catalog_sources",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("component_key", name="uq_architecture_components_component_key"),
    )
    op.create_index("ix_architecture_components_component_key", "architecture_components", ["component_key"])
    op.create_index("ix_architecture_components_component_type", "architecture_components", ["component_type"])
    op.create_index("ix_architecture_components_category_key", "architecture_components", ["category_key"])
    op.create_index("ix_architecture_components_parent_key", "architecture_components", ["parent_key"])

    op.create_table(
        "architecture_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("from_component_key", sa.String(length=128), nullable=False),
        sa.Column("to_component_key", sa.String(length=128), nullable=False),
        sa.Column("link_type", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "from_component_key",
            "to_component_key",
            "link_type",
            name="uq_architecture_links_from_to_type",
        ),
    )
    op.create_index("ix_architecture_links_from_component_key", "architecture_links", ["from_component_key"])
    op.create_index("ix_architecture_links_to_component_key", "architecture_links", ["to_component_key"])
    op.create_index("ix_architecture_links_link_type", "architecture_links", ["link_type"])

    op.create_table(
        "architecture_scans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scanner_version", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="completed"),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column(
            "summary_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("triggered_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["triggered_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_architecture_scans_status", "architecture_scans", ["status"])
    op.create_index("ix_architecture_scans_started_at", "architecture_scans", ["started_at"])

    op.create_table(
        "architecture_findings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scan_id", sa.Integer(), nullable=False),
        sa.Column("component_key", sa.String(length=128), nullable=True),
        sa.Column("finding_kind", sa.String(length=32), nullable=False),
        sa.Column("source_kind", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=512), nullable=False),
        sa.Column("value", sa.String(length=512), nullable=True),
        sa.Column(
            "details_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["scan_id"], ["architecture_scans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_architecture_findings_scan_id", "architecture_findings", ["scan_id"])
    op.create_index("ix_architecture_findings_component_key", "architecture_findings", ["component_key"])
    op.create_index("ix_architecture_findings_finding_kind", "architecture_findings", ["finding_kind"])
    op.create_index("ix_architecture_findings_source_kind", "architecture_findings", ["source_kind"])


def downgrade() -> None:
    op.drop_index("ix_architecture_findings_source_kind", table_name="architecture_findings")
    op.drop_index("ix_architecture_findings_finding_kind", table_name="architecture_findings")
    op.drop_index("ix_architecture_findings_component_key", table_name="architecture_findings")
    op.drop_index("ix_architecture_findings_scan_id", table_name="architecture_findings")
    op.drop_table("architecture_findings")

    op.drop_index("ix_architecture_scans_started_at", table_name="architecture_scans")
    op.drop_index("ix_architecture_scans_status", table_name="architecture_scans")
    op.drop_table("architecture_scans")

    op.drop_index("ix_architecture_links_link_type", table_name="architecture_links")
    op.drop_index("ix_architecture_links_to_component_key", table_name="architecture_links")
    op.drop_index("ix_architecture_links_from_component_key", table_name="architecture_links")
    op.drop_table("architecture_links")

    op.drop_index("ix_architecture_components_parent_key", table_name="architecture_components")
    op.drop_index("ix_architecture_components_category_key", table_name="architecture_components")
    op.drop_index("ix_architecture_components_component_type", table_name="architecture_components")
    op.drop_index("ix_architecture_components_component_key", table_name="architecture_components")
    op.drop_table("architecture_components")
