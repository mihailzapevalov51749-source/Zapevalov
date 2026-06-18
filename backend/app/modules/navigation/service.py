from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from . import repository
from .page_navigation_visibility import apply_page_status_visibility_update
from .page_status_filter import (
    filter_navigation_for_office_menu,
    filter_navigation_for_user_menu,
)
from .enrichment import (
    enrich_navigation_list,
    enrich_navigation_tree,
    is_object_type_navigation_item,
    strip_object_type_metadata_updates,
    OBJECT_TYPE_NAV_TYPE,
)
from .models import NavigationItem
from .permissions import assert_can_delete_navigation_item
from .removed_system_menu_items import filter_removed_navigation_items
from .navigation_edit_mode_classification import filter_navigation_for_office_runtime_menu
from .tenant_access import get_navigation_item_for_portal
from app.modules.navigation.system_registry.constants import DESIGNER_SYSTEM_NAV_ITEMS
from app.modules.publication_guard.structure_write_service_guard import guard_direct_structure_write


def _filter_navigation_for_deleted_object_types(
    db: Session,
    items: list[NavigationItem],
) -> list[NavigationItem]:
    from app.modules.platform.designer.object_types.models import DesignerObjectType

    object_type_ids = {item.object_type_id for item in items if item.object_type_id}
    if not object_type_ids:
        return items

    deleted_ids = {
        row[0]
        for row in db.query(DesignerObjectType.id)
        .filter(
            DesignerObjectType.id.in_(object_type_ids),
            DesignerObjectType.deleted_at.isnot(None),
        )
        .all()
    }
    if not deleted_ids:
        return items

    return [
        item
        for item in items
        if not item.object_type_id or item.object_type_id not in deleted_ids
    ]


DESIGNER_SYSTEM_ITEMS = [
    {
        "system_key": item.system_key,
        "title": item.title,
        "route": item.route_template,
        "sort_order": item.sort_order,
    }
    for item in DESIGNER_SYSTEM_NAV_ITEMS
]


def sort_items(items):
    return sorted(
        items,
        key=lambda item: (
            0 if item.title and item.title.lower() == "главная страница" else 1,
            item.sort_order or 0,
            item.id or 0,
        )
    )


def build_tree(items):
    items = sort_items(items)

    item_map = {item.id: item for item in items}
    tree = []

    for item in items:
        item.children = []

    for item in items:
        if item.parent_id and item.parent_id in item_map:
            parent = item_map[item.parent_id]
            parent.children.append(item)
            parent.children = sort_items(parent.children)
        else:
            tree.append(item)

    return sort_items(tree)


def _guard_object_type_create(data) -> None:
    if data.type == OBJECT_TYPE_NAV_TYPE and not data.object_type_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="object_type_id обязателен для type=object_type",
        )

    if data.object_type_id and data.type != OBJECT_TYPE_NAV_TYPE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="object_type_id допустим только для type=object_type",
        )


def create_item(db: Session, portal_id: int, data):
    guard_direct_structure_write(db, portal_id, "create_item")
    _guard_object_type_create(data)

    if int(data.portal_id) != int(portal_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="portal_id в теле запроса не совпадает с portal в маршруте",
        )

    if data.parent_id is not None:
        parent = get_navigation_item_for_portal(db, data.parent_id, portal_id)
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Родительский пункт меню не найден",
            )

    if data.type == OBJECT_TYPE_NAV_TYPE:
        data_dict = data.model_dump()
        for field in ("icon", "icon_type", "icon_file_url", "color"):
            data_dict[field] = None
        from app.modules.navigation.schemas import NavigationItemCreate

        data = NavigationItemCreate(**data_dict)
    created = repository.create_item(db, data)
    enriched = enrich_navigation_list(db, [created])
    return enriched[0] if enriched else created


def ensure_designer_system_items(db: Session, portal_id: int):
    guard_direct_structure_write(db, portal_id, "ensure_designer_system_items")
    from app.modules.navigation.system_registry.registry import (
        deactivate_orphan_workspace_placements,
        ensure_designer_system_navigation_items,
    )

    changed = ensure_designer_system_navigation_items(db, portal_id)
    if deactivate_orphan_workspace_placements(db, portal_id):
        changed = True

    if changed:
        db.commit()


def get_navigation_tree(
    db: Session,
    portal_id: int,
    menu_scope: Optional[str] = None,
    *,
    for_edit_mode: bool = False,
    include_system: bool = False,
):
    items = repository.get_items_by_portal(db, portal_id, menu_scope)
    items = _filter_navigation_for_deleted_object_types(db, items)
    items = filter_removed_navigation_items(items, menu_scope=menu_scope)
    if menu_scope in {"runtime", "designer"}:
        items = filter_navigation_for_user_menu(db, items, for_edit_mode=for_edit_mode)
    if menu_scope == "runtime" and not include_system:
        items = filter_navigation_for_office_runtime_menu(
            db,
            portal_id,
            items,
            include_system=False,
        )
    tree = build_tree(items)
    return enrich_navigation_tree(db, tree)


def get_navigation_list(db: Session, portal_id: int, menu_scope: Optional[str] = None):
    items = repository.get_items_by_portal(db, portal_id, menu_scope)
    items = _filter_navigation_for_deleted_object_types(db, items)
    items = filter_removed_navigation_items(items, menu_scope=menu_scope)
    if menu_scope == "runtime":
        items = filter_navigation_for_office_menu(db, items)
        items = filter_navigation_for_office_runtime_menu(
            db,
            portal_id,
            items,
            include_system=False,
        )
    return enrich_navigation_list(db, items)


def update_item(db: Session, portal_id: int, item_id: int, data):
    guard_direct_structure_write(db, portal_id, "update_item")
    from app.modules.navigation.schemas import NavigationItemUpdate

    item = get_navigation_item_for_portal(db, item_id, portal_id)
    if not item:
        return None

    update_data = data.model_dump(exclude_unset=True)

    if is_object_type_navigation_item(item):
        update_data = strip_object_type_metadata_updates(update_data)

    page_status_changed = False
    if "is_visible" in update_data:
        visible_value = update_data.pop("is_visible")
        page_status_changed = apply_page_status_visibility_update(
            db,
            item,
            is_visible=bool(visible_value),
        )

    if not update_data:
        if page_status_changed:
            db.commit()
        db.refresh(item)
        enriched = enrich_navigation_list(db, [item])
        return enriched[0] if enriched else item

    updated = repository.update_item(db, item_id, portal_id, NavigationItemUpdate(**update_data))
    if not updated:
        return None

    if page_status_changed:
        db.commit()
        db.refresh(updated)

    enriched = enrich_navigation_list(db, [updated])
    return enriched[0] if enriched else updated


def delete_item(
    db: Session,
    portal_id: int,
    item_id: int,
    *,
    deleted_by: int | None = None,
    user=None,
):
    guard_direct_structure_write(db, portal_id, "delete_item")
    item = get_navigation_item_for_portal(db, item_id, portal_id)
    if not item:
        return None

    if user is not None:
        assert_can_delete_navigation_item(user, item)
    elif item.is_protected:
        raise ValueError(
            "Пункт меню нельзя удалить, так как он является системным "
            "или имеет связанные зависимости."
        )

    if repository.count_active_children(db, item_id) > 0:
        raise ValueError(
            "Пункт меню нельзя удалить: сначала удалите дочерние пункты."
        )

    return repository.delete_item(db, item_id, portal_id, deleted_by=deleted_by)


def move_items(db: Session, portal_id: int, items):
    guard_direct_structure_write(db, portal_id, "move_items")
    if not items:
        return []

    for item_data in items:
        if get_navigation_item_for_portal(db, item_data.id, portal_id) is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Пункт меню не принадлежит указанному tenant",
            )

        if item_data.parent_id is not None:
            parent = get_navigation_item_for_portal(db, item_data.parent_id, portal_id)
            if parent is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Родительский пункт меню не принадлежит указанному tenant",
                )

    moved = repository.move_items(db, portal_id, items)
    return enrich_navigation_list(db, moved)