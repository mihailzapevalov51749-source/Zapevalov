"""Service layer for platform deployment registry."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_deployment_registry.constants import (
    DEPLOYMENT_KEY_PATTERN,
    PlatformDeploymentStatus,
    PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release_package_registry.constants import PlatformReleasePackageStatus
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry import service as platform_version_service
from app.modules.users.models import User

TERMINAL_DEPLOYMENT_STATUSES: frozenset[str] = frozenset(
    {
        PlatformDeploymentStatus.SUCCEEDED.value,
        PlatformDeploymentStatus.FAILED.value,
        PlatformDeploymentStatus.CANCELLED.value,
        PlatformDeploymentStatus.ROLLED_BACK.value,
    }
)


def list_deployments(
    db: Session,
    *,
    status_filter: str | None = None,
    target_environment_type_filter: str | None = None,
) -> list[PlatformDeployment]:
    query = db.query(PlatformDeployment).order_by(
        PlatformDeployment.created_at.desc(),
        PlatformDeployment.id.desc(),
    )
    if status_filter:
        query = query.filter(PlatformDeployment.status == status_filter.strip().lower())
    if target_environment_type_filter:
        query = query.filter(
            PlatformDeployment.target_environment_type
            == target_environment_type_filter.strip().lower()
        )
    return query.all()


def get_deployment(db: Session, deployment_id: int) -> PlatformDeployment:
    deployment = (
        db.query(PlatformDeployment)
        .filter(PlatformDeployment.id == deployment_id)
        .one_or_none()
    )
    if deployment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment не найден",
        )
    return deployment


def create_deployment(
    db: Session,
    *,
    deployment_key: str,
    release_package_id: int,
    target_environment_type: str,
    target_environment_id: str | None = None,
    target_tenant_id: int | None = None,
    target_schema_revision: str | None = None,
    previous_platform_version: str | None = None,
    previous_release_package_id: int | None = None,
    deployment_manifest_json: dict[str, Any] | None = None,
    actor: User | None = None,
) -> PlatformDeployment:
    normalized_key = str(deployment_key or "").strip().upper()
    normalized_target_type = str(target_environment_type or "").strip().lower()
    if not DEPLOYMENT_KEY_PATTERN.match(normalized_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="deployment_key должен соответствовать формату DPL-YYYYMMDD-NNNN",
        )
    if normalized_target_type not in {
        PlatformDeploymentTargetEnvironmentType.TEMPLATE.value,
        PlatformDeploymentTargetEnvironmentType.CLIENT.value,
        PlatformDeploymentTargetEnvironmentType.DEV.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_environment_type должен быть template, client или dev",
        )

    release_package = _get_release_package_or_400(db, release_package_id)
    if release_package.status != PlatformReleasePackageStatus.PUBLISHED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deployment можно создать только из published release package",
        )

    existing = (
        db.query(PlatformDeployment)
        .filter(PlatformDeployment.deployment_key == normalized_key)
        .one_or_none()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Deployment {normalized_key} уже существует",
        )

    target_schema_value = target_schema_revision or _extract_schema_revision(
        deployment_manifest_json or {},
        release_package.package_manifest_json if isinstance(release_package.package_manifest_json, dict) else {},
    )
    deployment = PlatformDeployment(
        deployment_key=normalized_key,
        release_package_id=release_package_id,
        target_environment_type=normalized_target_type,
        target_environment_id=target_environment_id,
        target_tenant_id=target_tenant_id,
        status=PlatformDeploymentStatus.PLANNED.value,
        target_platform_version=release_package.platform_version,
        target_schema_revision=target_schema_value,
        previous_platform_version=previous_platform_version,
        previous_release_package_id=previous_release_package_id,
        deployment_manifest_json=dict(deployment_manifest_json or {}),
        created_by=actor.id if actor and actor.id else None,
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    return deployment


def start_deployment(db: Session, *, deployment_id: int) -> PlatformDeployment:
    deployment = get_deployment(db, deployment_id)
    _assert_transition(
        current_status=deployment.status,
        allowed_from={PlatformDeploymentStatus.PLANNED.value},
        action="start_deployment",
    )
    deployment.status = PlatformDeploymentStatus.RUNNING.value
    deployment.started_at = datetime.utcnow()
    deployment.failure_reason = None
    db.commit()
    db.refresh(deployment)
    return deployment


def mark_succeeded(db: Session, *, deployment_id: int) -> PlatformDeployment:
    deployment = get_deployment(db, deployment_id)
    _assert_transition(
        current_status=deployment.status,
        allowed_from={PlatformDeploymentStatus.RUNNING.value},
        action="mark_succeeded",
    )
    now = datetime.utcnow()
    deployment.status = PlatformDeploymentStatus.SUCCEEDED.value
    deployment.finished_at = now
    deployment.failure_reason = None
    _apply_environment_success_write_path(
        db,
        deployment=deployment,
        succeeded_at=now,
    )
    db.commit()
    db.refresh(deployment)
    return deployment


def mark_failed(
    db: Session,
    *,
    deployment_id: int,
    failure_reason: str,
) -> PlatformDeployment:
    deployment = get_deployment(db, deployment_id)
    _assert_transition(
        current_status=deployment.status,
        allowed_from={PlatformDeploymentStatus.RUNNING.value},
        action="mark_failed",
    )
    reason = str(failure_reason or "").strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="failure_reason обязателен",
        )
    deployment.status = PlatformDeploymentStatus.FAILED.value
    deployment.finished_at = datetime.utcnow()
    deployment.failure_reason = reason
    db.commit()
    db.refresh(deployment)
    return deployment


def cancel_deployment(db: Session, *, deployment_id: int) -> PlatformDeployment:
    deployment = get_deployment(db, deployment_id)
    _assert_transition(
        current_status=deployment.status,
        allowed_from={
            PlatformDeploymentStatus.PLANNED.value,
            PlatformDeploymentStatus.RUNNING.value,
        },
        action="cancel_deployment",
    )
    deployment.status = PlatformDeploymentStatus.CANCELLED.value
    deployment.finished_at = datetime.utcnow()
    db.commit()
    db.refresh(deployment)
    return deployment


def _assert_transition(*, current_status: str, allowed_from: set[str], action: str) -> None:
    if current_status in TERMINAL_DEPLOYMENT_STATUSES and current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Статус {current_status} терминальный, операция {action} запрещена",
        )
    if current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Переход {current_status} -> {action} запрещен",
        )


def _get_release_package_or_400(db: Session, release_package_id: int) -> PlatformReleasePackage:
    package = (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.id == release_package_id)
        .one_or_none()
    )
    if package is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Release package {release_package_id} не найден",
        )
    return package


def _extract_schema_revision(
    deployment_manifest_json: dict[str, Any],
    package_manifest_json: dict[str, Any],
) -> str | None:
    deployment_schema = deployment_manifest_json.get("schema_revision")
    if deployment_schema is not None and str(deployment_schema).strip():
        return str(deployment_schema).strip()
    package_schema = package_manifest_json.get("schema_revision")
    if package_schema is not None and str(package_schema).strip():
        return str(package_schema).strip()
    return None


def _apply_environment_success_write_path(
    db: Session,
    *,
    deployment: PlatformDeployment,
    succeeded_at: datetime,
) -> None:
    tenant_id = deployment.target_tenant_id
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_tenant_id обязателен для mark_succeeded write-path",
        )

    schema_part = (
        f", schema_revision={deployment.target_schema_revision}"
        if deployment.target_schema_revision
        else ""
    )
    previous_version_part = (
        f", previous_version={deployment.previous_platform_version}"
        if deployment.previous_platform_version
        else ""
    )
    platform_version_service.record_environment_version(
        db,
        tenant_id=tenant_id,
        platform_version=deployment.target_platform_version,
        installed_by_id=deployment.created_by,
        notes=(
            f"deployment_key={deployment.deployment_key}; "
            f"release_package_id={deployment.release_package_id}{schema_part}"
        ),
        change_description=(
            f"Deployment succeeded for {deployment.target_environment_type}"
            f"{previous_version_part}"
        ),
        installed_at=succeeded_at,
        commit=False,
    )

