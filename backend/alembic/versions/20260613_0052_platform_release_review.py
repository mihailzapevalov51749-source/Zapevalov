"""Add platform release review fields and migrate ready status.

Revision ID: 20260613_0052
Revises: 20260613_0051
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260613_0052"
down_revision: Union[str, None] = "20260613_0051"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "platform_releases",
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("submitted_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("review_started_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("review_started_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("review_comment", sa.Text(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("approved_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("approved_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("changes_requested_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("changes_requested_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "platform_releases",
        sa.Column("published_by", sa.Integer(), nullable=True),
    )

    for col, ref_table in (
        ("submitted_by", "users"),
        ("review_started_by", "users"),
        ("approved_by", "users"),
        ("changes_requested_by", "users"),
        ("published_by", "users"),
    ):
        op.create_foreign_key(
            f"fk_platform_releases_{col}_{ref_table}",
            "platform_releases",
            ref_table,
            [col],
            ["id"],
        )

    op.execute(
        """
        UPDATE platform_releases
        SET status = 'ready_for_platform_review'
        WHERE status = 'ready'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE platform_releases
        SET status = 'ready'
        WHERE status = 'ready_for_platform_review'
        """
    )

    for col in (
        "published_by",
        "changes_requested_by",
        "approved_by",
        "review_started_by",
        "submitted_by",
    ):
        op.drop_constraint(
            f"fk_platform_releases_{col}_users",
            "platform_releases",
            type_="foreignkey",
        )

    op.drop_column("platform_releases", "published_by")
    op.drop_column("platform_releases", "changes_requested_by")
    op.drop_column("platform_releases", "approved_by")
    op.drop_column("platform_releases", "approved_at")
    op.drop_column("platform_releases", "review_comment")
    op.drop_column("platform_releases", "review_started_by")
    op.drop_column("platform_releases", "review_started_at")
    op.drop_column("platform_releases", "submitted_by")
    op.drop_column("platform_releases", "submitted_at")
