"""TEMPLATE environment version pin (WI-IMPL-010)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_version_registry import service as platform_version_service
from app.modules.platform_version_registry.models import PlatformEnvironmentVersion

VERSION_PIN_SOURCE = "publish_orchestrator.pin_version"
VERSION_PIN_PROOF_VERSION = "1.0"


def build_version_pin_proof(
    *,
    platform_version: str,
    activated_release_id: str,
    release_package_id: int,
    environment_version_id: int,
    environment_key: str,
    pinned_at: datetime,
) -> dict[str, Any]:
    return {
        "version_pin_proof_version": VERSION_PIN_PROOF_VERSION,
        "status": "pinned",
        "pinned_at": pinned_at.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "platform_version": platform_version,
        "activated_release_id": activated_release_id,
        "release_package_id": release_package_id,
        "environment_version_id": environment_version_id,
        "environment_key": environment_key,
        "source": VERSION_PIN_SOURCE,
    }


def pin_template_environment_version(
    db: Session,
    *,
    deployment: Any,
    tenant_id: int,
    platform_version: str,
    activated_release_id: str,
    release_package_id: int,
    actor_user_id: int | None,
    pinned_at: datetime,
) -> PlatformEnvironmentVersion:
    """Update platform_environment_versions for TEMPLATE tenant (single SoT)."""
    return platform_version_service.record_environment_version(
        db,
        tenant_id=tenant_id,
        platform_version=platform_version,
        installed_by_id=actor_user_id,
        notes=(
            f"deployment_key={deployment.deployment_key}; "
            f"activated_release_id={activated_release_id}; "
            f"release_package_id={release_package_id}; "
            f"source={VERSION_PIN_SOURCE}"
        ),
        change_description=(
            "TEMPLATE publish orchestrator version pin after runtime activation"
        ),
        installed_at=pinned_at.replace(tzinfo=None),
        commit=False,
    )
