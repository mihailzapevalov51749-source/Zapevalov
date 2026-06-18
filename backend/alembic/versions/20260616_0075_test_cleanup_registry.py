"""test cleanup registry tables

Revision ID: 20260616_0075
Revises: 20260616_0074
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260616_0075"
down_revision = "20260616_0074"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "test_cleanup_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("run_key", sa.String(length=512), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="running"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_test_cleanup_runs_run_key", "test_cleanup_runs", ["run_key"])

    op.create_table(
        "test_cleanup_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("table_name", sa.String(length=128), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("entity_key", sa.String(length=255), nullable=True),
        sa.Column("delete_order", sa.Integer(), nullable=False, server_default="999"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delete_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("delete_error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["test_cleanup_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_test_cleanup_records_run_id", "test_cleanup_records", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_test_cleanup_records_run_id", table_name="test_cleanup_records")
    op.drop_table("test_cleanup_records")
    op.drop_index("ix_test_cleanup_runs_run_key", table_name="test_cleanup_runs")
    op.drop_table("test_cleanup_runs")
