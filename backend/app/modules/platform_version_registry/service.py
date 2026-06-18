"""Business logic for platform environment version registry."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_version_registry import crud
from app.modules.platform_version_registry.constants import (
    ENVIRONMENT_DISPLAY_LABELS,
    PLATFORM_VERSION_PATTERN,
    PlatformEnvironmentKey,
    PlatformVersionInstallationStatus,
)
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.platform_version_registry.schemas import (
    PlatformEnvironmentVersionOut,
    PlatformVersionHistoryOut,
    PlatformVersionRegistrySummaryOut,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantType
from app.modules.tenant_environment.resolver import resolve_portal_tenant_type
from app.modules.users.models import User


def validate_platform_version(version: str, *, environment_key: str) -> str:
    normalized = str(version or "").strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Версия платформы обязательна",
        )
    if not PLATFORM_VERSION_PATTERN.match(normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый формат версии: {normalized}",
        )
    if (
        environment_key == PlatformEnvironmentKey.DEV.value
        and not normalized.endswith("-dev")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DEV-окружение должно использовать суффикс -dev (например 1.0.0-dev)",
        )
    if (
        environment_key != PlatformEnvironmentKey.DEV.value
        and normalized.endswith("-dev")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Суффикс -dev допустим только для DEV",
        )
    return normalized


def resolve_environment_key_for_portal(portal: Portal) -> str:
    tenant_type = resolve_portal_tenant_type(portal)
    if tenant_type == TenantType.DEV:
        return PlatformEnvironmentKey.DEV.value
    if tenant_type in {TenantType.TEMPLATE, TenantType.LEGACY_TEMPLATE}:
        return PlatformEnvironmentKey.TEMPLATE.value
    return PlatformEnvironmentKey.CLIENT.value


def _resolve_user_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    return user.full_name or user.email


def _serialize_current(
    db: Session,
    row: PlatformEnvironmentVersion,
) -> PlatformEnvironmentVersionOut:
    portal = db.query(Portal).filter(Portal.id == row.tenant_id).one_or_none()
    actor = (
        db.query(User).filter(User.id == row.installed_by_id).one_or_none()
        if row.installed_by_id is not None
        else None
    )
    return PlatformEnvironmentVersionOut(
        id=row.id,
        tenant_id=row.tenant_id,
        environment_key=row.environment_key,
        environment_label=ENVIRONMENT_DISPLAY_LABELS.get(
            row.environment_key,
            row.environment_key,
        ),
        tenant_name=portal.name if portal else None,
        tenant_code=portal.code if portal else None,
        platform_version=row.platform_version,
        status=row.status,
        installed_at=row.installed_at,
        installed_by_id=row.installed_by_id,
        installed_by_name=_resolve_user_display_name(actor),
        notes=row.notes,
        change_description=row.change_description,
        updated_at=row.updated_at,
    )


def _serialize_history(
    db: Session,
    row: PlatformVersionHistory,
) -> PlatformVersionHistoryOut:
    portal = db.query(Portal).filter(Portal.id == row.tenant_id).one_or_none()
    actor = (
        db.query(User).filter(User.id == row.installed_by_id).one_or_none()
        if row.installed_by_id is not None
        else None
    )
    return PlatformVersionHistoryOut(
        id=row.id,
        tenant_id=row.tenant_id,
        environment_key=row.environment_key,
        environment_label=ENVIRONMENT_DISPLAY_LABELS.get(
            row.environment_key,
            row.environment_key,
        ),
        tenant_name=portal.name if portal else None,
        tenant_code=portal.code if portal else None,
        platform_version=row.platform_version,
        status=row.status,
        installed_at=row.installed_at,
        installed_by_id=row.installed_by_id,
        installed_by_name=_resolve_user_display_name(actor),
        notes=row.notes,
        change_description=row.change_description,
        recorded_at=row.recorded_at,
        superseded_at=row.superseded_at,
    )


def list_current_environment_versions(db: Session) -> list[PlatformEnvironmentVersionOut]:
    return [_serialize_current(db, row) for row in crud.list_current_versions(db)]


def list_environment_version_history(
    db: Session,
    *,
    tenant_id: int | None = None,
) -> list[PlatformVersionHistoryOut]:
    return [
        _serialize_history(db, row)
        for row in crud.list_version_history(db, tenant_id=tenant_id)
    ]


def get_version_registry_summary(db: Session) -> PlatformVersionRegistrySummaryOut:
    return PlatformVersionRegistrySummaryOut(
        current_versions=list_current_environment_versions(db),
        history=list_environment_version_history(db),
    )


def record_environment_version(
    db: Session,
    *,
    tenant_id: int,
    platform_version: str,
    installed_by_id: int | None = None,
    notes: str | None = None,
    change_description: str | None = None,
    installed_at: datetime | None = None,
    commit: bool = True,
) -> PlatformEnvironmentVersion:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant portal {tenant_id} не найден",
        )

    environment_key = resolve_environment_key_for_portal(portal)
    normalized_version = validate_platform_version(
        platform_version,
        environment_key=environment_key,
    )
    now = installed_at or datetime.utcnow()

    current = crud.get_current_version_for_tenant(db, tenant_id)
    if current is not None and current.platform_version == normalized_version:
        return current

    if current is not None:
        current.status = PlatformVersionInstallationStatus.SUPERSEDED.value
        current.updated_at = now
        db.add(
            PlatformVersionHistory(
                tenant_id=current.tenant_id,
                environment_key=current.environment_key,
                platform_version=current.platform_version,
                status=PlatformVersionInstallationStatus.SUPERSEDED.value,
                installed_at=current.installed_at,
                installed_by_id=current.installed_by_id,
                notes=current.notes,
                change_description=current.change_description,
                recorded_at=now,
                superseded_at=now,
            )
        )

    if current is None:
        current = PlatformEnvironmentVersion(tenant_id=tenant_id)
        db.add(current)

    current.environment_key = environment_key
    current.platform_version = normalized_version
    current.status = PlatformVersionInstallationStatus.ACTIVE.value
    current.installed_at = now
    current.installed_by_id = installed_by_id
    current.notes = notes
    current.change_description = change_description
    current.updated_at = now

    db.add(
        PlatformVersionHistory(
            tenant_id=tenant_id,
            environment_key=environment_key,
            platform_version=normalized_version,
            status=PlatformVersionInstallationStatus.ACTIVE.value,
            installed_at=now,
            installed_by_id=installed_by_id,
            notes=notes,
            change_description=change_description,
            recorded_at=now,
        )
    )

    if commit:
        db.commit()
        db.refresh(current)
    else:
        db.flush()
    return current
