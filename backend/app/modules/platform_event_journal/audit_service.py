"""Unified platform audit journal writer — single entry point for operational events."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.audit_constants import (
    LEGACY_EVENT_TYPE_CATEGORY_MAP,
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalKind,
    PlatformEventJournalScope,
    PlatformEventJournalSource,
)
from app.modules.platform_event_journal.dev_journal_content import normalize_dev_journal_content
from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.schemas import PlatformEventJournalEntryRead
from app.modules.platform_event_journal.tenant_audit_constants import (
    TENANT_LEGACY_EVENT_TYPE_CATEGORY_MAP,
    TenantEventCategory,
    TenantEventCode,
)
from app.modules.users.models import User


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower())
    normalized = normalized.strip("-")
    return normalized[:160] or "platform-event"


def _serialize_entry(entry: PlatformEventJournalEntry) -> PlatformEventJournalEntryRead:
    return PlatformEventJournalEntryRead.model_validate(entry)


def get_journal_entry_by_slug(db: Session, slug: str) -> PlatformEventJournalEntry | None:
    normalized_slug = str(slug or "").strip()
    if not normalized_slug:
        return None
    return (
        db.query(PlatformEventJournalEntry)
        .filter(PlatformEventJournalEntry.slug == normalized_slug)
        .one_or_none()
    )


def _resolve_actor_fields(
    actor_user: User | None,
    *,
    actor_name: str | None,
    actor_email: str | None,
    actor_user_id: int | None,
) -> tuple[str | None, str | None, int | None]:
    resolved_name = str(actor_name or "").strip() or None
    resolved_email = str(actor_email or "").strip() or None
    resolved_user_id = actor_user_id

    if actor_user is not None:
        if not resolved_name:
            resolved_name = str(actor_user.full_name or "").strip() or None
        if not resolved_email:
            resolved_email = str(actor_user.email or "").strip() or None
        if resolved_user_id is None:
            resolved_user_id = actor_user.id

    return resolved_name, resolved_email, resolved_user_id


def _persist_journal_entry(
    db: Session,
    *,
    scope: str,
    journal_kind: str,
    event_code: str,
    event_category: str,
    title: str,
    description: str | None = None,
    status: str = PlatformAuditStatus.DONE.value,
    actor_user: User | None = None,
    actor_name: str | None = None,
    actor_email: str | None = None,
    actor_user_id: int | None = None,
    target_type: str | None = None,
    target_id: str | int | None = None,
    target_name: str | None = None,
    tenant_id: int | None = None,
    company_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    slug: str | None = None,
    source: str = PlatformEventJournalSource.MANUAL.value,
    occurred_at: datetime | None = None,
    commit: bool = False,
) -> PlatformEventJournalEntryRead | None:
    normalized_title = str(title or "").strip()
    if not normalized_title:
        raise ValueError("title is required")

    normalized_scope = str(scope or "").strip().lower()
    normalized_code = str(event_code or "").strip().lower()
    normalized_category = str(event_category or "").strip().lower()
    normalized_slug = str(slug or "").strip() or _slugify(
        f"{normalized_scope}-{normalized_code}-{normalized_title}-{int(utc_now().timestamp() * 1000)}"
    )

    existing = get_journal_entry_by_slug(db, normalized_slug)
    if existing is not None:
        return None

    resolved_name, resolved_email, resolved_user_id = _resolve_actor_fields(
        actor_user,
        actor_name=actor_name,
        actor_email=actor_email,
        actor_user_id=actor_user_id,
    )

    normalized_target_id = (
        str(target_id).strip() if target_id is not None and str(target_id).strip() else None
    )

    normalized_journal_kind = str(journal_kind or "").strip().lower()

    entry = PlatformEventJournalEntry(
        slug=normalized_slug,
        title=normalized_title,
        description=str(description or "").strip() or None,
        event_type=normalized_code,
        scope=normalized_scope,
        journal_kind=normalized_journal_kind,
        event_category=normalized_category,
        status=str(status or PlatformAuditStatus.DONE.value).strip().lower(),
        author=resolved_name,
        author_user_id=resolved_user_id,
        actor_email=resolved_email,
        target_type=str(target_type or "").strip().lower() or None,
        target_id=normalized_target_id,
        target_name=str(target_name or "").strip() or None,
        tenant_id=int(tenant_id) if tenant_id is not None else None,
        company_id=int(company_id) if company_id is not None else None,
        metadata_json=metadata or None,
        source=str(source or PlatformEventJournalSource.MANUAL.value).strip().lower(),
        occurred_at=occurred_at or utc_now(),
        created_at=utc_now(),
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    else:
        db.flush()
    return _serialize_entry(entry)


def record_platform_event(
    db: Session,
    *,
    event_code: str,
    event_category: str,
    title: str,
    description: str | None = None,
    status: str = PlatformAuditStatus.DONE.value,
    actor_user: User | None = None,
    actor_name: str | None = None,
    actor_email: str | None = None,
    actor_user_id: int | None = None,
    target_type: str | None = None,
    target_id: str | int | None = None,
    target_name: str | None = None,
    tenant_id: int | None = None,
    company_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    slug: str | None = None,
    source: str = PlatformEventJournalSource.MANUAL.value,
    occurred_at: datetime | None = None,
    commit: bool = False,
) -> PlatformEventJournalEntryRead | None:
    """
    Record a platform-level audit event (Control Plane scope).

    tenant_id may reference an affected company but scope remains platform.
    """
    return _persist_journal_entry(
        db,
        scope=PlatformEventJournalScope.PLATFORM.value,
        journal_kind=PlatformEventJournalKind.PLATFORM_AUDIT.value,
        event_code=event_code,
        event_category=event_category,
        title=title,
        description=description,
        status=status,
        actor_user=actor_user,
        actor_name=actor_name,
        actor_email=actor_email,
        actor_user_id=actor_user_id,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        tenant_id=None,
        company_id=company_id if company_id is not None else tenant_id,
        metadata=metadata,
        slug=slug,
        source=source,
        occurred_at=occurred_at,
        commit=commit,
    )


def record_tenant_event(
    db: Session,
    *,
    tenant_id: int,
    event_code: str,
    event_category: str,
    title: str,
    description: str | None = None,
    status: str = PlatformAuditStatus.DONE.value,
    actor_user: User | None = None,
    actor_name: str | None = None,
    actor_email: str | None = None,
    actor_user_id: int | None = None,
    target_type: str | None = None,
    target_id: str | int | None = None,
    target_name: str | None = None,
    company_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    slug: str | None = None,
    source: str = PlatformEventJournalSource.MANUAL.value,
    occurred_at: datetime | None = None,
    commit: bool = False,
) -> PlatformEventJournalEntryRead | None:
    """Record a tenant-scoped Studio audit event."""
    normalized_tenant_id = int(tenant_id)
    if normalized_tenant_id < 1:
        raise ValueError("tenant_id is required for tenant events")

    return _persist_journal_entry(
        db,
        scope=PlatformEventJournalScope.TENANT.value,
        journal_kind=PlatformEventJournalKind.TENANT_CONFIGURATION.value,
        event_code=event_code,
        event_category=event_category,
        title=title,
        description=description,
        status=status,
        actor_user=actor_user,
        actor_name=actor_name,
        actor_email=actor_email,
        actor_user_id=actor_user_id,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        tenant_id=normalized_tenant_id,
        company_id=company_id,
        metadata=metadata,
        slug=slug,
        source=source,
        occurred_at=occurred_at,
        commit=commit,
    )


def record_dev_development_event(
    db: Session,
    *,
    title: str,
    description: str | None = None,
    event_type: str,
    status: str,
    author: str | None = None,
    slug: str | None = None,
    source: str = PlatformEventJournalSource.CURSOR.value,
    author_user_id: int | None = None,
    occurred_at: datetime | None = None,
    commit: bool = False,
) -> PlatformEventJournalEntryRead | None:
    """Record platform product development history in DEV tenant journal."""
    normalized_title, normalized_description, resolved_event_type, resolved_category = (
        normalize_dev_journal_content(
            slug=slug,
            title=title,
            description=description,
            event_type=event_type,
        )
    )
    dev_tenant_id = resolve_dev_tenant_portal_id(db)
    return _persist_journal_entry(
        db,
        scope=PlatformEventJournalScope.TENANT.value,
        journal_kind=PlatformEventJournalKind.DEV_DEVELOPMENT.value,
        event_code=TenantEventCode.LEGACY.value,
        event_category=resolved_category,
        title=normalized_title,
        description=normalized_description,
        status=status,
        actor_name=author,
        actor_user_id=author_user_id,
        slug=slug,
        source=source,
        tenant_id=dev_tenant_id,
        occurred_at=occurred_at,
        metadata={"legacy_event_type": resolved_event_type},
        commit=commit,
    )


def record_legacy_platform_event_journal_entry(
    db: Session,
    *,
    title: str,
    description: str | None = None,
    event_type: str,
    status: str,
    author: str | None = None,
    slug: str | None = None,
    source: str = PlatformEventJournalSource.CURSOR.value,
    author_user_id: int | None = None,
    occurred_at: datetime | None = None,
    commit: bool = False,
) -> PlatformEventJournalEntryRead | None:
    """Backward-compatible alias — writes DEV development journal entries."""
    return record_dev_development_event(
        db,
        title=title,
        description=description,
        event_type=event_type,
        status=status,
        author=author,
        slug=slug,
        source=source,
        author_user_id=author_user_id,
        occurred_at=occurred_at,
        commit=commit,
    )


def record_seed_journal_entry(
    db: Session,
    *,
    title: str,
    description: str | None = None,
    event_type: str,
    status: str,
    author: str | None = None,
    slug: str | None = None,
    scope: str,
    journal_kind: str,
    tenant_id: int | None = None,
    source: str = PlatformEventJournalSource.SEED.value,
    author_user_id: int | None = None,
    occurred_at: datetime | None = None,
    commit: bool = False,
) -> PlatformEventJournalEntryRead | None:
    """Insert bootstrap seed entry with explicit scope and journal_kind."""
    normalized_legacy_type = str(event_type or "").strip().lower()
    normalized_scope = str(scope or "").strip().lower()
    normalized_journal_kind = str(journal_kind or "").strip().lower()

    if normalized_journal_kind == PlatformEventJournalKind.DEV_DEVELOPMENT.value:
        category = TENANT_LEGACY_EVENT_TYPE_CATEGORY_MAP.get(
            normalized_legacy_type,
            TenantEventCategory.SYSTEM.value,
        )
        event_code = TenantEventCode.LEGACY.value
    elif normalized_journal_kind == PlatformEventJournalKind.TENANT_CONFIGURATION.value:
        category = TENANT_LEGACY_EVENT_TYPE_CATEGORY_MAP.get(
            normalized_legacy_type,
            TenantEventCategory.SYSTEM.value,
        )
        event_code = TenantEventCode.LEGACY.value
    else:
        category = LEGACY_EVENT_TYPE_CATEGORY_MAP.get(
            normalized_legacy_type,
            PlatformEventCategory.SYSTEM.value,
        )
        event_code = PlatformEventCode.LEGACY.value
        if normalized_legacy_type == "settings_change":
            event_code = PlatformEventCode.PLATFORM_SETTINGS_UPDATED.value
            category = PlatformEventCategory.PLATFORM_SETTINGS.value
        elif normalized_legacy_type == "company_creation":
            event_code = PlatformEventCode.COMPANY_CREATED.value
            category = PlatformEventCategory.COMPANY.value
        elif normalized_legacy_type == "provisioning":
            event_code = PlatformEventCode.COMPANY_SUPERADMIN_CREATED.value
            category = PlatformEventCategory.PROVISIONING.value

    return _persist_journal_entry(
        db,
        scope=normalized_scope,
        journal_kind=normalized_journal_kind,
        event_code=event_code,
        event_category=category,
        title=title,
        description=description,
        status=status,
        actor_name=author,
        actor_user_id=author_user_id,
        slug=slug,
        source=source,
        tenant_id=tenant_id,
        occurred_at=occurred_at,
        metadata={"legacy_event_type": normalized_legacy_type},
        commit=commit,
    )
