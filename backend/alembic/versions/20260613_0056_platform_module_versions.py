"""Create platform module versions registry and release-module links.

Revision ID: 20260613_0056
Revises: 20260613_0055
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260613_0056"
down_revision: Union[str, None] = "20260613_0055"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_module_versions" not in table_names:
        op.create_table(
            "platform_module_versions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("version", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=40), nullable=False, server_default="released"),
            sa.Column("release_id", sa.Integer(), nullable=True),
            sa.Column("release_date", sa.DateTime(), nullable=True),
            sa.Column("change_log", sa.Text(), nullable=True),
            sa.Column("breaking_changes", sa.Text(), nullable=True),
            sa.Column("manifest_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["module_key"], ["platform_modules.module_key"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["release_id"], ["platform_releases.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "module_key",
                "version",
                name="uq_platform_module_versions_key_version",
            ),
        )
        op.create_index("ix_platform_module_versions_id", "platform_module_versions", ["id"])
        op.create_index("ix_platform_module_versions_module_key", "platform_module_versions", ["module_key"])
        op.create_index("ix_platform_module_versions_status", "platform_module_versions", ["status"])
        op.create_index("ix_platform_module_versions_release_id", "platform_module_versions", ["release_id"])

    if "platform_release_modules" not in table_names:
        op.create_table(
            "platform_release_modules",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("release_id", sa.Integer(), nullable=False),
            sa.Column("module_key", sa.String(length=120), nullable=False),
            sa.Column("from_version", sa.String(length=32), nullable=False),
            sa.Column("to_version", sa.String(length=32), nullable=False),
            sa.Column("change_summary", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["release_id"], ["platform_releases.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["module_key"], ["platform_modules.module_key"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_platform_release_modules_id", "platform_release_modules", ["id"])
        op.create_index("ix_platform_release_modules_release_id", "platform_release_modules", ["release_id"])
        op.create_index("ix_platform_release_modules_module_key", "platform_release_modules", ["module_key"])

    from app.db.session import SessionLocal
    from app.modules.platform_modules.version_seed import seed_platform_module_versions

    db = SessionLocal()
    try:
        seed_platform_module_versions(db, commit=True)
    finally:
        db.close()


def downgrade() -> None:
    op.drop_index("ix_platform_release_modules_module_key", table_name="platform_release_modules")
    op.drop_index("ix_platform_release_modules_release_id", table_name="platform_release_modules")
    op.drop_index("ix_platform_release_modules_id", table_name="platform_release_modules")
    op.drop_table("platform_release_modules")

    op.drop_index("ix_platform_module_versions_release_id", table_name="platform_module_versions")
    op.drop_index("ix_platform_module_versions_status", table_name="platform_module_versions")
    op.drop_index("ix_platform_module_versions_module_key", table_name="platform_module_versions")
    op.drop_index("ix_platform_module_versions_id", table_name="platform_module_versions")
    op.drop_table("platform_module_versions")
