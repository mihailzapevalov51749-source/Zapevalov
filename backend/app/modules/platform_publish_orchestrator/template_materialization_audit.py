"""TEMPLATE materialization audit events (WI-IMPL-007, ADR-AUD-001)."""

from __future__ import annotations

from typing import Any, Literal

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import record_platform_event

MaterializationAuditPhase = Literal["started", "succeeded", "failed"]

_EVENT_CODES: dict[MaterializationAuditPhase, PlatformEventCode] = {
    "started": PlatformEventCode.TEMPLATE_MATERIALIZATION_STARTED,
    "succeeded": PlatformEventCode.TEMPLATE_MATERIALIZATION_SUCCEEDED,
    "failed": PlatformEventCode.TEMPLATE_MATERIALIZATION_FAILED,
}

_TITLES: dict[MaterializationAuditPhase, str] = {
    "started": "Материализация эталона: начата",
    "succeeded": "Материализация эталона: успешно",
    "failed": "Материализация эталона: ошибка",
}


def record_template_materialization_audit(
    db: Session,
    *,
    deployment: Any,
    phase: MaterializationAuditPhase,
    release_package_id: int,
    materialized_release_id: str | None = None,
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

    metadata = {
        "deployment_id": deployment.id,
        "deployment_key": deployment.deployment_key,
        "release_package_id": release_package_id,
        "materialized_release_id": materialized_release_id,
        "phase": phase,
        "failure_reason": failure_reason,
    }
    slug = f"template-materialization-{phase}-{deployment.id}"

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
