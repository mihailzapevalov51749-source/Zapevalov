"""Tenant isolation helpers for navigation API."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem

NAVIGATION_PORTAL_FORBIDDEN_DETAIL = "Элемент меню недоступен в текущем tenant"


def assert_navigation_item_belongs_to_portal(
    item: NavigationItem | None,
    portal_id: int,
) -> None:
    if item is None:
        return

    if int(item.portal_id) != int(portal_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=NAVIGATION_PORTAL_FORBIDDEN_DETAIL,
        )


def get_navigation_item_for_portal(
    db: Session,
    item_id: int,
    portal_id: int,
    *,
    include_deleted: bool = False,
) -> NavigationItem | None:
    query = db.query(NavigationItem).filter(NavigationItem.id == item_id)

    if not include_deleted:
        query = query.filter(NavigationItem.deleted_at.is_(None))

    item = query.first()
    if item is None:
        return None

    assert_navigation_item_belongs_to_portal(item, portal_id)
    return item
