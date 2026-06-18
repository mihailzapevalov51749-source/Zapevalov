"""Rollback module configuration updates from apply snapshots."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_service import record_tenant_event
from app.modules.platform_event_journal.tenant_audit_constants import TenantEventCategory
from app.modules.tenant_module_configuration_applies.constants import (
    SNAPSHOT_REASON_APPLY,
    TenantModuleConfigurationApplyStatus,
)
from app.modules.tenant_module_configuration_applies.crud import get_apply
from app.modules.tenant_module_configuration_applies.models import TenantModuleConfigurationApply
from app.modules.tenant_module_configuration_rollbacks.constants import (
    SNAPSHOT_ROLLBACK_SOURCE,
    TENANT_EVENT_CODE_MODULE_CONFIGURATION_ROLLED_BACK,
    TenantModuleConfigurationRollbackStatus,
)
from app.modules.tenant_module_configuration_rollbacks.exceptions import RollbackPreconditionError
from app.modules.tenant_module_configuration_rollbacks.models import TenantModuleConfigurationRollback
from app.modules.tenant_module_configurations.constants import DEFAULT_CONFIG_VERSION
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.models import TenantModuleConfigSnapshot, TenantModuleConfiguration
from app.modules.tenant_module_configurations.runtime.cache import (
    invalidate_runtime_module_configuration_cache,
)
from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus
from app.modules.tenant_module_update_offers.crud import get_offer
from app.modules.tenant_module_update_previews.constants import TenantModuleUpdatePreviewStatus
from app.modules.tenant_module_update_previews.crud import get_preview
from app.modules.tenant_modules.crud import get_tenant_module
from app.modules.tenant_modules.models import TenantModule
from app.modules.tenant_management.exceptions import TenantWriteForbiddenError
from app.modules.tenant_management.tenant_write_policy import assert_tenant_allows_rollback_target


@dataclass(frozen=True)
class RollbackContext:
    apply: TenantModuleConfigurationApply
    snapshot: TenantModuleConfigSnapshot
    configuration: TenantModuleConfiguration
    tenant_module: TenantModule


def _get_snapshot_for_apply(
    db: Session,
    *,
    tenant_id: int,
    apply_id: int,
) -> TenantModuleConfigSnapshot | None:
    return (
        db.query(TenantModuleConfigSnapshot)
        .filter(
            TenantModuleConfigSnapshot.tenant_id == tenant_id,
            TenantModuleConfigSnapshot.apply_id == str(apply_id),
            TenantModuleConfigSnapshot.snapshot_reason == SNAPSHOT_REASON_APPLY,
        )
        .order_by(TenantModuleConfigSnapshot.id.desc())
        .first()
    )


def _extract_snapshot_payload(snapshot: TenantModuleConfigSnapshot) -> dict[str, Any]:
    payload = snapshot.config_payload if isinstance(snapshot.config_payload, dict) else {}
    return dict(payload)


def validate_rollback_preconditions(
    db: Session,
    *,
    tenant_id: int,
    apply_id: int,
) -> RollbackContext:
    try:
        assert_tenant_allows_rollback_target(db, tenant_id)
    except TenantWriteForbiddenError as error:
        raise RollbackPreconditionError("rollback_target_forbidden", str(error)) from error

    apply_row = get_apply(db, tenant_id=tenant_id, apply_id=apply_id)
    if apply_row is None:
        raise RollbackPreconditionError("apply_not_found", "Apply конфигурации модуля не найден")

    if apply_row.status == TenantModuleConfigurationApplyStatus.ROLLED_BACK:
        raise RollbackPreconditionError(
            "apply_already_rolled_back",
            "Rollback для этого Apply уже выполнен",
        )
    if apply_row.status == TenantModuleConfigurationApplyStatus.FAILED:
        raise RollbackPreconditionError(
            "apply_failed",
            "Rollback недоступен для failed Apply",
        )
    if apply_row.status != TenantModuleConfigurationApplyStatus.COMPLETED:
        raise RollbackPreconditionError(
            "apply_not_completed",
            "Rollback доступен только для completed Apply",
        )

    snapshot = _get_snapshot_for_apply(db, tenant_id=tenant_id, apply_id=apply_id)
    if snapshot is None:
        raise RollbackPreconditionError("snapshot_missing", "Snapshot конфигурации не найден")

    configuration = get_configuration(db, tenant_id=tenant_id, module_key=str(apply_row.module_key))
    if configuration is None:
        raise RollbackPreconditionError(
            "configuration_missing",
            "Конфигурация модуля компании не найдена",
        )

    tenant_module = get_tenant_module(db, tenant_id=tenant_id, module_key=str(apply_row.module_key))
    if tenant_module is None:
        raise RollbackPreconditionError(
            "tenant_module_missing",
            "Установленный модуль компании не найден",
        )

    return RollbackContext(
        apply=apply_row,
        snapshot=snapshot,
        configuration=configuration,
        tenant_module=tenant_module,
    )


def rollback_module_configuration(
    db: Session,
    *,
    tenant_id: int,
    apply_id: int,
    rolled_back_by: User | None = None,
) -> dict[str, Any]:
    ctx = validate_rollback_preconditions(db, tenant_id=tenant_id, apply_id=apply_id)
    now = datetime.utcnow()

    snapshot_payload = _extract_snapshot_payload(ctx.snapshot)
    restored_module_version = str(
        snapshot_payload.get("module_version")
        or ctx.snapshot.source_module_version
        or ctx.apply.from_module_version
        or "1.0.0"
    )
    restored_config_version = str(
        snapshot_payload.get("config_version")
        or ctx.snapshot.source_config_version
        or ctx.apply.from_config_version
        or DEFAULT_CONFIG_VERSION
    )
    restored_schema_version = str(
        snapshot_payload.get("schema_version") or restored_config_version
    )
    restored_source = str(snapshot_payload.get("source") or SNAPSHOT_ROLLBACK_SOURCE)

    rollback_row = TenantModuleConfigurationRollback(
        tenant_id=tenant_id,
        module_key=str(ctx.apply.module_key),
        apply_id=int(ctx.apply.id),
        snapshot_id=int(ctx.snapshot.id),
        from_module_version=str(ctx.configuration.module_version or ctx.apply.to_module_version),
        to_module_version=restored_module_version,
        from_config_version=str(ctx.configuration.config_version or ctx.apply.to_config_version),
        to_config_version=restored_config_version,
        status=TenantModuleConfigurationRollbackStatus.STARTED,
        started_at=now,
        rolled_back_by=int(rolled_back_by.id) if rolled_back_by is not None else None,
    )
    db.add(rollback_row)
    db.flush()

    ctx.configuration.settings = dict(snapshot_payload.get("settings") or {})
    ctx.configuration.permissions = dict(snapshot_payload.get("permissions") or {})
    ctx.configuration.views = dict(snapshot_payload.get("views") or {})
    ctx.configuration.rules = dict(snapshot_payload.get("rules") or {})
    ctx.configuration.templates = dict(snapshot_payload.get("templates") or {})
    ctx.configuration.module_version = restored_module_version
    ctx.configuration.config_version = restored_config_version
    ctx.configuration.schema_version = restored_schema_version
    ctx.configuration.source = restored_source
    ctx.configuration.updated_at = now

    ctx.tenant_module.installed_version = restored_module_version
    ctx.tenant_module.updated_at = now

    ctx.apply.status = TenantModuleConfigurationApplyStatus.ROLLED_BACK
    ctx.apply.notes = f"rolled_back_by={rollback_row.id}"
    ctx.apply.rollback_id = int(rollback_row.id)

    if ctx.apply.offer_id is not None:
        offer = get_offer(db, tenant_id=tenant_id, offer_id=int(ctx.apply.offer_id))
        if offer is not None:
            offer.status = TenantModuleUpdateOfferStatus.AVAILABLE
            offer.applied_at = None
            offer.updated_at = now

    if ctx.apply.preview_id is not None:
        preview = get_preview(db, tenant_id=tenant_id, preview_id=int(ctx.apply.preview_id))
        if preview is not None:
            preview.preview_status = TenantModuleUpdatePreviewStatus.GENERATED
            preview.updated_at = now

    record_tenant_event(
        db,
        tenant_id=tenant_id,
        event_code=TENANT_EVENT_CODE_MODULE_CONFIGURATION_ROLLED_BACK,
        event_category=TenantEventCategory.SETTINGS.value,
        title=f"Откат конфигурации модуля {ctx.apply.module_key}",
        description=(
            f"Rollback конфигурации {ctx.apply.module_key}: "
            f"{rollback_row.from_module_version} → {rollback_row.to_module_version}"
        ),
        actor_user=rolled_back_by,
        target_type="tenant_module_configuration_rollback",
        target_id=rollback_row.id,
        target_name=str(ctx.apply.module_key),
        metadata={
            "tenant_id": tenant_id,
            "module_key": str(ctx.apply.module_key),
            "apply_id": int(ctx.apply.id),
            "rollback_id": int(rollback_row.id),
            "snapshot_id": int(ctx.snapshot.id),
            "from_version": rollback_row.from_module_version,
            "to_version": rollback_row.to_module_version,
        },
        slug=f"module-configuration-rolled-back-{tenant_id}-{rollback_row.id}",
        commit=False,
    )

    rollback_row.status = TenantModuleConfigurationRollbackStatus.COMPLETED
    rollback_row.completed_at = now

    invalidate_runtime_module_configuration_cache(
        tenant_id,
        str(ctx.apply.module_key),
    )

    db.commit()

    return {
        "rollback_id": int(rollback_row.id),
        "status": rollback_row.status,
        "module_key": str(ctx.apply.module_key),
        "apply_id": int(ctx.apply.id),
        "snapshot_id": int(ctx.snapshot.id),
    }
