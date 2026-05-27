from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
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
    db: Session = Depends(get_db)
):
    menu_scope = scope or mode or context
    return service.get_navigation_tree(db, portal_id, menu_scope)


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
    db: Session = Depends(get_db)
):
    try:
        item = service.delete_item(db, item_id)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    if not item:
        raise HTTPException(status_code=404, detail="Элемент меню не найден")

    return {"message": "Элемент меню удалён"}


@router.post("/move", response_model=list[NavigationItemResponse])
def move_navigation_items(
    items: list[NavigationItemMove],
    db: Session = Depends(get_db)
):
    return service.move_items(db, items)