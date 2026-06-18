from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_data_safety.destructive_guard import (
    assert_confirmed_mutation,
    assert_platform_registry_reset_allowed,
)
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalSource,
    PlatformEventJournalStatus,
    PlatformEventJournalType,
)
from app.modules.platform_event_journal.service import record_platform_event_journal_entry
from app.modules.users.bootstrap_owner_service import is_bootstrap_owner
from app.modules.users.models import Role, User

PLATFORM_USERS_RESET_JOURNAL_SLUG = "platform-users-reset"


@dataclass(frozen=True)
class PlatformRegistryBindingSnapshot:
    user_id: int
    email: str
    full_name: str | None
    platform_role: str
    status: str


@dataclass(frozen=True)
class GlobalUserSnapshot:
    id: int
    email: str
    full_name: str | None
    is_active: bool


@dataclass(frozen=True)
class ResetPlatformUsersPlan:
    registry_bindings_to_remove: list[PlatformRegistryBindingSnapshot]
    global_users_preserved: list[GlobalUserSnapshot]
    owner_fields_to_clear: bool
    roles_preserved: list[str]


@dataclass(frozen=True)
class ResetPlatformUsersResult:
    dry_run: bool
    plan: ResetPlatformUsersPlan
    removed_registry_bindings: list[PlatformRegistryBindingSnapshot]
    owner_fields_cleared: bool
    journal_entry_created: bool


def _snapshot_global_users(db: Session) -> list[GlobalUserSnapshot]:
    users = (
        db.query(User)
        .filter(User.is_hidden_user.is_(False))
        .order_by(User.id.asc())
        .all()
    )
    return [
        GlobalUserSnapshot(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=bool(user.is_active),
        )
        for user in users
        if not is_bootstrap_owner(user)
    ]


def _snapshot_registry_bindings(db: Session) -> list[PlatformRegistryBindingSnapshot]:
    rows = (
        db.query(PlatformUser)
        .options(joinedload(PlatformUser.user))
        .order_by(PlatformUser.id.asc())
        .all()
    )
    snapshots: list[PlatformRegistryBindingSnapshot] = []
    for row in rows:
        user = row.user or db.get(User, row.user_id)
        if user is None or is_bootstrap_owner(user):
            continue
        snapshots.append(
            PlatformRegistryBindingSnapshot(
                user_id=row.user_id,
                email=user.email,
                full_name=user.full_name,
                platform_role=row.platform_role,
                status=row.status,
            )
        )
    return snapshots


def _clear_platform_owner_fields(db: Session, row: PlatformSettings) -> None:
    row.platform_owner_user_id = None
    row.platform_owner_full_name = None
    row.platform_owner_email = None
    row.platform_owner_phone = None
    row.platform_owner_avatar_url = None
    row.platform_owner_avatar_settings = None
    row.updated_at = utc_now()
    db.flush()


def plan_platform_users_reset(db: Session) -> ResetPlatformUsersPlan:
    role_names = [role.name for role in db.query(Role).order_by(Role.id.asc()).all()]
    row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    owner_fields_to_clear = bool(
        row is not None
        and (
            row.platform_owner_user_id is not None
            or row.platform_owner_email
            or row.platform_owner_full_name
            or row.platform_owner_phone
            or row.platform_owner_avatar_url
            or row.platform_owner_avatar_settings
        )
    )
    return ResetPlatformUsersPlan(
        registry_bindings_to_remove=_snapshot_registry_bindings(db),
        global_users_preserved=_snapshot_global_users(db),
        owner_fields_to_clear=owner_fields_to_clear,
        roles_preserved=role_names,
    )


def reset_platform_users(
    db: Session,
    *,
    dry_run: bool = True,
    confirm: bool = False,
    commit: bool = False,
) -> ResetPlatformUsersResult:
    """Reset platform registry bindings only.

    Never deletes rows from users, tenant_user_memberships or tenant_user_profiles.
    """
    plan = plan_platform_users_reset(db)

    if dry_run:
        return ResetPlatformUsersResult(
            dry_run=True,
            plan=plan,
            removed_registry_bindings=[],
            owner_fields_cleared=False,
            journal_entry_created=False,
        )

    assert_platform_registry_reset_allowed()
    assert_confirmed_mutation(confirm=confirm, operation="reset_platform_users")

    row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if row is None:
        raise RuntimeError("platform_settings singleton row is missing")

    removed_bindings = list(plan.registry_bindings_to_remove)
    if removed_bindings:
        db.query(PlatformUser).delete(synchronize_session=False)
        db.flush()

    owner_fields_cleared = False
    if plan.owner_fields_to_clear:
        _clear_platform_owner_fields(db, row)
        owner_fields_cleared = True

    journal_slug = (
        f"{PLATFORM_USERS_RESET_JOURNAL_SLUG}-"
        f"{int(datetime.now(timezone.utc).timestamp())}"
    )
    journal_entry = record_platform_event_journal_entry(
        db,
        title="Сброшены привязки платформенных пользователей",
        description=(
            "Очищены записи platform_users и поля владельца платформы. "
            "Глобальные учётные записи users не удалялись. "
            f"Удалено привязок: {len(removed_bindings)}. "
            f"Сохранено global users: {len(plan.global_users_preserved)}."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
        source=PlatformEventJournalSource.MANUAL.value,
        author="Cursor",
        slug=journal_slug,
        commit=False,
    )

    if commit:
        db.commit()

    return ResetPlatformUsersResult(
        dry_run=False,
        plan=plan,
        removed_registry_bindings=removed_bindings,
        owner_fields_cleared=owner_fields_cleared,
        journal_entry_created=journal_entry is not None,
    )
