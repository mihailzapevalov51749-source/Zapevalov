"""Service layer for tenant modules registry."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules import manifest_crud
from app.modules.platform_modules import version_service
from app.modules.platform_modules.models import PlatformModule
from app.modules.tenant_modules import crud
from app.modules.tenant_modules.models import TenantModule
from app.modules.tenant_modules.schemas import TenantModuleDetailOut, TenantModuleOut
from app.modules.tenant_module_update_offers import service as offer_service


def _resolve_platform_module(db: Session, module_key: str) -> PlatformModule | None:
    return (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )


def serialize_tenant_module(
    db: Session,
    tenant_module: TenantModule,
    *,
    include_manifest: bool = False,
) -> TenantModuleOut | TenantModuleDetailOut:
    platform_module = _resolve_platform_module(db, tenant_module.module_key)
    title = platform_module.title if platform_module else tenant_module.module_key
    platform_version = (
        str(platform_module.version or "1.0.0") if platform_module else tenant_module.installed_version
    )
    latest_platform_version = (
        version_service.resolve_latest_platform_version(db, tenant_module.module_key)
        or platform_version
    )
    versions_match = str(tenant_module.installed_version) == str(latest_platform_version)
    available_offer = offer_service.get_available_offer_brief(
        db,
        tenant_id=tenant_module.tenant_id,
        module_key=tenant_module.module_key,
    )

    payload = {
        "module_key": tenant_module.module_key,
        "title": title,
        "installed_version": tenant_module.installed_version,
        "platform_version": platform_version,
        "latest_platform_version": latest_platform_version,
        "update_available": available_offer is not None,
        "available_offer": available_offer,
        "enabled": bool(tenant_module.enabled),
        "state": "installed",
        "source": tenant_module.source,
        "installed_at": tenant_module.installed_at,
        "notes": tenant_module.notes,
    }

    if not include_manifest:
        return TenantModuleOut(**payload)

    manifest = manifest_crud.get_active_manifest_for_module(db, tenant_module.module_key)
    return TenantModuleDetailOut(
        **payload,
        portal_id=tenant_module.portal_id,
        tenant_id=tenant_module.tenant_id,
        manifest_version=manifest.manifest_version if manifest else None,
        dependencies=list(manifest.dependencies or []) if manifest else [],
        versions_match=versions_match,
    )


def list_tenant_modules(db: Session, tenant_id: int) -> list[TenantModuleOut]:
    return [
        serialize_tenant_module(db, item)
        for item in crud.list_tenant_modules(db, tenant_id)
    ]


def get_tenant_module(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> TenantModuleDetailOut | None:
    tenant_module = crud.get_tenant_module(db, tenant_id=tenant_id, module_key=module_key)
    if tenant_module is None:
        return None
    return serialize_tenant_module(db, tenant_module, include_manifest=True)
