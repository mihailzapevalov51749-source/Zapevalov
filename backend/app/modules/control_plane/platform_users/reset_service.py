from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalSource,
    PlatformEventJournalStatus,
    PlatformEventJournalType,
)
from app.modules.platform_event_journal.service import record_platform_event_journal_entry
from app.modules.users.bootstrap_owner_service import ensure_bootstrap_owner, is_bootstrap_owner
from app.modules.users.models import Role, User

PLATFORM_USERS_RESET_JOURNAL_SLUG = "platform-users-reset"


@dataclass(frozen=True)
class DeletedPlatformUserSnapshot:
    id: int
    email: str
    full_name: str | None
    role_name: str | None
    is_active: bool


@dataclass(frozen=True)
class ResetPlatformUsersResult:
    deleted_users: list[DeletedPlatformUserSnapshot]
    roles_preserved: list[str]
    owner_fields_cleared: bool
    journal_entry_created: bool


def _clear_platform_owner_fields(db: Session, row: PlatformSettings) -> None:
    row.platform_owner_user_id = None
    row.platform_owner_full_name = None
    row.platform_owner_email = None
    row.platform_owner_phone = None
    row.platform_owner_avatar_url = None
    row.platform_owner_avatar_settings = None
    row.updated_at = utc_now()
    db.flush()


def _detach_user_foreign_keys(db: Session) -> None:
    """Nullify or remove rows that block deleting all platform users."""
    nullable_user_fk_updates = (
        "UPDATE notifications SET created_by_id = NULL WHERE created_by_id IS NOT NULL",
        "UPDATE platform_event_journal_entries SET author_user_id = NULL WHERE author_user_id IS NOT NULL",
        "UPDATE navigation_items SET deleted_by = NULL WHERE deleted_by IS NOT NULL",
        "UPDATE pages SET deleted_by = NULL WHERE deleted_by IS NOT NULL",
        "UPDATE designer_workspaces SET deleted_by = NULL WHERE deleted_by IS NOT NULL",
        "UPDATE designer_workspace_tabs SET deleted_by = NULL WHERE deleted_by IS NOT NULL",
        "UPDATE designer_object_types SET deleted_by = NULL WHERE deleted_by IS NOT NULL",
        "UPDATE designer_field_definitions SET deleted_by = NULL WHERE deleted_by IS NOT NULL",
        "UPDATE designer_relation_definitions SET deleted_by = NULL WHERE deleted_by IS NOT NULL",
        "UPDATE designer_view_definitions SET deleted_by = NULL WHERE deleted_by IS NOT NULL",
        "UPDATE runtime_entities SET created_by = NULL WHERE created_by IS NOT NULL",
        "UPDATE runtime_entities SET updated_by = NULL WHERE updated_by IS NOT NULL",
        "UPDATE runtime_relation_instances SET created_by = NULL WHERE created_by IS NOT NULL",
        "UPDATE runtime_relation_instances SET updated_by = NULL WHERE updated_by IS NOT NULL",
        "UPDATE comments SET author_user_id = NULL WHERE author_user_id IS NOT NULL",
        "UPDATE comments SET pinned_by_user_id = NULL WHERE pinned_by_user_id IS NOT NULL",
        "UPDATE comments SET edited_by_user_id = NULL WHERE edited_by_user_id IS NOT NULL",
        "UPDATE comments SET deleted_by_user_id = NULL WHERE deleted_by_user_id IS NOT NULL",
        "UPDATE comment_attachments SET uploaded_by_user_id = NULL WHERE uploaded_by_user_id IS NOT NULL",
        "UPDATE customer_companies SET sales_owner_id = NULL WHERE sales_owner_id IS NOT NULL",
        "UPDATE customer_companies SET support_owner_id = NULL WHERE support_owner_id IS NOT NULL",
        "UPDATE tasks SET assignee_id = NULL WHERE assignee_id IS NOT NULL",
    )

    blocking_deletes = (
        "DELETE FROM comment_reactions",
        "DELETE FROM comment_mentions",
        "DELETE FROM chat_message_reactions",
        "DELETE FROM chat_message_mentions",
        "DELETE FROM chat_message_attachments",
        "DELETE FROM chat_messages",
        "DELETE FROM chat_participants",
        "DELETE FROM chats",
        "DELETE FROM tasks",
    )

    for statement in (*nullable_user_fk_updates, *blocking_deletes):
        try:
            with db.begin_nested():
                db.execute(text(statement))
        except (OperationalError, ProgrammingError):
            pass

    db.flush()


def reset_platform_users(db: Session, *, commit: bool = False) -> ResetPlatformUsersResult:
    users = (
        db.query(User)
        .outerjoin(Role, User.role_id == Role.id)
        .order_by(User.id.asc())
        .all()
    )

    role_names = [role.name for role in db.query(Role).order_by(Role.id.asc()).all()]

    deleted_users: list[DeletedPlatformUserSnapshot] = []
    for user in users:
        if is_bootstrap_owner(user):
            continue
        deleted_users.append(
            DeletedPlatformUserSnapshot(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role_name=user.role.name if user.role else None,
                is_active=bool(user.is_active),
            )
        )

    row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if row is None:
        raise RuntimeError("platform_settings singleton row is missing")

    _clear_platform_owner_fields(db, row)
    _detach_user_foreign_keys(db)

    for user in users:
        if is_bootstrap_owner(user):
            continue
        db.delete(user)

    db.flush()
    ensure_bootstrap_owner(db, commit=False)

    journal_entry = record_platform_event_journal_entry(
        db,
        title="Выполнен сброс платформенных пользователей",
        description=(
            "Удалены тестовые пользователи платформы. Источником создания Platform Owner "
            "стала вкладка Профиль платформы → Владелец платформы."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
        source=PlatformEventJournalSource.MANUAL.value,
        author="Cursor",
        slug=PLATFORM_USERS_RESET_JOURNAL_SLUG,
        commit=False,
    )

    if commit:
        db.commit()

    return ResetPlatformUsersResult(
        deleted_users=deleted_users,
        roles_preserved=role_names,
        owner_fields_cleared=True,
        journal_entry_created=journal_entry is not None,
    )
