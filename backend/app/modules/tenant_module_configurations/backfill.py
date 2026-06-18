"""Backfill tenant_module_configurations from manifest settings_schema defaults."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.platform_modules.settings_schema.validator import SettingsSchemaValidationError
from app.modules.tenant_module_configurations.constants import (
    ACTIVE_CONFIGURATION_MODULE_KEYS,
    DEFAULT_CONFIG_VERSION,
    MANIFEST_DEFAULTS_SOURCE,
)
from app.modules.tenant_module_configurations.models import TenantModuleConfiguration
from app.modules.tenant_module_configurations.validation import (
    extract_defaults_from_schema,
    is_usable_settings_schema,
    validate_tenant_configuration_against_schema,
)
from app.modules.tenant_management.tenant_write_policy import (
    assert_tenant_allows_direct_module_config_write,
)
from app.modules.tenant_modules.models import TenantModule

logger = logging.getLogger(__name__)


def _is_schema_empty(schema: dict[str, Any] | None) -> bool:
    return not is_usable_settings_schema(schema)


def backfill_configuration_for_tenant_module(
    db: Session,
    *,
    tenant_module: TenantModule,
    commit: bool = False,
    bypass_module_config_write_policy: bool = False,
) -> dict[str, str | int]:
    module_key = str(tenant_module.module_key)
    tenant_id = int(tenant_module.tenant_id)

    if module_key not in ACTIVE_CONFIGURATION_MODULE_KEYS:
        return {"status": "skipped", "reason": "module_not_in_wave"}

    manifest = get_active_manifest_for_module(db, module_key)
    if manifest is None:
        logger.warning(
            "Skip tenant module config backfill: manifest missing tenant_id=%s module_key=%s",
            tenant_id,
            module_key,
        )
        return {"status": "skipped", "reason": "manifest_missing"}

    schema = dict(manifest.settings_schema or {})
    if _is_schema_empty(schema):
        logger.warning(
            "Skip tenant module config backfill: empty schema tenant_id=%s module_key=%s",
            tenant_id,
            module_key,
        )
        return {"status": "skipped", "reason": "empty_schema"}

    try:
        payload = extract_defaults_from_schema(schema)
        validate_tenant_configuration_against_schema(
            schema,
            settings=payload["settings"],
            permissions=payload["permissions"],
            views=payload["views"],
            rules=payload["rules"],
            templates=payload["templates"],
        )
    except SettingsSchemaValidationError as exc:
        logger.warning(
            "Skip tenant module config backfill: invalid schema tenant_id=%s module_key=%s error=%s",
            tenant_id,
            module_key,
            exc,
        )
        return {"status": "skipped", "reason": "invalid_schema"}

    existing = (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == tenant_id,
            TenantModuleConfiguration.module_key == module_key,
        )
        .one_or_none()
    )
    if existing is not None:
        return {"status": "skipped", "reason": "already_exists", "configuration_id": existing.id}

    if not bypass_module_config_write_policy:
        assert_tenant_allows_direct_module_config_write(
            db,
            tenant_id,
            operation_name="backfill_configuration_for_tenant_module",
        )

    now = datetime.utcnow()
    row = TenantModuleConfiguration(
        tenant_id=tenant_id,
        module_key=module_key,
        module_version=str(tenant_module.installed_version or "1.0.0"),
        config_version=DEFAULT_CONFIG_VERSION,
        schema_version=payload["schema_version"],
        settings=payload["settings"],
        permissions=payload["permissions"],
        views=payload["views"],
        rules=payload["rules"],
        templates=payload["templates"],
        source=MANIFEST_DEFAULTS_SOURCE,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.flush()

    if commit:
        db.commit()

    return {"status": "created", "configuration_id": row.id}


def backfill_tenant_module_configurations(
    db: Session,
    *,
    tenant_ids: list[int] | None = None,
    commit: bool = True,
    bypass_module_config_write_policy: bool = False,
) -> dict[str, int | list[str]]:
    query = db.query(TenantModule)
    if tenant_ids:
        query = query.filter(TenantModule.tenant_id.in_(tenant_ids))

    totals: dict[str, int | list[str]] = {
        "created": 0,
        "skipped": 0,
        "tenants": 0,
        "skipped_reasons": [],
    }
    seen_tenants: set[int] = set()

    for tenant_module in query.order_by(TenantModule.tenant_id.asc(), TenantModule.module_key.asc()).all():
        seen_tenants.add(int(tenant_module.tenant_id))
        result = backfill_configuration_for_tenant_module(
            db,
            tenant_module=tenant_module,
            commit=False,
            bypass_module_config_write_policy=bypass_module_config_write_policy,
        )
        status = str(result.get("status") or "skipped")
        if status == "created":
            totals["created"] = int(totals["created"]) + 1
        else:
            totals["skipped"] = int(totals["skipped"]) + 1
            reason = str(result.get("reason") or "unknown")
            skipped_reasons = totals["skipped_reasons"]
            assert isinstance(skipped_reasons, list)
            entry = f"tenant={tenant_module.tenant_id} module={tenant_module.module_key} reason={reason}"
            if entry not in skipped_reasons:
                skipped_reasons.append(entry)

    totals["tenants"] = len(seen_tenants)

    if commit:
        db.commit()

    return totals
