"""Create platform version schema catalog for migration rollback foundation.

Revision ID: 20260615_0069
Revises: 20260615_0068
Create Date: 2026-06-15
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260615_0069"
down_revision: Union[str, None] = "20260615_0068"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_version_schema_catalog" not in table_names:
        op.create_table(
            "platform_version_schema_catalog",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("platform_version", sa.String(length=40), nullable=False),
            sa.Column("schema_revision", sa.String(length=64), nullable=False),
            sa.Column(
                "rollback_mode_default",
                sa.String(length=32),
                nullable=False,
                server_default="backup_restore",
            ),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("platform_version", name="uq_platform_version_schema_catalog_version"),
        )
        op.create_index(
            "ix_platform_version_schema_catalog_id",
            "platform_version_schema_catalog",
            ["id"],
        )
        op.create_index(
            "ix_platform_version_schema_catalog_platform_version",
            "platform_version_schema_catalog",
            ["platform_version"],
        )
        op.create_index(
            "ix_platform_version_schema_catalog_schema_revision",
            "platform_version_schema_catalog",
            ["schema_revision"],
        )

    from sqlalchemy.orm import Session

    from app.modules.platform_migration_rollback.seed import seed_platform_version_schema_catalog

    session = Session(bind=bind)
    try:
        seed_platform_version_schema_catalog(session, commit=True)
    finally:
        session.close()


def downgrade() -> None:
    op.drop_index(
        "ix_platform_version_schema_catalog_schema_revision",
        table_name="platform_version_schema_catalog",
    )
    op.drop_index(
        "ix_platform_version_schema_catalog_platform_version",
        table_name="platform_version_schema_catalog",
    )
    op.drop_index(
        "ix_platform_version_schema_catalog_id",
        table_name="platform_version_schema_catalog",
    )
    op.drop_table("platform_version_schema_catalog")
