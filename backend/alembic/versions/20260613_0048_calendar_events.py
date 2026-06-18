"""Create calendar_events tables.

Revision ID: 20260613_0048
Revises: 20260613_0047
Create Date: 2026-06-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.orm import Session

revision: str = "20260613_0048"
down_revision: Union[str, None] = "20260613_0047"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "calendar_events" not in existing_tables:
        op.create_table(
            "calendar_events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("event_type", sa.String(length=64), nullable=False),
            sa.Column("start_at", sa.DateTime(), nullable=False),
            sa.Column("end_at", sa.DateTime(), nullable=False),
            sa.Column("location", sa.String(length=255), nullable=True),
            sa.Column("meeting_url", sa.String(length=512), nullable=True),
            sa.Column("chat_id", sa.Integer(), nullable=True),
            sa.Column("created_by_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["chat_id"], ["chats.id"]),
            sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_calendar_events_id", "calendar_events", ["id"], unique=False)
        op.create_index("ix_calendar_events_tenant_id", "calendar_events", ["tenant_id"], unique=False)
        op.create_index("ix_calendar_events_event_type", "calendar_events", ["event_type"], unique=False)
        op.create_index("ix_calendar_events_start_at", "calendar_events", ["start_at"], unique=False)
        op.create_index("ix_calendar_events_end_at", "calendar_events", ["end_at"], unique=False)
        op.create_index("ix_calendar_events_chat_id", "calendar_events", ["chat_id"], unique=False)
        op.create_index(
            "ix_calendar_events_created_by_id",
            "calendar_events",
            ["created_by_id"],
            unique=False,
        )
        op.create_index("ix_calendar_events_status", "calendar_events", ["status"], unique=False)

    if "calendar_event_participants" not in existing_tables:
        op.create_table(
            "calendar_event_participants",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("event_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["event_id"], ["calendar_events.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_calendar_event_participants_id",
            "calendar_event_participants",
            ["id"],
            unique=False,
        )
        op.create_index(
            "ix_calendar_event_participants_event_id",
            "calendar_event_participants",
            ["event_id"],
            unique=False,
        )
        op.create_index(
            "ix_calendar_event_participants_user_id",
            "calendar_event_participants",
            ["user_id"],
            unique=False,
        )

    session = Session(bind=bind)
    try:
        from app.modules.navigation.models import NavigationItem  # noqa: F401
        from app.modules.pages.models import Page  # noqa: F401
        from app.modules.portals.models import Portal  # noqa: F401
        from app.modules.users.models import User  # noqa: F401
        from app.modules.calendar.navigation_seed import backfill_runtime_calendar_navigation
        from app.modules.navigation.runtime_protected_pages import (
            backfill_runtime_protected_navigation,
        )

        backfill_runtime_calendar_navigation(session)
        backfill_runtime_protected_navigation(session)
        session.commit()
    finally:
        session.close()


def downgrade() -> None:
    op.drop_index("ix_calendar_event_participants_user_id", table_name="calendar_event_participants")
    op.drop_index("ix_calendar_event_participants_event_id", table_name="calendar_event_participants")
    op.drop_index("ix_calendar_event_participants_id", table_name="calendar_event_participants")
    op.drop_table("calendar_event_participants")

    op.drop_index("ix_calendar_events_status", table_name="calendar_events")
    op.drop_index("ix_calendar_events_created_by_id", table_name="calendar_events")
    op.drop_index("ix_calendar_events_chat_id", table_name="calendar_events")
    op.drop_index("ix_calendar_events_end_at", table_name="calendar_events")
    op.drop_index("ix_calendar_events_start_at", table_name="calendar_events")
    op.drop_index("ix_calendar_events_event_type", table_name="calendar_events")
    op.drop_index("ix_calendar_events_tenant_id", table_name="calendar_events")
    op.drop_index("ix_calendar_events_id", table_name="calendar_events")
    op.drop_table("calendar_events")
