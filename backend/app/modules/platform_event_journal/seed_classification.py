"""Classify bootstrap seed journal entries into scope + journal_kind + tenant_id."""

from __future__ import annotations

from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.modules.platform_event_journal.constants import (
    DEVELOPMENT_LEGACY_EVENT_TYPES,
    PLATFORM_AUDIT_LEGACY_EVENT_TYPES,
    PlatformEventJournalKind,
    PlatformEventJournalScope,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantType

# Studio / Designer development history — visible in DEV tenant development journal.
TENANT_STUDIO_SEED_SLUGS: frozenset[str] = frozenset(
    {
        "platform-section-removed",
        "dashboard-disabled-studio",
        "event-journal-created",
        "dashboard-hidden-template",
        "dashboard-hidden-demo",
        "dashboard-hidden-client",
        "event-journal-improved",
        "event-journal-display-improved",
        "event-journal-filters-added",
        "sidebar-activity-modal-added",
        "platform-navigation-menu-blocks",
        "platform-navigation-menu-blocks-fixed",
        "platform-navigation-menu-blocks-studio-office",
        "studio-trash-bulk-selection",
        "studio-trash-deleted-by-fix",
        "studio-trash-bulk-purge-engine",
    }
)

# Bootstrap seeds that describe platform Control Plane audit actions.
PLATFORM_AUDIT_SEED_SLUGS: frozenset[str] = frozenset(
    {
        "company-created-with-first-admin",
    }
)


def _portals_table_exists(db: Session) -> bool:
    try:
        connection = db.connection()
        return inspect(connection).has_table("portals")
    except Exception:
        return False


def resolve_dev_tenant_portal_id(db: Session) -> int:
    if not _portals_table_exists(db):
        return 1

    try:
        with db.begin_nested():
            portal = (
                db.query(Portal.id)
                .filter(Portal.tenant_type == TenantType.DEV.value)
                .order_by(Portal.id.asc())
                .first()
            )
            if portal is not None:
                return int(portal[0])

            fallback = db.query(Portal.id).order_by(Portal.id.asc()).first()
            if fallback is not None:
                return int(fallback[0])
    except (OperationalError, ProgrammingError):
        return 1

    return 1


def resolve_tenant_type(db: Session, tenant_id: int) -> str | None:
    if not _portals_table_exists(db):
        return LEGACY_TENANT_TYPE_FALLBACK.get(int(tenant_id))

    try:
        with db.begin_nested():
            row = db.query(Portal.tenant_type).filter(Portal.id == int(tenant_id)).first()
            if row is not None and row[0]:
                return str(row[0]).strip().upper()
    except (OperationalError, ProgrammingError):
        return LEGACY_TENANT_TYPE_FALLBACK.get(int(tenant_id))

    return LEGACY_TENANT_TYPE_FALLBACK.get(int(tenant_id))


LEGACY_TENANT_TYPE_FALLBACK: dict[int, str] = {
    1: TenantType.DEV.value,
    2: TenantType.TEMPLATE.value,
}


def is_development_legacy_type(event_type: str | None) -> bool:
    normalized = str(event_type or "").strip().lower()
    return normalized in DEVELOPMENT_LEGACY_EVENT_TYPES


def is_platform_audit_legacy_type(event_type: str | None) -> bool:
    normalized = str(event_type or "").strip().lower()
    return normalized in PLATFORM_AUDIT_LEGACY_EVENT_TYPES


def classify_seed_slug(
    slug: str,
    *,
    event_type: str,
    dev_tenant_id: int,
) -> tuple[str, str, int | None]:
    """
    Return (scope, journal_kind, tenant_id) for a bootstrap seed entry.
    """
    normalized_slug = str(slug or "").strip()
    normalized_event_type = str(event_type or "").strip().lower()

    if normalized_slug in PLATFORM_AUDIT_SEED_SLUGS or is_platform_audit_legacy_type(
        normalized_event_type
    ):
        return (
            PlatformEventJournalScope.PLATFORM.value,
            PlatformEventJournalKind.PLATFORM_AUDIT.value,
            None,
        )

    if (
        normalized_slug in TENANT_STUDIO_SEED_SLUGS
        or is_development_legacy_type(normalized_event_type)
    ):
        return (
            PlatformEventJournalScope.TENANT.value,
            PlatformEventJournalKind.DEV_DEVELOPMENT.value,
            dev_tenant_id,
        )

    return (
        PlatformEventJournalScope.PLATFORM.value,
        PlatformEventJournalKind.PLATFORM_AUDIT.value,
        None,
    )


def classify_seed_slug_legacy(slug: str, *, dev_tenant_id: int) -> tuple[str, int | None]:
    """Backward-compatible scope + tenant_id classifier (journal_kind omitted)."""
    scope, _, tenant_id = classify_seed_slug(slug, event_type="", dev_tenant_id=dev_tenant_id)
    if scope == PlatformEventJournalScope.TENANT.value:
        return scope, tenant_id
    return scope, None
