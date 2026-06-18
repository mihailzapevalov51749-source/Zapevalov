"""Create platform code build registry table.

Revision ID: 20260616_0070
Revises: 20260615_0069
Create Date: 2026-06-16
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260616_0070"
down_revision: Union[str, None] = "20260615_0069"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = set(inspector.get_table_names())

    if "platform_code_builds" not in table_names:
        op.create_table(
            "platform_code_builds",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("build_key", sa.String(length=32), nullable=False),
            sa.Column("commit_sha", sa.String(length=40), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
            sa.Column("backend_digest", sa.String(length=255), nullable=True),
            sa.Column("frontend_digest", sa.String(length=255), nullable=True),
            sa.Column("schema_revision", sa.String(length=64), nullable=True),
            sa.Column(
                "build_manifest_json",
                postgresql.JSONB(astext_type=sa.Text()),
                nullable=False,
                server_default=sa.text("'{}'::jsonb"),
            ),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("failure_reason", sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("build_key", name="uq_platform_code_builds_build_key"),
        )
        op.create_index("ix_platform_code_builds_id", "platform_code_builds", ["id"])
        op.create_index("ix_platform_code_builds_build_key", "platform_code_builds", ["build_key"])
        op.create_index("ix_platform_code_builds_commit_sha", "platform_code_builds", ["commit_sha"])
        op.create_index("ix_platform_code_builds_status", "platform_code_builds", ["status"])
        op.create_index("ix_platform_code_builds_schema_revision", "platform_code_builds", ["schema_revision"])
        op.create_index("ix_platform_code_builds_created_at", "platform_code_builds", ["created_at"])
        op.create_index("ix_platform_code_builds_created_by", "platform_code_builds", ["created_by"])


def downgrade() -> None:
    op.drop_index("ix_platform_code_builds_created_by", table_name="platform_code_builds")
    op.drop_index("ix_platform_code_builds_created_at", table_name="platform_code_builds")
    op.drop_index("ix_platform_code_builds_schema_revision", table_name="platform_code_builds")
    op.drop_index("ix_platform_code_builds_status", table_name="platform_code_builds")
    op.drop_index("ix_platform_code_builds_commit_sha", table_name="platform_code_builds")
    op.drop_index("ix_platform_code_builds_build_key", table_name="platform_code_builds")
    op.drop_index("ix_platform_code_builds_id", table_name="platform_code_builds")
    op.drop_table("platform_code_builds")
