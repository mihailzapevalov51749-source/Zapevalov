"""create designer publish tables

Revision ID: 20250525_0005
Revises: 20250525_0004
Create Date: 2025-05-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250525_0005"
down_revision: Union[str, None] = "20250525_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "designer_metadata_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("catalog_version", sa.Integer(), nullable=False),
        sa.Column(
            "schema_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column("published_by", sa.Integer(), nullable=True),
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "designer_publish_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("catalog_version", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "summary_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "error_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("published_by", sa.Integer(), nullable=True),
        sa.Column(
            "published_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["snapshot_id"],
            ["designer_metadata_snapshots.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["portals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "uq_designer_metadata_snapshots_tenant_catalog_version",
        "designer_metadata_snapshots",
        ["tenant_id", "catalog_version"],
        unique=True,
    )
    op.create_index(
        "ix_designer_metadata_snapshots_tenant_catalog_version_desc",
        "designer_metadata_snapshots",
        ["tenant_id", "catalog_version"],
        unique=False,
    )
    op.create_index(
        "ix_designer_metadata_snapshots_tenant_published_at_desc",
        "designer_metadata_snapshots",
        ["tenant_id", "published_at"],
        unique=False,
    )
    op.create_index(
        "ix_designer_publish_records_tenant_published_at_desc",
        "designer_publish_records",
        ["tenant_id", "published_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_designer_publish_records_tenant_published_at_desc",
        table_name="designer_publish_records",
    )
    op.drop_index(
        "ix_designer_metadata_snapshots_tenant_published_at_desc",
        table_name="designer_metadata_snapshots",
    )
    op.drop_index(
        "ix_designer_metadata_snapshots_tenant_catalog_version_desc",
        table_name="designer_metadata_snapshots",
    )
    op.drop_index(
        "uq_designer_metadata_snapshots_tenant_catalog_version",
        table_name="designer_metadata_snapshots",
    )
    op.drop_table("designer_publish_records")
    op.drop_table("designer_metadata_snapshots")
