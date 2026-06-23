"""TEMPLATE release verification audit events (WI-IMPL-008, ADR-AUD-001)."""

from __future__ import annotations

from typing import Any, Literal

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import record_platform_event

VerifyAuditPhase = Literal["started", "passed", "failed"]

_EVENT_CODES: dict[VerifyAuditPhase, PlatformEventCode] = {
    "started": PlatformEventCode.TEMPLATE_VERIFY_STARTED,
    "passed": PlatformEventCode.TEMPLATE_VERIFY_PASSED,
    "failed": PlatformEventCode.TEMPLATE_VERIFY_FAILED,
}

_TITLES: dict[VerifyAuditPhase, str] = {
    "started": "Проверка версии эталона: начата",
    "passed": "Проверка версии эталона: успешно",
    "failed": "Проверка версии эталона: ошибка",
}


def record_template_verify_audit(
    db: Session,
    *,
    deployment: Any,
    phase: VerifyAuditPhase,
    release_package_id: int,
    materialized_release_id: str | None = None,
    verify_proof: dict[str, Any] | None = None,
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
    if materialized_release_id:
        description = f"{description}; materialized_release_id={materialized_release_id}"
    if failure_reason:
        description = f"{description}; failure_reason={failure_reason}"

    metadata: dict[str, Any] = {
        "deployment_id": deployment.id,
        "deployment_key": deployment.deployment_key,
        "release_package_id": release_package_id,
        "materialized_release_id": materialized_release_id,
        "phase": phase,
        "failure_reason": failure_reason,
    }
    if verify_proof is not None:
        metadata["verify_proof"] = verify_proof

    slug = f"template-verify-{phase}-{deployment.id}"

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
