from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db

from app.modules.auth.dependencies import get_current_user

from app.modules.checklists.schemas import (
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistItemUpdate,
    ChecklistItemsReorder,
    ChecklistListOut,
)

from app.modules.checklists.service import (
    build_checklist_response,
    create_checklist_item,
    delete_checklist_item,
    get_checklist_item_by_id,
    get_checklist_items,
    reorder_checklist_items,
    update_checklist_item,
)

router = APIRouter(
    prefix="/checklists",
    tags=["Checklists"],
)


@router.get(
    "/",
    response_model=ChecklistListOut,
)
def get_items(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    items = get_checklist_items(
        db,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    return build_checklist_response(
        entity_type=entity_type,
        entity_id=entity_id,
        items=items,
    )


@router.post(
    "/items",
    response_model=ChecklistItemOut,
    status_code=status.HTTP_201_CREATED,
)
def create_item(
    payload: ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = create_checklist_item(
        db,
        entity_type=payload.entity.type,
        entity_id=payload.entity.id,
        title=payload.title,
        position=payload.position,
        created_by_id=current_user.id,
    )

    return item


@router.patch(
    "/items/{item_id}",
    response_model=ChecklistItemOut,
)
def patch_item(
    item_id: int,
    payload: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = get_checklist_item_by_id(
        db,
        item_id=item_id,
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Checklist item not found",
        )

    item = update_checklist_item(
        db,
        item=item,
        title=payload.title,
        is_completed=payload.is_completed,
        position=payload.position,
        completed_by_id=current_user.id,
    )

    return item


@router.post(
    "/reorder",
)
def reorder_items(
    payload: ChecklistItemsReorder,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    reorder_checklist_items(
        db,
        ordered_ids=payload.ordered_ids,
    )

    return {
        "success": True,
    }


@router.delete(
    "/items/{item_id}",
)
def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = get_checklist_item_by_id(
        db,
        item_id=item_id,
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Checklist item not found",
        )

    delete_checklist_item(
        db,
        item=item,
    )

    return {
        "success": True,
    }