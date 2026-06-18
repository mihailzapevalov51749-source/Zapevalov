"""API router for platform code build registry."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_build_registry import service
from app.modules.platform_build_registry.schemas import (
    BuildResponse,
    CreateBuildRequest,
    MarkFailedRequest,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/builds",
    tags=["Platform Builds"],
)


@router.get("", response_model=list[BuildResponse])
def list_builds_endpoint(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_builds(db, status_filter=status)


@router.get("/{build_id}", response_model=BuildResponse)
def get_build_endpoint(
    build_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.get_build(db, build_id)


@router.post("", response_model=BuildResponse, status_code=201)
def create_build_endpoint(
    payload: CreateBuildRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    return service.create_build(
        db,
        build_key=payload.build_key,
        commit_sha=payload.commit_sha,
        backend_digest=payload.backend_digest,
        frontend_digest=payload.frontend_digest,
        schema_revision=payload.schema_revision,
        build_manifest_json=payload.build_manifest_json,
        actor=current_user,
    )


@router.post("/{build_id}/start", response_model=BuildResponse)
def start_build_endpoint(
    build_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.start_build(db, build_id=build_id)


@router.post("/{build_id}/succeed", response_model=BuildResponse)
def mark_succeeded_endpoint(
    build_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.mark_succeeded(db, build_id=build_id)


@router.post("/{build_id}/fail", response_model=BuildResponse)
def mark_failed_endpoint(
    build_id: int,
    payload: MarkFailedRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.mark_failed(
        db,
        build_id=build_id,
        failure_reason=payload.failure_reason,
    )


@router.post("/{build_id}/cancel", response_model=BuildResponse)
def cancel_build_endpoint(
    build_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.cancel_build(db, build_id=build_id)
