from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.trash import service
from app.modules.platform.designer.trash.schemas import (
    TrashBulkRequest,
    TrashBulkResponse,
    TrashBulkResultItem,
    TrashDependencyActionResponse,
    TrashDetailRead,
    TrashEntityKind,
    TrashListResponse,
    TrashPurgeBlockedResponse,
)
from app.modules.platform.shared.dependencies import require_designer_user, require_tenant
from app.modules.users.models import User

router = APIRouter(prefix="/trash", tags=["Designer Trash"])


@router.get("", response_model=TrashListResponse)
def list_trash(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> TrashListResponse:
    return service.list_trash_items(db, tenant_id=tenant_id)


@router.get("/{kind}/{entity_id}", response_model=TrashDetailRead)
def get_trash_item(
    kind: TrashEntityKind,
    entity_id: str,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> TrashDetailRead:
    return service.get_trash_detail(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id)


@router.get("/{kind}/{entity_id}/purge-check", response_model=TrashPurgeBlockedResponse | None)
def check_purge(
    kind: TrashEntityKind,
    entity_id: str,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
):
    return service.check_purge_allowed(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id)


@router.post("/restore", response_model=TrashBulkResponse)
def restore_items(
    payload: TrashBulkRequest,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
    _user: User = Depends(require_designer_user),
) -> TrashBulkResponse:
    if len(payload.items) == 1:
        item = payload.items[0]
        service.restore_trash_item(db, tenant_id=tenant_id, kind=item.kind, entity_id=item.id)
        return TrashBulkResponse(
            results=[
                TrashBulkResultItem(kind=item.kind, id=item.id, success=True),
            ],
        )
    return service.restore_trash_bulk(db, tenant_id=tenant_id, items=payload.items)


@router.post("/purge", response_model=TrashBulkResponse)
def purge_items(
    payload: TrashBulkRequest,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
    _user: User = Depends(require_designer_user),
) -> TrashBulkResponse:
    if len(payload.items) == 1:
        item = payload.items[0]
        service.purge_trash_item(db, tenant_id=tenant_id, kind=item.kind, entity_id=item.id)
        return TrashBulkResponse(
            results=[
                TrashBulkResultItem(kind=item.kind, id=item.id, success=True),
            ],
        )
    return service.purge_trash_bulk(db, tenant_id=tenant_id, items=payload.items)


@router.post("/{kind}/{entity_id}/purge-clear-dependencies", response_model=TrashDependencyActionResponse)
def clear_dependencies_and_purge(
    kind: TrashEntityKind,
    entity_id: str,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
    _user: User = Depends(require_designer_user),
) -> TrashDependencyActionResponse:
    return service.clear_purge_dependencies(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id)


@router.post("/{kind}/{entity_id}/purge-cascade", response_model=TrashDependencyActionResponse)
def cascade_purge(
    kind: TrashEntityKind,
    entity_id: str,
    confirm: bool = False,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
    _user: User = Depends(require_designer_user),
) -> TrashDependencyActionResponse:
    return service.cascade_purge_with_dependencies(
        db,
        tenant_id=tenant_id,
        kind=kind,
        entity_id=entity_id,
        confirm=confirm,
    )
