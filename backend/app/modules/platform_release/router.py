"""Platform release pipeline API."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_modules.version_schemas import PlatformReleaseModuleOut
from app.modules.platform_release import service
from app.modules.platform_release.dependencies import (
    require_platform_reviewer,
    require_release_developer,
)
from app.modules.platform_release.schemas import (
    OfferToTenantsResult,
    PlatformReleaseCreate,
    PlatformReleaseListItem,
    PlatformReleaseOut,
    PlatformReleaseReviewCountOut,
    PlatformReleaseUpdate,
    PublishToTemplateResult,
    ReviewCommentPayload,
    ReviewCommentRequiredPayload,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/releases",
    tags=["Platform Releases"],
)


@router.get("/review-queue", response_model=list[PlatformReleaseListItem])
def list_review_queue_endpoint(
    db: Session = Depends(get_db),
    _reviewer: User = Depends(require_platform_reviewer),
):
    return service.list_platform_review_queue(db)


@router.get("/review-count", response_model=PlatformReleaseReviewCountOut)
def review_count_endpoint(
    db: Session = Depends(get_db),
    _reviewer: User = Depends(require_platform_reviewer),
):
    return PlatformReleaseReviewCountOut(count=service.count_platform_review_queue(db))


@router.get("", response_model=list[PlatformReleaseListItem])
def list_releases_endpoint(
    db: Session = Depends(get_db),
    _developer: User = Depends(require_release_developer),
):
    return service.list_platform_releases(db)


@router.post("", response_model=PlatformReleaseOut, status_code=201)
def create_release_endpoint(
    payload: PlatformReleaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_release_developer),
):
    return service.create_platform_release(db, payload=payload, actor=current_user)


@router.get("/{release_id}/modules", response_model=list[PlatformReleaseModuleOut])
def list_release_modules_endpoint(
    release_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    service.get_platform_release(db, release_id)
    return service.list_release_modules_from_package(db, release_id)


@router.get("/{release_id}", response_model=PlatformReleaseOut)
def get_release_endpoint(
    release_id: int,
    db: Session = Depends(get_db),
    _developer: User = Depends(require_release_developer),
):
    return service.get_platform_release(db, release_id)


@router.patch("/{release_id}", response_model=PlatformReleaseOut)
def update_release_endpoint(
    release_id: int,
    payload: PlatformReleaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_release_developer),
):
    return service.update_platform_release(
        db,
        release_id=release_id,
        payload=payload,
        actor=current_user,
    )


@router.post("/{release_id}/submit-for-review", response_model=PlatformReleaseOut)
def submit_for_review_endpoint(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_release_developer),
):
    return service.submit_release_for_review(
        db,
        release_id=release_id,
        actor=current_user,
    )


@router.post("/{release_id}/start-review", response_model=PlatformReleaseOut)
def start_review_endpoint(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.start_release_review(
        db,
        release_id=release_id,
        actor=current_user,
    )


@router.post("/{release_id}/request-changes", response_model=PlatformReleaseOut)
def request_changes_endpoint(
    release_id: int,
    payload: ReviewCommentRequiredPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.request_release_changes(
        db,
        release_id=release_id,
        payload=payload,
        actor=current_user,
    )


@router.post("/{release_id}/approve", response_model=PlatformReleaseOut)
def approve_release_endpoint(
    release_id: int,
    payload: ReviewCommentPayload | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.approve_release(
        db,
        release_id=release_id,
        payload=payload,
        actor=current_user,
    )


@router.post("/{release_id}/publish-to-template", response_model=PublishToTemplateResult)
def publish_to_template_endpoint(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.publish_release_to_template(
        db,
        release_id=release_id,
        actor=current_user,
    )


@router.post("/{release_id}/offer-to-tenants", response_model=OfferToTenantsResult)
def offer_to_tenants_endpoint(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.offer_release_to_tenants(
        db,
        release_id=release_id,
        actor=current_user,
    )
