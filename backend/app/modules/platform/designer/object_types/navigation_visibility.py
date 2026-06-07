"""Sync navigation visibility with object type show_in_navigation setting."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.shared.object_type_settings import resolve_show_in_navigation


def sync_object_type_navigation_visibility(
    db: Session,
    *,
    tenant_id: int,
    object_type_id: UUID,
) -> int:
    object_type = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.id == object_type_id,
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    )
    if object_type is None:
        return 0

    show_in_navigation = resolve_show_in_navigation(object_type.settings_json)
    items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.object_type_id == object_type_id,
        )
        .all()
    )

    updated = 0
    for item in items:
        if item.is_visible != show_in_navigation:
            item.is_visible = show_in_navigation
            updated += 1

    if updated:
        db.commit()

    return updated
