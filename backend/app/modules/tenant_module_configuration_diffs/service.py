"""Service layer for tenant module configuration diffs."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_release.resolvers import resolve_release_version
from app.modules.portals.models import Portal
from app.modules.tenant_module_configuration_diffs import crud
from app.modules.tenant_module_configuration_diffs.models import TenantModuleConfigurationDiff
from app.modules.tenant_module_configuration_diffs.schemas import (
    TenantModuleConfigurationDiffListItemOut,
    TenantModuleConfigurationDiffOut,
    TenantModuleConfigurationDiffPayloadOut,
)


def _resolve_module_title(db: Session, module_key: str) -> str | None:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    return module.title if module is not None else None


def _resolve_tenant_name(db: Session, tenant_id: int) -> str | None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    return portal.name if portal is not None else None


def _resolve_release_version(db: Session, release_id: int | None) -> str | None:
    return resolve_release_version(db, release_id)


def _serialize_diff_payload(raw_payload: dict[str, Any] | None) -> TenantModuleConfigurationDiffPayloadOut:
    payload = raw_payload if isinstance(raw_payload, dict) else {}
    return TenantModuleConfigurationDiffPayloadOut(
        settings=payload.get("settings") or {},
        permissions=payload.get("permissions") or {},
        views=payload.get("views") or {},
        rules=payload.get("rules") or {},
        templates=payload.get("templates") or {},
    )


def serialize_diff(db: Session, diff: TenantModuleConfigurationDiff) -> TenantModuleConfigurationDiffOut:
    return TenantModuleConfigurationDiffOut(
        id=diff.id,
        tenant_id=diff.tenant_id,
        tenant_name=_resolve_tenant_name(db, diff.tenant_id),
        module_key=diff.module_key,
        module_title=_resolve_module_title(db, diff.module_key),
        offer_id=diff.offer_id,
        release_id=diff.release_id,
        release_version=_resolve_release_version(db, diff.release_id),
        from_module_version=diff.from_module_version,
        to_module_version=diff.to_module_version,
        from_config_version=diff.from_config_version,
        to_config_version=diff.to_config_version,
        diff_payload=_serialize_diff_payload(diff.diff_payload if isinstance(diff.diff_payload, dict) else {}),
        risk_level=diff.risk_level,
        generated_at=diff.generated_at,
    )


def serialize_diff_list_item(
    db: Session,
    diff: TenantModuleConfigurationDiff,
) -> TenantModuleConfigurationDiffListItemOut:
    return TenantModuleConfigurationDiffListItemOut(
        id=diff.id,
        tenant_id=diff.tenant_id,
        tenant_name=_resolve_tenant_name(db, diff.tenant_id),
        module_key=diff.module_key,
        module_title=_resolve_module_title(db, diff.module_key),
        from_module_version=diff.from_module_version,
        to_module_version=diff.to_module_version,
        from_config_version=diff.from_config_version,
        to_config_version=diff.to_config_version,
        risk_level=diff.risk_level,
        generated_at=diff.generated_at,
    )


def get_module_configuration_diff(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> TenantModuleConfigurationDiffOut | None:
    diff = crud.get_latest_diff_for_module(db, tenant_id=tenant_id, module_key=module_key)
    if diff is None:
        return None
    return serialize_diff(db, diff)


def get_offer_configuration_diff(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
) -> TenantModuleConfigurationDiffOut | None:
    diff = crud.get_latest_diff_for_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if diff is None:
        return None
    return serialize_diff(db, diff)


def get_configuration_diff_by_id(
    db: Session,
    diff_id: int,
) -> TenantModuleConfigurationDiffOut | None:
    diff = crud.get_diff_by_id(db, diff_id=diff_id)
    if diff is None:
        return None
    return serialize_diff(db, diff)


def list_all_configuration_diffs(db: Session) -> list[TenantModuleConfigurationDiffListItemOut]:
    return [serialize_diff_list_item(db, diff) for diff in crud.list_all_diffs(db)]
