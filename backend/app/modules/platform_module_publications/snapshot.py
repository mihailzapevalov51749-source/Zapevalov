"""Build immutable publication snapshots from DEV tenant state."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.version_crud import get_latest_module_version
from app.modules.platform_module_publications.exceptions import PublicationPreconditionError
from app.modules.tenant_environment.constants import TenantType
from app.modules.tenant_environment.resolver import resolve_portal_tenant_type, resolve_template_tenant_id
from app.modules.tenant_module_configurations.constants import DEFAULT_CONFIG_VERSION
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.validation import is_usable_settings_schema
from app.modules.tenant_modules.crud import get_tenant_module


def _configuration_payload(configuration) -> dict[str, Any]:
    return {
        "module_version": str(configuration.module_version or "1.0.0"),
        "config_version": str(configuration.config_version or DEFAULT_CONFIG_VERSION),
        "schema_version": str(configuration.schema_version or DEFAULT_CONFIG_VERSION),
        "settings": dict(configuration.settings or {}),
        "permissions": dict(configuration.permissions or {}),
        "views": dict(configuration.views or {}),
        "rules": dict(configuration.rules or {}),
        "templates": dict(configuration.templates or {}),
        "source": str(configuration.source or "manifest_defaults"),
    }


def validate_publication_prerequisites(
    db: Session,
    *,
    source_tenant_id: int,
    module_key: str,
) -> tuple[Any, Any, Any, Any, int]:
    portal = db.query(Portal).filter(Portal.id == source_tenant_id).one_or_none()
    if portal is None:
        raise PublicationPreconditionError("source_tenant_not_found", "DEV tenant не найден")

    source_type = resolve_portal_tenant_type(portal)
    if source_type != TenantType.DEV:
        raise PublicationPreconditionError(
            "invalid_source_tenant",
            "Публикация разрешена только из DEV tenant",
        )

    template_tenant_id = resolve_template_tenant_id(db)
    if template_tenant_id is None:
        raise PublicationPreconditionError("template_not_found", "platform_template tenant не найден")

    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    if module is None:
        raise PublicationPreconditionError("module_not_found", "Модуль платформы не найден")

    manifest = get_active_manifest_for_module(db, module_key)
    if manifest is None or not is_usable_settings_schema(manifest.settings_schema):
        raise PublicationPreconditionError("manifest_missing", "Активный manifest модуля не найден")

    latest_version = get_latest_module_version(db, module_key)
    if latest_version is None:
        raise PublicationPreconditionError("module_version_missing", "Версия модуля не найдена")

    dev_configuration = get_configuration(db, tenant_id=source_tenant_id, module_key=module_key)
    if dev_configuration is None:
        raise PublicationPreconditionError(
            "configuration_missing",
            "Конфигурация модуля в DEV tenant отсутствует",
        )

    dev_tenant_module = get_tenant_module(db, tenant_id=source_tenant_id, module_key=module_key)
    if dev_tenant_module is None:
        raise PublicationPreconditionError(
            "tenant_module_missing",
            "Tenant module в DEV отсутствует",
        )

    return dev_configuration, dev_tenant_module, manifest, latest_version, int(template_tenant_id)


def build_publication_snapshot(
    db: Session,
    *,
    source_tenant_id: int,
    module_key: str,
) -> dict[str, Any]:
    (
        dev_configuration,
        dev_tenant_module,
        manifest,
        latest_version,
        template_tenant_id,
    ) = validate_publication_prerequisites(db, source_tenant_id=source_tenant_id, module_key=module_key)

    template_configuration = get_configuration(
        db,
        tenant_id=template_tenant_id,
        module_key=module_key,
    )
    template_tenant_module = get_tenant_module(
        db,
        tenant_id=template_tenant_id,
        module_key=module_key,
    )

    from_module_version = (
        str(template_tenant_module.installed_version)
        if template_tenant_module is not None
        else str(dev_tenant_module.installed_version or "1.0.0")
    )
    from_config_version = (
        str(template_configuration.config_version)
        if template_configuration is not None
        else DEFAULT_CONFIG_VERSION
    )

    snapshot_configuration = _configuration_payload(dev_configuration)

    return {
        "module_key": module_key,
        "source_tenant_id": int(source_tenant_id),
        "target_tenant_id": int(template_tenant_id),
        "from_module_version": from_module_version,
        "to_module_version": str(dev_tenant_module.installed_version or latest_version.version),
        "from_config_version": from_config_version,
        "to_config_version": snapshot_configuration["config_version"],
        "manifest_version": str(manifest.manifest_version or "1.0.0"),
        "snapshot_payload": snapshot_configuration,
    }
