"""Deployment kind contract and runtime routing (WI-IMPL-005, ADR-DEP-001)."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_deployment_registry.constants import (
    DEPLOYMENT_KIND_TARGET_ENVIRONMENT,
    DEPLOYMENT_KIND_VALUES,
    PROVISION_BASELINE_RELEASE_ID,
    PlatformDeploymentKind,
    PlatformDeploymentStatus,
    PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.portals.models import Portal

_LEGACY_CREATED_VIA_KIND: dict[str, str] = {
    "platform_releases_api_adapter": PlatformDeploymentKind.TEMPLATE_PUBLISH.value,
    "tenant_update_apply": PlatformDeploymentKind.COMPANY_UPDATE.value,
    "provision_baseline": PlatformDeploymentKind.PROVISION_BASELINE.value,
    "deployment_rollback": PlatformDeploymentKind.ROLLBACK.value,
    "dev_deploy": PlatformDeploymentKind.DEV_DEPLOY.value,
}


def normalize_deployment_kind(value: str | None) -> str:
    return str(value or "").strip().lower()


def is_valid_deployment_kind(value: str | None) -> bool:
    return normalize_deployment_kind(value) in DEPLOYMENT_KIND_VALUES


def infer_deployment_kind(
    *,
    target_environment_type: str,
    deployment_manifest_json: dict[str, Any] | None = None,
    previous_release_package_id: int | None = None,
) -> str:
    manifest = deployment_manifest_json if isinstance(deployment_manifest_json, dict) else {}
    explicit = normalize_deployment_kind(manifest.get("deployment_kind"))
    if is_valid_deployment_kind(explicit):
        return explicit

    created_via = str(manifest.get("created_via") or "").strip()
    if created_via in _LEGACY_CREATED_VIA_KIND:
        return _LEGACY_CREATED_VIA_KIND[created_via]

    if previous_release_package_id is not None and manifest.get("parent_deployment_id") is not None:
        return PlatformDeploymentKind.ROLLBACK.value

    target_type = str(target_environment_type or "").strip().lower()
    if target_type == PlatformDeploymentTargetEnvironmentType.DEV.value:
        return PlatformDeploymentKind.DEV_DEPLOY.value
    if target_type == PlatformDeploymentTargetEnvironmentType.CLIENT.value:
        return PlatformDeploymentKind.COMPANY_UPDATE.value
    return PlatformDeploymentKind.TEMPLATE_PUBLISH.value


def validate_deployment_kind_contract(
    *,
    deployment_kind: str,
    target_environment_type: str,
    target_tenant_id: int | None,
    previous_release_package_id: int | None = None,
) -> None:
    normalized_kind = normalize_deployment_kind(deployment_kind)
    if not is_valid_deployment_kind(normalized_kind):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "deployment_kind должен быть одним из: "
                + ", ".join(sorted(DEPLOYMENT_KIND_VALUES))
            ),
        )

    target_type = str(target_environment_type or "").strip().lower()
    allowed_targets = DEPLOYMENT_KIND_TARGET_ENVIRONMENT.get(normalized_kind, frozenset())
    if target_type not in allowed_targets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"deployment_kind={normalized_kind} не допускает "
                f"target_environment_type={target_type}"
            ),
        )

    if normalized_kind in {
        PlatformDeploymentKind.TEMPLATE_PUBLISH.value,
        PlatformDeploymentKind.COMPANY_UPDATE.value,
        PlatformDeploymentKind.PROVISION_BASELINE.value,
        PlatformDeploymentKind.ROLLBACK.value,
    } and target_tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"target_tenant_id обязателен для deployment_kind={normalized_kind}",
        )

    if normalized_kind == PlatformDeploymentKind.ROLLBACK.value and previous_release_package_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="previous_release_package_id обязателен для deployment_kind=rollback",
        )


def _resolve_company_runtime_slot(db: Session, *, target_tenant_id: int) -> str:
    portal = (
        db.query(Portal)
        .filter(Portal.id == target_tenant_id)
        .one_or_none()
    )
    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"target_tenant_id={target_tenant_id} не найден",
        )
    company_code = str(portal.code or "").strip()
    if not company_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"target_tenant_id={target_tenant_id} не имеет технического code для runtime routing",
        )
    return f"company/{company_code}"


def _resolve_rollback_release_id(
    db: Session,
    *,
    target_tenant_id: int | None,
    previous_release_package_id: int | None,
    manifest: dict[str, Any],
) -> str | None:
    explicit = manifest.get("rollback_release_id") or manifest.get("materialized_release_id")
    if explicit is not None and str(explicit).strip():
        return str(explicit).strip()

    if previous_release_package_id is None or target_tenant_id is None:
        return None

    previous_deployment = (
        db.query(PlatformDeployment)
        .filter(
            PlatformDeployment.release_package_id == previous_release_package_id,
            PlatformDeployment.target_tenant_id == target_tenant_id,
            PlatformDeployment.status == PlatformDeploymentStatus.SUCCEEDED.value,
        )
        .order_by(PlatformDeployment.finished_at.desc(), PlatformDeployment.id.desc())
        .first()
    )
    if previous_deployment is None:
        return None

    prev_manifest = (
        previous_deployment.deployment_manifest_json
        if isinstance(previous_deployment.deployment_manifest_json, dict)
        else {}
    )
    release_id = prev_manifest.get("materialized_release_id")
    if release_id is not None and str(release_id).strip():
        return str(release_id).strip()
    return None


def resolve_runtime_routing(
    db: Session,
    *,
    deployment_kind: str,
    target_tenant_id: int | None,
    deployment_manifest_json: dict[str, Any] | None,
    previous_release_package_id: int | None = None,
) -> dict[str, Any]:
    """
    Resolve runtime slot and optional pinned release for verify/materialization routing.

    Does not perform materialization — only computes routing hints stored in manifest.
    """
    manifest = dict(deployment_manifest_json or {})
    kind = normalize_deployment_kind(deployment_kind)
    routing: dict[str, Any] = {"deployment_kind": kind}

    if kind == PlatformDeploymentKind.TEMPLATE_PUBLISH.value:
        routing["runtime_slot_key"] = PlatformDeploymentTargetEnvironmentType.TEMPLATE.value
    elif kind == PlatformDeploymentKind.DEV_DEPLOY.value:
        routing["runtime_slot_key"] = PlatformDeploymentTargetEnvironmentType.DEV.value
    elif kind in {
        PlatformDeploymentKind.COMPANY_UPDATE.value,
        PlatformDeploymentKind.PROVISION_BASELINE.value,
        PlatformDeploymentKind.ROLLBACK.value,
    }:
        if target_tenant_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"target_tenant_id обязателен для deployment_kind={kind}",
            )
        routing["runtime_slot_key"] = _resolve_company_runtime_slot(db, target_tenant_id=target_tenant_id)
    else:
        routing["runtime_slot_key"] = manifest.get("runtime_slot_key") or "template"

    if kind == PlatformDeploymentKind.PROVISION_BASELINE.value:
        routing["materialized_release_id"] = (
            manifest.get("materialized_release_id") or PROVISION_BASELINE_RELEASE_ID
        )
    elif kind == PlatformDeploymentKind.ROLLBACK.value:
        rollback_release_id = _resolve_rollback_release_id(
            db,
            target_tenant_id=target_tenant_id,
            previous_release_package_id=previous_release_package_id,
            manifest=manifest,
        )
        if rollback_release_id:
            routing["materialized_release_id"] = rollback_release_id
    elif manifest.get("materialized_release_id"):
        routing["materialized_release_id"] = str(manifest["materialized_release_id"]).strip()

    return routing


def enrich_deployment_manifest(
    db: Session,
    *,
    deployment_kind: str,
    target_tenant_id: int | None,
    deployment_manifest_json: dict[str, Any] | None,
    previous_release_package_id: int | None = None,
) -> dict[str, Any]:
    manifest = dict(deployment_manifest_json or {})
    routing = resolve_runtime_routing(
        db,
        deployment_kind=deployment_kind,
        target_tenant_id=target_tenant_id,
        deployment_manifest_json=manifest,
        previous_release_package_id=previous_release_package_id,
    )
    manifest.update(routing)
    manifest["deployment_kind"] = normalize_deployment_kind(deployment_kind)
    return manifest
