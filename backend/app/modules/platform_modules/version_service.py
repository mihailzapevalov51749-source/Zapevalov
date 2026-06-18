"""Service layer for platform module versions registry."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules import manifest_crud
from app.modules.platform_modules import version_crud
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.version_models import PlatformModuleVersion, PlatformReleaseModule
from app.modules.platform_modules.version_schemas import (
    PlatformModuleVersionDetailOut,
    PlatformModuleVersionOut,
    PlatformReleaseModuleOut,
    TenantModuleVersionComparisonOut,
)
from app.modules.platform_release.resolvers import resolve_release_version


def _resolve_module_title(db: Session, module_key: str) -> str | None:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    return module.title if module is not None else None


def _resolve_release_version(db: Session, release_id: int | None) -> str | None:
    return resolve_release_version(db, release_id)


def serialize_module_version(
    db: Session,
    version_row: PlatformModuleVersion,
    *,
    include_manifest: bool = False,
) -> PlatformModuleVersionOut | PlatformModuleVersionDetailOut:
    payload = {
        "id": version_row.id,
        "module_key": version_row.module_key,
        "version": version_row.version,
        "status": version_row.status,
        "release_id": version_row.release_id,
        "release_version": _resolve_release_version(db, version_row.release_id),
        "release_date": version_row.release_date,
        "change_log": version_row.change_log,
        "breaking_changes": version_row.breaking_changes,
        "manifest_version": version_row.manifest_version,
        "created_at": version_row.created_at,
        "updated_at": version_row.updated_at,
    }

    if not include_manifest:
        return PlatformModuleVersionOut(**payload)

    manifest = manifest_crud.get_manifest_by_module_and_version(
        db,
        module_key=version_row.module_key,
        manifest_version=version_row.manifest_version,
    )

    return PlatformModuleVersionDetailOut(
        **payload,
        manifest_id=manifest.id if manifest is not None else None,
        manifest_status=manifest.status if manifest is not None else None,
        module_title=_resolve_module_title(db, version_row.module_key),
    )


def list_platform_module_versions(db: Session) -> list[PlatformModuleVersionOut]:
    return [
        serialize_module_version(db, row)
        for row in version_crud.list_platform_module_versions(db)
    ]


def list_module_versions(db: Session, module_key: str) -> list[PlatformModuleVersionOut]:
    return [
        serialize_module_version(db, row)
        for row in version_crud.list_module_versions(db, module_key)
    ]


def get_latest_module_version(
    db: Session,
    module_key: str,
) -> PlatformModuleVersionDetailOut | None:
    version_row = version_crud.get_latest_module_version(db, module_key)
    if version_row is None:
        return None
    return serialize_module_version(db, version_row, include_manifest=True)


def list_release_modules(db: Session, release_id: int) -> list[PlatformReleaseModuleOut]:
    return [
        PlatformReleaseModuleOut(
            id=row.id,
            release_id=row.release_id,
            module_key=row.module_key,
            module_title=_resolve_module_title(db, row.module_key),
            from_version=row.from_version,
            to_version=row.to_version,
            change_summary=row.change_summary,
        )
        for row in version_crud.list_release_modules(db, release_id)
    ]


def resolve_latest_platform_version(db: Session, module_key: str) -> str | None:
    latest = version_crud.get_latest_module_version(db, module_key)
    return latest.version if latest is not None else None


def build_tenant_version_comparison(
    db: Session,
    *,
    module_key: str,
    tenant_version: str,
) -> TenantModuleVersionComparisonOut:
    latest_version = resolve_latest_platform_version(db, module_key) or tenant_version
    versions_match = str(tenant_version) == str(latest_version)

    return TenantModuleVersionComparisonOut(
        module_key=module_key,
        tenant_version=str(tenant_version),
        platform_latest_version=str(latest_version),
        versions_match=versions_match,
        update_available=False,
    )
