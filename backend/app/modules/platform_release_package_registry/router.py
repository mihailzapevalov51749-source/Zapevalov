"""API router for platform release package registry."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_release_package_registry import service
from app.modules.platform_release_package_registry.schemas import (
    CancelReleasePackageRequest,
    CreateReleasePackageRequest,
    ReleasePackageResponse,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/release-packages",
    tags=["Platform Release Packages"],
)


@router.get("", response_model=list[ReleasePackageResponse])
def list_release_packages_endpoint(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_release_packages(db, status_filter=status)


@router.get("/{package_id}", response_model=ReleasePackageResponse)
def get_release_package_endpoint(
    package_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.get_release_package(db, package_id)


@router.post("", response_model=ReleasePackageResponse, status_code=201)
def create_release_package_endpoint(
    payload: CreateReleasePackageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    package = service.create_release_package(
        db,
        package_key=payload.package_key,
        build_id=payload.build_id,
        platform_version=payload.platform_version,
        package_manifest_json=payload.package_manifest_json,
        module_bom_json=payload.module_bom_json,
        actor=current_user,
    )
    if payload.release_notes is not None and hasattr(db, "commit") and hasattr(db, "refresh"):
        package.release_notes = payload.release_notes
        db.commit()
        db.refresh(package)
    return package


@router.post("/{package_id}/ready", response_model=ReleasePackageResponse)
def mark_ready_endpoint(
    package_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.mark_ready(db, package_id=package_id)


@router.post("/{package_id}/publish", response_model=ReleasePackageResponse)
def publish_package_endpoint(
    package_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.publish_package(db, package_id=package_id)


@router.post("/{package_id}/cancel", response_model=ReleasePackageResponse)
def cancel_package_endpoint(
    package_id: int,
    payload: CancelReleasePackageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    return service.cancel_package(
        db,
        package_id=package_id,
        cancellation_reason=payload.cancellation_reason,
        actor=current_user,
    )


@router.post("/{package_id}/deprecate", response_model=ReleasePackageResponse)
def deprecate_package_endpoint(
    package_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.deprecate_package(db, package_id=package_id)

