from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.pages import service
from app.modules.platform.designer.pages.schemas import (
    PageBulkDeleteRequest,
    PageBulkDeleteResponse,
    PageDuplicateResponse,
    PageRegistryDetailRead,
    PageRegistryListResponse,
)
from app.modules.platform.shared.dependencies import (
    require_designer_user,
    require_tenant,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/pages",
    tags=["Designer Pages Registry"],
    dependencies=[
        Depends(require_tenant),
        Depends(require_designer_user),
    ],
)


@router.get("/registry", response_model=PageRegistryListResponse)
def get_pages_registry(tenant_id: int, db: Session = Depends(get_db)):
    return service.list_page_registry(db, tenant_id)


@router.get("/{page_id}/registry", response_model=PageRegistryDetailRead)
def get_page_registry(tenant_id: int, page_id: int, db: Session = Depends(get_db)):
    return service.get_page_registry_detail(db, tenant_id, page_id)


@router.post("/{page_id}/duplicate", response_model=PageDuplicateResponse)
def post_duplicate_page(tenant_id: int, page_id: int, db: Session = Depends(get_db)):
    return service.duplicate_page_registry(db, tenant_id, page_id)


@router.post("/bulk-delete", response_model=PageBulkDeleteResponse)
def post_bulk_delete_pages(
    tenant_id: int,
    payload: PageBulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.bulk_delete_page_registry(
        db,
        tenant_id,
        payload.page_ids,
        deleted_by=current_user.id,
    )


@router.delete("/{page_id}")
def delete_page_registry(
    tenant_id: int,
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.delete_page_registry(
        db,
        tenant_id,
        page_id,
        deleted_by=current_user.id,
    )
