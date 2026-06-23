"""TEMPLATE version pin audit events (WI-IMPL-010, ADR-AUD-001)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import record_platform_event

_TEMPLATE_EVENT = PlatformEventCode.TEMPLATE_VERSION_UPDATED
_REGISTRY_EVENT = PlatformEventCode.PLATFORM_ENVIRONMENT_VERSION_UPDATED


def record_template_version_pin_audit(
    db: Session,
    *,
    deployment: Any,
    release_package_id: int,
    platform_version: str,
    activated_release_id: str,
    environment_version_id: int,
    environment_key: str,
    version_pin_proof: dict[str, Any],
    actor_user_id: int | None = None,
) -> None:
    metadata = {
        "deployment_id": deployment.id,
        "deployment_key": deployment.deployment_key,
        "release_package_id": release_package_id,
        "platform_version": platform_version,
        "activated_release_id": activated_release_id,
        "environment_version_id": environment_version_id,
        "environment_key": environment_key,
        "version_pin_proof": version_pin_proof,
    }
    description = (
        f"deployment_id={deployment.id}; platform_version={platform_version}; "
        f"activated_release_id={activated_release_id}; environment_version_id={environment_version_id}"
    )

    record_platform_event(
        db,
        event_code=_TEMPLATE_EVENT.value,
        event_category=PlatformEventCategory.TEMPLATE.value,
        title=f"Версия эталона обновлена ({deployment.deployment_key})",
        description=description,
        status=PlatformAuditStatus.DONE.value,
        actor_user_id=actor_user_id,
        target_type="platform_deployment",
        target_id=deployment.id,
        target_name=deployment.deployment_key,
        company_id=deployment.target_tenant_id,
        metadata=metadata,
        slug=f"template-version-updated-{deployment.id}",
        commit=False,
    )
    record_platform_event(
        db,
        event_code=_REGISTRY_EVENT.value,
        event_category=PlatformEventCategory.PLATFORM_SETTINGS.value,
        title=f"platform_environment_versions обновлён ({environment_key})",
        description=description,
        status=PlatformAuditStatus.DONE.value,
        actor_user_id=actor_user_id,
        target_type="platform_environment_version",
        target_id=environment_version_id,
        target_name=environment_key,
        company_id=deployment.target_tenant_id,
        metadata=metadata,
        slug=f"platform-environment-version-updated-{deployment.id}",
        commit=False,
    )
