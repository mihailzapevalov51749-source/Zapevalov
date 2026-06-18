"""Apply module configuration updates from offers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_service import record_tenant_event
from app.modules.platform_event_journal.tenant_audit_constants import TenantEventCategory
from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.tenant_module_configuration_applies.constants import (
    MANIFEST_APPLY_SOURCE,
    SNAPSHOT_REASON_APPLY,
    TENANT_EVENT_CODE_MODULE_CONFIGURATION_APPLIED,
    TenantModuleConfigurationApplyStatus,
)
from app.modules.tenant_module_configuration_applies.exceptions import ApplyPreconditionError
from app.modules.tenant_module_configuration_applies.models import TenantModuleConfigurationApply
from app.modules.tenant_module_configuration_diffs import crud as diff_crud
from app.modules.tenant_module_configuration_diffs.diff_generator import build_target_configuration_from_schema
from app.modules.tenant_module_configuration_diffs.publication_diff import (
    build_target_configuration_from_publication_snapshot,
)
from app.modules.tenant_module_configurations.constants import DEFAULT_CONFIG_VERSION
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.models import TenantModuleConfigSnapshot, TenantModuleConfiguration
from app.modules.tenant_module_configurations.runtime.cache import (
    invalidate_runtime_module_configuration_cache,
)
from app.modules.tenant_module_configurations.validation import is_usable_settings_schema
from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus
from app.modules.tenant_module_update_offers.crud import get_offer
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.constants import TenantModuleUpdatePreviewStatus
from app.modules.tenant_module_update_previews.crud import get_current_preview_for_offer
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview
from app.modules.tenant_modules.crud import get_tenant_module
from app.modules.tenant_modules.models import TenantModule
from app.modules.tenant_management.exceptions import TenantWriteForbiddenError
from app.modules.tenant_management.tenant_write_policy import assert_tenant_allows_apply_target


@dataclass(frozen=True)
class ApplyContext:
    offer: TenantModuleUpdateOffer
    preview: TenantModuleUpdatePreview
    diff_id: int
    configuration: TenantModuleConfiguration
    tenant_module: TenantModule
    target_configuration: dict[str, Any]


def _build_snapshot_payload(configuration: TenantModuleConfiguration) -> dict[str, Any]:
    return {
        "module_version": configuration.module_version,
        "config_version": configuration.config_version,
        "schema_version": configuration.schema_version,
        "settings": dict(configuration.settings or {}),
        "permissions": dict(configuration.permissions or {}),
        "views": dict(configuration.views or {}),
        "rules": dict(configuration.rules or {}),
        "templates": dict(configuration.templates or {}),
        "source": configuration.source,
    }


def _count_diff_changes(diff_payload: dict[str, Any] | None) -> int:
    if not isinstance(diff_payload, dict):
        return 0

    total = 0
    for block_name in ("settings", "permissions", "views", "rules"):
        block = diff_payload.get(block_name) or {}
        if isinstance(block, dict):
            total += len(block.get("added") or [])
            total += len(block.get("removed") or [])
            total += len(block.get("changed") or [])

    templates = diff_payload.get("templates") or {}
    if isinstance(templates, dict):
        total += len(templates.get("added_seeds") or [])
        total += len(templates.get("removed_seeds") or [])
        total += len(templates.get("changed_seeds") or [])

    return total


def validate_apply_preconditions(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
) -> ApplyContext:
    try:
        assert_tenant_allows_apply_target(db, tenant_id)
    except TenantWriteForbiddenError as error:
        raise ApplyPreconditionError("apply_target_forbidden", str(error)) from error

    offer = get_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if offer is None:
        raise ApplyPreconditionError("offer_not_found", "Предложение обновления модуля не найдено")
    if offer.status != TenantModuleUpdateOfferStatus.AVAILABLE:
        raise ApplyPreconditionError(
            "offer_not_available",
            "Предложение обновления недоступно для Apply",
        )

    preview = get_current_preview_for_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if preview is None:
        raise ApplyPreconditionError("preview_missing", "Предпросмотр обновления не найден")

    diff = diff_crud.get_latest_diff_for_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if diff is None:
        raise ApplyPreconditionError("diff_missing", "Configuration diff не найден")

    configuration = get_configuration(db, tenant_id=tenant_id, module_key=str(offer.module_key))
    if configuration is None:
        raise ApplyPreconditionError(
            "configuration_missing",
            "Конфигурация модуля компании не найдена",
        )

    tenant_module = get_tenant_module(db, tenant_id=tenant_id, module_key=str(offer.module_key))
    if tenant_module is None:
        raise ApplyPreconditionError(
            "tenant_module_missing",
            "Установленный модуль компании не найден",
        )

    manifest = get_active_manifest_for_module(db, str(offer.module_key))
    if offer.publication_id:
        from app.modules.platform_module_publications.crud import get_publication

        publication = get_publication(db, int(offer.publication_id))
        snapshot = publication.snapshot_payload if publication is not None else None
        if not isinstance(snapshot, dict) or not snapshot:
            raise ApplyPreconditionError(
                "publication_snapshot_missing",
                "Snapshot публикации недоступен для Apply",
            )
        target_configuration = build_target_configuration_from_publication_snapshot(snapshot)
    else:
        if manifest is None or not is_usable_settings_schema(manifest.settings_schema):
            raise ApplyPreconditionError(
                "manifest_schema_invalid",
                "Settings schema модуля недоступна или invalid",
            )
        target_configuration = build_target_configuration_from_schema(dict(manifest.settings_schema or {}))

    return ApplyContext(
        offer=offer,
        preview=preview,
        diff_id=int(diff.id),
        configuration=configuration,
        tenant_module=tenant_module,
        target_configuration=target_configuration,
    )


def apply_module_configuration_update(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
    applied_by: User | None = None,
) -> dict[str, Any]:
    ctx = validate_apply_preconditions(db, tenant_id=tenant_id, offer_id=offer_id)
    now = datetime.utcnow()

    to_module_version = str(ctx.offer.to_version or ctx.offer.from_version or "1.0.0")
    to_config_version = str(
        ctx.target_configuration.get("schema_version") or DEFAULT_CONFIG_VERSION
    )

    apply_row = TenantModuleConfigurationApply(
        tenant_id=tenant_id,
        module_key=str(ctx.offer.module_key),
        offer_id=int(ctx.offer.id),
        preview_id=int(ctx.preview.id),
        diff_id=ctx.diff_id,
        from_module_version=str(ctx.configuration.module_version or ctx.offer.from_version or "1.0.0"),
        to_module_version=to_module_version,
        from_config_version=str(ctx.configuration.config_version or DEFAULT_CONFIG_VERSION),
        to_config_version=to_config_version,
        status=TenantModuleConfigurationApplyStatus.STARTED,
        started_at=now,
        applied_by=int(applied_by.id) if applied_by is not None else None,
    )
    db.add(apply_row)
    db.flush()

    snapshot = TenantModuleConfigSnapshot(
        tenant_id=tenant_id,
        module_key=str(ctx.offer.module_key),
        snapshot_reason=SNAPSHOT_REASON_APPLY,
        source_module_version=str(ctx.configuration.module_version or ctx.offer.from_version or "1.0.0"),
        target_module_version=to_module_version,
        source_config_version=str(ctx.configuration.config_version or DEFAULT_CONFIG_VERSION),
        config_payload=_build_snapshot_payload(ctx.configuration),
        offer_id=int(ctx.offer.id),
        apply_id=str(apply_row.id),
        created_at=now,
        created_by=int(applied_by.id) if applied_by is not None else None,
    )
    db.add(snapshot)
    db.flush()

    if snapshot.id is None:
        raise ApplyPreconditionError("snapshot_failed", "Не удалось создать snapshot конфигурации")

    ctx.configuration.settings = dict(ctx.target_configuration.get("settings") or {})
    ctx.configuration.permissions = dict(ctx.target_configuration.get("permissions") or {})
    ctx.configuration.views = dict(ctx.target_configuration.get("views") or {})
    ctx.configuration.rules = dict(ctx.target_configuration.get("rules") or {})
    ctx.configuration.templates = dict(ctx.target_configuration.get("templates") or {})
    ctx.configuration.module_version = to_module_version
    ctx.configuration.config_version = to_config_version
    ctx.configuration.schema_version = to_config_version
    ctx.configuration.source = MANIFEST_APPLY_SOURCE
    ctx.configuration.updated_at = now

    ctx.tenant_module.installed_version = to_module_version
    ctx.tenant_module.updated_at = now

    ctx.offer.status = TenantModuleUpdateOfferStatus.APPLIED
    ctx.offer.applied_at = now
    ctx.offer.updated_at = now

    ctx.preview.preview_status = TenantModuleUpdatePreviewStatus.APPLIED
    ctx.preview.updated_at = now

    diff = diff_crud.get_latest_diff_for_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    diff_payload = diff.diff_payload if diff and isinstance(diff.diff_payload, dict) else {}

    record_tenant_event(
        db,
        tenant_id=tenant_id,
        event_code=TENANT_EVENT_CODE_MODULE_CONFIGURATION_APPLIED,
        event_category=TenantEventCategory.SETTINGS.value,
        title=f"Применена конфигурация модуля {ctx.offer.module_key}",
        description=(
            f"Обновление конфигурации {ctx.offer.module_key}: "
            f"{apply_row.from_module_version} → {apply_row.to_module_version}"
        ),
        actor_user=applied_by,
        target_type="tenant_module_configuration_apply",
        target_id=apply_row.id,
        target_name=str(ctx.offer.module_key),
        metadata={
            "tenant_id": tenant_id,
            "module_key": str(ctx.offer.module_key),
            "from_version": apply_row.from_module_version,
            "to_version": apply_row.to_module_version,
            "offer_id": int(ctx.offer.id),
            "apply_id": int(apply_row.id),
            "snapshot_id": int(snapshot.id),
            "diff_id": ctx.diff_id,
            "changes_count": _count_diff_changes(diff_payload),
        },
        slug=f"module-configuration-applied-{tenant_id}-{apply_row.id}",
        commit=False,
    )

    apply_row.status = TenantModuleConfigurationApplyStatus.COMPLETED
    apply_row.completed_at = now

    invalidate_runtime_module_configuration_cache(
        tenant_id,
        str(ctx.offer.module_key),
    )

    db.commit()

    return {
        "apply_id": int(apply_row.id),
        "status": apply_row.status,
        "module_key": str(ctx.offer.module_key),
        "from_module_version": apply_row.from_module_version,
        "to_module_version": apply_row.to_module_version,
        "snapshot_id": int(snapshot.id),
        "changes_count": _count_diff_changes(diff_payload),
    }
