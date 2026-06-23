"""TEMPLATE activation audit events (WI-IMPL-009, ADR-AUD-001)."""

from __future__ import annotations

from typing import Any, Literal

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import record_platform_event

ActivationAuditPhase = Literal["started", "succeeded", "failed"]

_EVENT_CODES: dict[ActivationAuditPhase, PlatformEventCode] = {
    "started": PlatformEventCode.TEMPLATE_ACTIVATION_STARTED,
    "succeeded": PlatformEventCode.TEMPLATE_ACTIVATION_SUCCEEDED,
    "failed": PlatformEventCode.TEMPLATE_ACTIVATION_FAILED,
}

_TITLES: dict[ActivationAuditPhase, str] = {
    "started": "Активация эталона: начата",
    "succeeded": "Активация эталона: успешно",
    "failed": "Активация эталона: ошибка",
}


def record_template_activation_audit(
    db: Session,
    *,
    deployment: Any,
    phase: ActivationAuditPhase,
    release_package_id: int,
    activated_release_id: str | None = None,
    previous_release_id: str | None = None,
    failure_reason: str | None = None,
    actor_user_id: int | None = None,
) -> None:
    event_code = _EVENT_CODES[phase].value
    title = f"{_TITLES[phase]} ({deployment.deployment_key})"
    audit_status = (
        PlatformAuditStatus.ERROR.value
        if phase == "failed"
        else PlatformAuditStatus.DONE.value
    )
    description = (
        f"deployment_id={deployment.id}; release_package_id={release_package_id}"
    )
    if activated_release_id:
        description = f"{description}; activated_release_id={activated_release_id}"
    if previous_release_id:
        description = f"{description}; previous_release_id={previous_release_id}"
    if failure_reason:
        description = f"{description}; failure_reason={failure_reason}"

    metadata: dict[str, Any] = {
        "deployment_id": deployment.id,
        "deployment_key": deployment.deployment_key,
        "release_package_id": release_package_id,
        "activated_release_id": activated_release_id,
        "previous_release_id": previous_release_id,
        "phase": phase,
        "failure_reason": failure_reason,
    }
    slug = f"template-activation-{phase}-{deployment.id}"

    record_platform_event(
        db,
        event_code=event_code,
        event_category=PlatformEventCategory.TEMPLATE.value,
        title=title,
        description=description,
        status=audit_status,
        actor_user_id=actor_user_id,
        target_type="platform_deployment",
        target_id=deployment.id,
        target_name=deployment.deployment_key,
        company_id=deployment.target_tenant_id,
        metadata=metadata,
        slug=slug,
        commit=False,
    )
