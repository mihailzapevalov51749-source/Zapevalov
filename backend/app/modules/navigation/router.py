from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User
from .schemas import (
    NavigationItemCreate,
    NavigationItemUpdate,
    NavigationItemMove,
    NavigationItemResponse,
    NavigationTreeItem,
)
from . import service

router = APIRouter(prefix="/navigation", tags=["Navigation"])


@router.post("/", response_model=NavigationItemResponse)
def create_navigation_item(
    data: NavigationItemCreate,
    db: Session = Depends(get_db)
):
    return service.create_item(db, data)


@router.get("/portal/{portal_id}", response_model=list[NavigationItemResponse])
def get_navigation_list(
    portal_id: int,
    scope: Optional[str] = None,
    mode: Optional[str] = None,
    context: Optional[str] = None,
    db: Session = Depends(get_db)
):
    menu_scope = scope or mode or context
    return service.get_navigation_list(db, portal_id, menu_scope)


@router.get("/portal/{portal_id}/tree", response_model=list[NavigationTreeItem])
def get_navigation_tree(
    portal_id: int,
    scope: Optional[str] = None,
    mode: Optional[str] = None,
    context: Optional[str] = None,
    for_edit_mode: bool = False,
    db: Session = Depends(get_db)
):
    menu_scope = scope or mode or context
    return service.get_navigation_tree(
        db,
        portal_id,
        menu_scope,
        for_edit_mode=for_edit_mode,
    )


@router.put("/{item_id}", response_model=NavigationItemResponse)
def update_navigation_item(
    item_id: int,
    data: NavigationItemUpdate,
    db: Session = Depends(get_db)
):
    item = service.update_item(db, item_id, data)

    if not item:
        raise HTTPException(status_code=404, detail="Элемент меню не найден")

    return item


@router.delete("/{item_id}")
def delete_navigation_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    try:
        item = service.delete_item(
            db,
            item_id,
            deleted_by=current_user.id,
            user=current_user,
        )
    except ValueError as exc:
        message = str(exc)
        lowered = message.lower()
        status_code = 403

        if "дочерн" in lowered:
            status_code = 409
        elif "не найден" in lowered or "уже удал" in lowered:
            status_code = 404

        raise HTTPException(status_code=status_code, detail=message) from exc

    if not item:
        raise HTTPException(status_code=404, detail="Элемент меню не найден")

    return {"message": "Элемент меню удалён"}


@router.post("/move", response_model=list[NavigationItemResponse])
def move_navigation_items(
    items: list[NavigationItemMove],
    db: Session = Depends(get_db)
):
    return service.move_items(db, items)
