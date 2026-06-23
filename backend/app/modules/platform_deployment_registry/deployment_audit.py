"""Deployment kind lifecycle audit helpers (WI-IMPL-005, ADR-AUD-001)."""

from __future__ import annotations

from typing import Any, Literal

from sqlalchemy.orm import Session

from app.modules.platform_deployment_registry.constants import (
    PlatformDeploymentKind,
    PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import (
    record_platform_event,
    record_tenant_event,
)

DeploymentLifecyclePhase = Literal["started", "succeeded", "failed"]

_KIND_EVENT_CODES: dict[str, dict[DeploymentLifecyclePhase, PlatformEventCode]] = {
    PlatformDeploymentKind.TEMPLATE_PUBLISH.value: {
        "started": PlatformEventCode.TEMPLATE_PUBLISH_STARTED,
        "succeeded": PlatformEventCode.TEMPLATE_PUBLISH_SUCCEEDED,
        "failed": PlatformEventCode.TEMPLATE_PUBLISH_FAILED,
    },
    PlatformDeploymentKind.COMPANY_UPDATE.value: {
        "started": PlatformEventCode.COMPANY_UPDATE_STARTED,
        "succeeded": PlatformEventCode.COMPANY_UPDATE_SUCCEEDED,
        "failed": PlatformEventCode.COMPANY_UPDATE_FAILED,
    },
    PlatformDeploymentKind.PROVISION_BASELINE.value: {
        "started": PlatformEventCode.PROVISION_BASELINE_STARTED,
        "succeeded": PlatformEventCode.PROVISION_BASELINE_SUCCEEDED,
        "failed": PlatformEventCode.PROVISION_BASELINE_FAILED,
    },
    PlatformDeploymentKind.ROLLBACK.value: {
        "started": PlatformEventCode.ROLLBACK_STARTED,
        "succeeded": PlatformEventCode.ROLLBACK_SUCCEEDED,
        "failed": PlatformEventCode.ROLLBACK_FAILED,
    },
    PlatformDeploymentKind.DEV_DEPLOY.value: {
        "started": PlatformEventCode.DEV_DEPLOY_STARTED,
        "succeeded": PlatformEventCode.DEV_DEPLOY_SUCCEEDED,
        "failed": PlatformEventCode.DEV_DEPLOY_FAILED,
    },
}

_KIND_TITLES: dict[str, dict[DeploymentLifecyclePhase, str]] = {
    PlatformDeploymentKind.TEMPLATE_PUBLISH.value: {
        "started": "Публикация в эталон: deployment запущен",
        "succeeded": "Публикация в эталон: deployment завершён",
        "failed": "Публикация в эталон: deployment не выполнен",
    },
    PlatformDeploymentKind.COMPANY_UPDATE.value: {
        "started": "Обновление компании: deployment запущен",
        "succeeded": "Обновление компании: deployment завершён",
        "failed": "Обновление компании: deployment не выполнен",
    },
    PlatformDeploymentKind.PROVISION_BASELINE.value: {
        "started": "Provision baseline: deployment запущен",
        "succeeded": "Provision baseline: deployment завершён",
        "failed": "Provision baseline: deployment не выполнен",
    },
    PlatformDeploymentKind.ROLLBACK.value: {
        "started": "Rollback: deployment запущен",
        "succeeded": "Rollback: deployment завершён",
        "failed": "Rollback: deployment не выполнен",
    },
    PlatformDeploymentKind.DEV_DEPLOY.value: {
        "started": "DEV deploy: deployment запущен",
        "succeeded": "DEV deploy: deployment завершён",
        "failed": "DEV deploy: deployment не выполнен",
    },
}


def record_deployment_lifecycle_audit(
    db: Session,
    *,
    deployment: Any,
    phase: DeploymentLifecyclePhase,
    failure_reason: str | None = None,
) -> None:
    kind = str(getattr(deployment, "deployment_kind", "") or "").strip().lower()
    if not kind:
        manifest = deployment.deployment_manifest_json if isinstance(
            deployment.deployment_manifest_json, dict
        ) else {}
        kind = str(manifest.get("deployment_kind") or "").strip().lower()
    if not kind:
        return

    event_codes = _KIND_EVENT_CODES.get(kind)
    titles = _KIND_TITLES.get(kind)
    if event_codes is None or titles is None:
        return

    event_code = event_codes[phase].value
    title = f"{titles[phase]} ({deployment.deployment_key})"
    audit_status = (
        PlatformAuditStatus.DONE.value
        if phase in {"started", "succeeded"}
        else PlatformAuditStatus.ERROR.value
    )
    description = (
        f"deployment_kind={kind}; status={deployment.status}; "
        f"release_package_id={deployment.release_package_id}"
    )
    if failure_reason:
        description = f"{description}; failure_reason={failure_reason}"

    metadata = {
        "deployment_id": deployment.id,
        "deployment_key": deployment.deployment_key,
        "deployment_kind": kind,
        "release_package_id": deployment.release_package_id,
        "target_environment_type": deployment.target_environment_type,
        "phase": phase,
        "failure_reason": failure_reason,
    }
    slug = f"deployment-{kind}-{phase}-{deployment.id}"

    target_type = str(deployment.target_environment_type or "").strip().lower()
    tenant_id = deployment.target_tenant_id
    if target_type == PlatformDeploymentTargetEnvironmentType.CLIENT.value and tenant_id is not None:
        record_tenant_event(
            db,
            tenant_id=tenant_id,
            event_code=event_code,
            event_category=PlatformEventCategory.PUBLICATION.value,
            title=title,
            description=description,
            status=audit_status,
            target_type="platform_deployment",
            target_id=deployment.id,
            target_name=deployment.deployment_key,
            metadata=metadata,
            slug=slug,
            commit=False,
        )
        return

    record_platform_event(
        db,
        event_code=event_code,
        event_category=PlatformEventCategory.PUBLICATION.value,
        title=title,
        description=description,
        status=audit_status,
        target_type="platform_deployment",
        target_id=deployment.id,
        target_name=deployment.deployment_key,
        company_id=tenant_id,
        metadata=metadata,
        slug=slug,
        commit=False,
    )
