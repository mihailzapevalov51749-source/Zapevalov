from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.modules.navigation.enrichment import OBJECT_TYPE_NAV_TYPE
from app.modules.navigation.models import NavigationItem

_PORTAL_OBJECT_TYPE_URL_RE = re.compile(
    r"^/portal/(?P<portal_id>\d+)/object-types/(?P<segment>[^/?#]+)",
    re.IGNORECASE,
)
_DESIGNER_OBJECT_TYPE_URL_RE = re.compile(
    r"^/designer/tenant/(?P<tenant_id>\d+)/object-types/(?P<segment>[^/]+)/data",
    re.IGNORECASE,
)


def _url_targets_object_type(
    url: str | None,
    *,
    tenant_id: int,
    object_type_id: UUID,
    object_type_key: str,
) -> bool:
    raw = str(url or "").strip()
    if not raw:
        return False

    portal_match = _PORTAL_OBJECT_TYPE_URL_RE.match(raw)
    if portal_match:
        if int(portal_match.group("portal_id")) != tenant_id:
            return False
        segment = portal_match.group("segment")
        return segment == object_type_key or segment == str(object_type_id)

    designer_match = _DESIGNER_OBJECT_TYPE_URL_RE.match(raw)
    if designer_match:
        if int(designer_match.group("tenant_id")) != tenant_id:
            return False
        segment = designer_match.group("segment")
        return segment == str(object_type_id) or segment == object_type_key

    return False


def _item_targets_object_type(
    item: NavigationItem,
    *,
    tenant_id: int,
    object_type_id: UUID,
    object_type_key: str,
) -> bool:
    if item.object_type_id == object_type_id:
        return True

    if item.type != OBJECT_TYPE_NAV_TYPE and item.object_type_id is not None:
        return False

    if item.type == OBJECT_TYPE_NAV_TYPE or item.object_type_id is not None:
        return _url_targets_object_type(
            item.url,
            tenant_id=tenant_id,
            object_type_id=object_type_id,
            object_type_key=object_type_key,
        )

    return _url_targets_object_type(
        item.url,
        tenant_id=tenant_id,
        object_type_id=object_type_id,
        object_type_key=object_type_key,
    )


def collect_object_type_navigation_items(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    *,
    object_type_key: str,
    active_only: bool = True,
) -> list[NavigationItem]:
    query = db.query(NavigationItem).filter(NavigationItem.portal_id == tenant_id)
    if active_only:
        query = query.filter(NavigationItem.deleted_at.is_(None))

    object_type_key = str(object_type_key or "").strip()
    url_filters = [
        NavigationItem.object_type_id == object_type_id,
    ]
    if object_type_key:
        url_filters.extend(
            [
                NavigationItem.url.ilike(f"/portal/{tenant_id}/object-types/{object_type_key}%"),
                NavigationItem.url.ilike(f"/portal/{tenant_id}/object-types/{object_type_id}%"),
                NavigationItem.url.ilike(
                    f"/designer/tenant/{tenant_id}/object-types/{object_type_id}/data%",
                ),
            ],
        )
        if object_type_key != str(object_type_id):
            url_filters.append(
                NavigationItem.url.ilike(
                    f"/designer/tenant/{tenant_id}/object-types/{object_type_key}/data%",
                ),
            )

    candidates = query.filter(or_(*url_filters)).order_by(NavigationItem.id.asc()).all()
    matched = {
        item.id: item
        for item in candidates
        if _item_targets_object_type(
            item,
            tenant_id=tenant_id,
            object_type_id=object_type_id,
            object_type_key=object_type_key,
        )
    }

    if not matched:
        return []

    parent_ids = list(matched.keys())
    child_query = db.query(NavigationItem).filter(
        NavigationItem.portal_id == tenant_id,
        NavigationItem.parent_id.in_(parent_ids),
    )
    if active_only:
        child_query = child_query.filter(NavigationItem.deleted_at.is_(None))

    for child in child_query.all():
        if _item_targets_object_type(
            child,
            tenant_id=tenant_id,
            object_type_id=object_type_id,
            object_type_key=object_type_key,
        ):
            matched[child.id] = child

    return list(matched.values())
