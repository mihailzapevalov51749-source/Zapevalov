"""API router for platform deployment registry."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_deployment_registry import service
from app.modules.platform_deployment_registry.schemas import (
    CreateDeploymentRequest,
    DeploymentResponse,
    MarkFailedRequest,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/deployments",
    tags=["Platform Deployments"],
)


@router.get("", response_model=list[DeploymentResponse])
def list_deployments_endpoint(
    status: str | None = Query(default=None),
    target_environment_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_deployments(
        db,
        status_filter=status,
        target_environment_type_filter=target_environment_type,
    )


@router.get("/{deployment_id}", response_model=DeploymentResponse)
def get_deployment_endpoint(
    deployment_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.get_deployment(db, deployment_id)


@router.post("", response_model=DeploymentResponse, status_code=201)
def create_deployment_endpoint(
    payload: CreateDeploymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    return service.create_deployment(
        db,
        deployment_key=payload.deployment_key,
        release_package_id=payload.release_package_id,
        target_environment_type=payload.target_environment_type,
        target_environment_id=payload.target_environment_id,
        target_tenant_id=payload.target_tenant_id,
        target_schema_revision=payload.target_schema_revision,
        previous_platform_version=payload.previous_platform_version,
        previous_release_package_id=payload.previous_release_package_id,
        deployment_manifest_json=payload.deployment_manifest_json,
        actor=current_user,
    )


@router.post("/{deployment_id}/start", response_model=DeploymentResponse)
def start_deployment_endpoint(
    deployment_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.start_deployment(db, deployment_id=deployment_id)


@router.post("/{deployment_id}/succeed", response_model=DeploymentResponse)
def mark_succeeded_endpoint(
    deployment_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.mark_succeeded(db, deployment_id=deployment_id)


@router.post("/{deployment_id}/fail", response_model=DeploymentResponse)
def mark_failed_endpoint(
    deployment_id: int,
    payload: MarkFailedRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.mark_failed(
        db,
        deployment_id=deployment_id,
        failure_reason=payload.failure_reason,
    )


@router.post("/{deployment_id}/cancel", response_model=DeploymentResponse)
def cancel_deployment_endpoint(
    deployment_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.cancel_deployment(db, deployment_id=deployment_id)

