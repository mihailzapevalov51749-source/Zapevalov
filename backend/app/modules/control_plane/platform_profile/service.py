from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import (
    DEFAULT_PLATFORM_DATE_FORMAT,
    DEFAULT_PLATFORM_DESCRIPTION,
    DEFAULT_PLATFORM_LANGUAGE,
    DEFAULT_PLATFORM_NAME,
    DEFAULT_PLATFORM_SHORT_NAME,
    DEFAULT_PLATFORM_TIME_FORMAT,
    DEFAULT_PLATFORM_TIMEZONE,
    DEFAULT_PLATFORM_WEEK_START,
    PLATFORM_DATE_FORMAT_LABELS,
    PLATFORM_LANGUAGE_OPTIONS,
    PLATFORM_SETTINGS_SINGLETON_ID,
    PLATFORM_TIME_FORMAT_LABELS,
)
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.public_slug_service import (
    PublicSlugConflictError,
    assert_platform_public_slug_available,
    resolve_platform_public_slug_for_update,
)
from app.modules.portals.public_tenant_url import resolve_company_portal_url
from app.modules.control_plane.platform_profile.owner_service import (
    bootstrap_platform_owner_from_legacy,
    get_platform_owner,
)
from app.modules.control_plane.platform_profile.schemas import (
    PlatformSettingsGeneralRead,
    PlatformSettingsGeneralUpdate,
    PlatformSettingsRead,
)
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import PlatformEventJournalSource
from app.modules.platform_event_journal.service import record_platform_event
from app.modules.users.models import User


def _language_label(code: str) -> str:
    for item_code, label in PLATFORM_LANGUAGE_OPTIONS:
        if item_code == code:
            return label
    return code


def _serialize_general(row: PlatformSettings) -> PlatformSettingsGeneralRead:
    public_slug = str(row.public_slug or "").strip() or None
    public_url = (
        resolve_company_portal_url(public_slug=public_slug) if public_slug else None
    )
    return PlatformSettingsGeneralRead(
        platform_name=row.platform_name,
        platform_short_name=row.platform_short_name,
        public_slug=public_slug,
        public_slug_locked=bool(getattr(row, "public_slug_locked", False)),
        public_url=public_url,
        description=row.description,
        timezone=row.timezone,
        date_format=PLATFORM_DATE_FORMAT_LABELS.get(row.date_format, row.date_format),
        time_format=PLATFORM_TIME_FORMAT_LABELS.get(row.time_format, row.time_format),
        week_start_day=row.week_start_day,
        default_language=_language_label(row.default_language),
        updated_at=row.updated_at,
    )


def _default_settings_row() -> PlatformSettings:
    now = utc_now()
    return PlatformSettings(
        id=PLATFORM_SETTINGS_SINGLETON_ID,
        platform_name=DEFAULT_PLATFORM_NAME,
        platform_short_name=DEFAULT_PLATFORM_SHORT_NAME,
        public_slug="yasnopro",
        public_slug_locked=False,
        description=DEFAULT_PLATFORM_DESCRIPTION,
        timezone=DEFAULT_PLATFORM_TIMEZONE,
        date_format=DEFAULT_PLATFORM_DATE_FORMAT,
        time_format=DEFAULT_PLATFORM_TIME_FORMAT,
        week_start_day=DEFAULT_PLATFORM_WEEK_START,
        default_language=DEFAULT_PLATFORM_LANGUAGE,
        created_at=now,
        updated_at=now,
    )


def get_or_create_platform_settings(db: Session) -> PlatformSettings:
    row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if row is not None:
        return row

    row = _default_settings_row()
    db.add(row)
    db.flush()
    return row


def get_platform_settings(db: Session) -> PlatformSettingsRead:
    row = get_or_create_platform_settings(db)
    row = bootstrap_platform_owner_from_legacy(db, row)
    return PlatformSettingsRead(
        general=_serialize_general(row),
        owner=get_platform_owner(db, row),
    )


def update_platform_settings_general(
    db: Session,
    payload: PlatformSettingsGeneralUpdate,
    *,
    current_user: User | None = None,
) -> PlatformSettingsRead:
    row = get_or_create_platform_settings(db)

    resolved_slug, slug_locked = resolve_platform_public_slug_for_update(
        row,
        short_name=payload.platform_short_name,
        requested_public_slug=payload.public_slug,
        requested_public_slug_locked=payload.public_slug_locked,
    )

    try:
        public_slug = assert_platform_public_slug_available(db, resolved_slug)
    except PublicSlugConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    row.platform_name = payload.platform_name.strip()
    row.platform_short_name = payload.platform_short_name.strip()
    row.public_slug = public_slug
    row.public_slug_locked = slug_locked
    row.description = str(payload.description or "").strip() or None
    row.timezone = payload.timezone
    row.date_format = payload.date_format
    row.time_format = payload.time_format
    row.week_start_day = payload.week_start_day
    row.default_language = payload.default_language
    row.updated_at = utc_now()

    record_platform_event(
        db,
        event_code=PlatformEventCode.PLATFORM_SETTINGS_UPDATED.value,
        event_category=PlatformEventCategory.PLATFORM_SETTINGS.value,
        title="Изменены общие настройки платформы",
        description=(
            "Обновлены основные параметры профиля платформы: название, краткое название, "
            "описание, часовой пояс, форматы даты и времени, первый день недели и язык "
            "системы по умолчанию."
        ),
        status=PlatformAuditStatus.DONE.value,
        source=PlatformEventJournalSource.MANUAL.value,
        actor_user=current_user,
        target_type="platform_settings",
        target_id=PLATFORM_SETTINGS_SINGLETON_ID,
        target_name=row.platform_name,
        metadata={
            "platform_name": row.platform_name,
            "timezone": row.timezone,
            "default_language": row.default_language,
        },
        slug=f"platform-general-settings-updated-{int(utc_now().timestamp() * 1000)}",
        commit=False,
    )

    db.flush()
    return PlatformSettingsRead(
        general=_serialize_general(row),
        owner=get_platform_owner(db, row),
    )
