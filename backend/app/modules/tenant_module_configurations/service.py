"""Service layer for tenant module configurations."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules.models import PlatformModule
from app.modules.portals.models import Portal
from app.modules.tenant_module_configurations.crud import (
    get_configuration,
    list_all_configurations as list_all_configuration_rows,
    list_configurations_for_tenant,
    list_snapshots_for_module,
)
from app.modules.tenant_module_configurations.models import TenantModuleConfiguration
from app.modules.tenant_module_configurations.schemas import (
    TenantModuleConfigSnapshotOut,
    TenantModuleConfigurationListItemOut,
    TenantModuleConfigurationOut,
)


def _resolve_module_title(db: Session, module_key: str) -> str | None:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    if module is None:
        return None
    title = str(module.title or "").strip()
    return title or module_key


def _resolve_tenant_title(db: Session, tenant_id: int) -> str | None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        return None
    return str(portal.name or "").strip() or None


def serialize_configuration(
    db: Session,
    row: TenantModuleConfiguration,
    *,
    include_blocks: bool = True,
) -> TenantModuleConfigurationOut:
    payload = {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "module_key": row.module_key,
        "module_title": _resolve_module_title(db, row.module_key),
        "module_version": row.module_version,
        "config_version": row.config_version,
        "schema_version": row.schema_version,
        "settings": row.settings or {},
        "permissions": row.permissions or {},
        "views": row.views or {},
        "rules": row.rules or {},
        "templates": row.templates or {},
        "source": row.source,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }
    if not include_blocks:
        payload.update(
            {
                "settings": {},
                "permissions": {},
                "views": {},
                "rules": {},
                "templates": {},
            }
        )
    return TenantModuleConfigurationOut(**payload)


def serialize_configuration_list_item(
    db: Session,
    row: TenantModuleConfiguration,
) -> TenantModuleConfigurationListItemOut:
    return TenantModuleConfigurationListItemOut(
        id=row.id,
        tenant_id=row.tenant_id,
        tenant_title=_resolve_tenant_title(db, row.tenant_id),
        module_key=row.module_key,
        module_title=_resolve_module_title(db, row.module_key),
        module_version=row.module_version,
        config_version=row.config_version,
        schema_version=row.schema_version,
        source=row.source,
        updated_at=row.updated_at,
    )


def list_tenant_configurations(db: Session, tenant_id: int) -> list[TenantModuleConfigurationOut]:
    return [
        serialize_configuration(db, row)
        for row in list_configurations_for_tenant(db, tenant_id)
    ]


def get_tenant_module_configuration(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> TenantModuleConfigurationOut | None:
    row = get_configuration(db, tenant_id=tenant_id, module_key=module_key)
    if row is None:
        return None
    return serialize_configuration(db, row)


def list_tenant_module_configuration_snapshots(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> list[TenantModuleConfigSnapshotOut]:
    return [
        TenantModuleConfigSnapshotOut.model_validate(item)
        for item in list_snapshots_for_module(db, tenant_id=tenant_id, module_key=module_key)
    ]


def list_all_configurations(db: Session) -> list[TenantModuleConfigurationListItemOut]:
    return [
        serialize_configuration_list_item(db, row)
        for row in list_all_configuration_rows(db)
    ]
