"""API for platform module publications."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform_module_publications import service
from app.modules.platform_module_publications.schemas import (
    PlatformModulePublicationCreate,
    PlatformModulePublicationDetailOut,
    PlatformModulePublicationOut,
    PlatformModulePublicationPublishResult,
    PlatformModulePublicationReviewNotes,
)
from app.modules.platform_release.dependencies import (
    require_platform_reviewer,
    require_release_developer,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/module-publications",
    tags=["Platform Module Publications"],
)


@router.get("", response_model=list[PlatformModulePublicationOut])
def list_publications_endpoint(
    db: Session = Depends(get_db),
    _reviewer: User = Depends(require_platform_reviewer),
):
    return service.list_all_publications(db)


@router.get("/dev", response_model=list[PlatformModulePublicationOut])
def list_dev_publications_endpoint(
    db: Session = Depends(get_db),
    _developer: User = Depends(require_release_developer),
):
    from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id

    dev_tenant_id = resolve_dev_tenant_portal_id(db)
    if dev_tenant_id is None:
        return []
    return service.list_dev_publications(db, source_tenant_id=int(dev_tenant_id))


@router.post("", response_model=PlatformModulePublicationOut, status_code=201)
def create_publication_endpoint(
    payload: PlatformModulePublicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_release_developer),
):
    return service.create_publication(
        db,
        module_key=payload.module_key,
        actor=current_user,
        release_summary=payload.release_summary,
        notes=payload.notes,
    )


@router.get("/{publication_id}", response_model=PlatformModulePublicationDetailOut)
def get_publication_endpoint(
    publication_id: int,
    db: Session = Depends(get_db),
    _reviewer: User = Depends(require_platform_reviewer),
):
    return service.get_publication_detail(db, publication_id)


@router.post("/{publication_id}/submit-for-review", response_model=PlatformModulePublicationOut)
def submit_publication_endpoint(
    publication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_release_developer),
):
    return service.submit_publication_for_review(
        db,
        publication_id=publication_id,
        actor=current_user,
    )


@router.post("/{publication_id}/start-review", response_model=PlatformModulePublicationOut)
def start_review_endpoint(
    publication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.start_publication_review(
        db,
        publication_id=publication_id,
        actor=current_user,
    )


@router.post("/{publication_id}/approve", response_model=PlatformModulePublicationOut)
def approve_publication_endpoint(
    publication_id: int,
    payload: PlatformModulePublicationReviewNotes,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.approve_publication(
        db,
        publication_id=publication_id,
        actor=current_user,
        notes=payload.notes,
    )


@router.post("/{publication_id}/reject", response_model=PlatformModulePublicationOut)
def reject_publication_endpoint(
    publication_id: int,
    payload: PlatformModulePublicationReviewNotes,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.reject_publication(
        db,
        publication_id=publication_id,
        actor=current_user,
        notes=payload.notes,
    )


@router.post("/{publication_id}/publish", response_model=PlatformModulePublicationPublishResult)
def publish_publication_endpoint(
    publication_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_reviewer),
):
    return service.publish_publication_to_template(
        db,
        publication_id=publication_id,
        actor=current_user,
    )
