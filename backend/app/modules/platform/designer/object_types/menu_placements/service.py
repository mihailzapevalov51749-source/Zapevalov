from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.navigation.enrichment import OBJECT_TYPE_NAV_TYPE, enrich_navigation_item
from app.modules.navigation.models import NavigationItem
from app.modules.navigation.repository import get_item as get_navigation_item
from app.modules.platform.designer.object_types import repository as object_type_repository
from app.modules.platform.designer.object_types.menu_placements.schemas import (
    DESIGNER_MENU_SCOPE,
    RUNTIME_MENU_SCOPE,
    MenuPlacementInput,
    MenuPlacementResult,
    MenuPlacementsResponse,
)
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.navigation.enrichment import load_object_types_map

DISALLOWED_PARENT_TYPES = frozenset({OBJECT_TYPE_NAV_TYPE, "system_page"})


def _designer_object_type_url(tenant_id: int, object_type_id: UUID) -> str:
    return f"/designer/tenant/{tenant_id}/object-types/{object_type_id}/data"


def _portal_object_type_url(portal_id: int, object_type: DesignerObjectType) -> str:
    key = (object_type.key or "").strip()
    if key:
        return f"/portal/{portal_id}/object-types/{key}"
    return f"/portal/{portal_id}/object-types/{object_type.id}/data"


def _resolve_placement_url(
    menu_scope: str,
    portal_id: int,
    object_type: DesignerObjectType,
) -> str:
    if menu_scope == RUNTIME_MENU_SCOPE:
        return _portal_object_type_url(portal_id, object_type)
    return _designer_object_type_url(portal_id, object_type.id)


def _validate_parent(
    db: Session,
    portal_id: int,
    parent_id: int | None,
    menu_scope: str,
) -> None:
    if parent_id is None:
        return

    parent = get_navigation_item(db, parent_id)
    if not parent or parent.portal_id != portal_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Родительский пункт меню не найден",
        )

    if menu_scope == DESIGNER_MENU_SCOPE:
        if parent.menu_scope != DESIGNER_MENU_SCOPE:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Родитель должен быть в меню Студии (designer)",
            )
    elif menu_scope == RUNTIME_MENU_SCOPE:
        if parent.menu_scope == DESIGNER_MENU_SCOPE:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Родитель должен быть в меню Офиса (runtime)",
            )

    if parent.type in DISALLOWED_PARENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Этот пункт меню нельзя выбрать родительским",
        )


def _find_existing_placement(
    db: Session,
    portal_id: int,
    menu_scope: str,
    object_type_id: UUID,
) -> NavigationItem | None:
    return (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == portal_id)
        .filter(NavigationItem.menu_scope == menu_scope)
        .filter(NavigationItem.object_type_id == object_type_id)
        .first()
    )


def upsert_menu_placement(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    placement: MenuPlacementInput,
) -> MenuPlacementResult:
    object_type = object_type_repository.get_object_type(db, tenant_id, object_type_id)
    if not object_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ObjectType не найден",
        )

    menu_scope = placement.menu_scope
    _validate_parent(db, tenant_id, placement.parent_id, menu_scope)

    url = _resolve_placement_url(menu_scope, tenant_id, object_type)
    existing = _find_existing_placement(db, tenant_id, menu_scope, object_type_id)

    if existing:
        existing.parent_id = placement.parent_id
        existing.sort_order = placement.sort_order
        existing.is_visible = placement.is_visible
        existing.url = url
        existing.type = OBJECT_TYPE_NAV_TYPE
        entity = existing
    else:
        entity = NavigationItem(
            portal_id=tenant_id,
            parent_id=placement.parent_id,
            type=OBJECT_TYPE_NAV_TYPE,
            title=object_type.name,
            object_type_id=object_type_id,
            url=url,
            sort_order=placement.sort_order,
            is_visible=placement.is_visible,
            icon=None,
            icon_type=None,
            icon_file_url=None,
            color=None,
            menu_scope=menu_scope,
            is_system=False,
            is_protected=False,
        )
        db.add(entity)

    db.commit()
    db.refresh(entity)

    object_types_by_id = load_object_types_map(db, {object_type_id})
    enriched = enrich_navigation_item(entity, object_types_by_id)

    return MenuPlacementResult(
        navigation_item_id=entity.id,
        menu_scope=entity.menu_scope,
        parent_id=entity.parent_id,
        sort_order=entity.sort_order,
        is_visible=entity.is_visible,
        object_type_id=object_type_id,
        url=entity.url,
        display_title=enriched.display_title,
        display_icon_type=enriched.display_icon_type,
        display_icon_file_url=enriched.display_icon_file_url,
        display_color=enriched.display_color,
    )


def publish_menu_placements(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    placements: list[MenuPlacementInput],
) -> MenuPlacementsResponse:
    results = [
        upsert_menu_placement(db, tenant_id, object_type_id, placement)
        for placement in placements
    ]
    return MenuPlacementsResponse(placements=results)
