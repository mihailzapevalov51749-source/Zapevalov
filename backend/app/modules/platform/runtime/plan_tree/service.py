from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.catalog.service import CatalogNotFound
from app.modules.platform.runtime.plan_tree.reorder import reorder_hierarchy_siblings
from app.modules.platform.runtime.plan_tree.root_anchor import ensure_plan_tree_root_order
from app.modules.platform.runtime.plan_tree.schemas import (
    PlanTreeEnsureRootOrderRead,
    PlanTreeReorderSiblingsRequest,
    PlanTreeReorderSiblingsRead,
)


def _catalog_http_error(exc: CatalogNotFound) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc) or "Published catalog не найден",
    )


def ensure_root_order(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    relation_key: str,
) -> PlanTreeEnsureRootOrderRead:
    try:
        object_type_metadata = catalog_service.get_published_object_type_metadata(
            db,
            tenant_id,
            object_type_key,
        )
        relation_metadata = catalog_service.get_published_relation_metadata(
            db,
            tenant_id,
            relation_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    anchor_id, ordered_root_ids = ensure_plan_tree_root_order(
        db,
        tenant_id,
        object_type_metadata=object_type_metadata,
        relation_key=relation_key,
        relation_settings_json=relation_metadata.settings_json,
        relation_metadata=relation_metadata,
    )

    return PlanTreeEnsureRootOrderRead(
        anchor_entity_id=anchor_id,
        ordered_root_ids=ordered_root_ids,
    )


def reorder_siblings(
    db: Session,
    tenant_id: int,
    relation_key: str,
    payload: PlanTreeReorderSiblingsRequest,
) -> PlanTreeReorderSiblingsRead:
    try:
        relation_metadata = catalog_service.get_published_relation_metadata(
            db,
            tenant_id,
            relation_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    parent_entity_id = payload.parent_entity_id
    ordered_child_ids = [UUID(str(item)) for item in payload.ordered_child_ids]

    if not ordered_child_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ordered_child_ids is required",
        )

    try:
        updated = reorder_hierarchy_siblings(
            db,
            tenant_id,
            relation_key,
            parent_entity_id=parent_entity_id,
            ordered_child_ids=ordered_child_ids,
            relation_settings_json=relation_metadata.settings_json,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    from app.modules.platform.runtime.relation_instances import repository as rel_repo

    rel_repo.commit(db)

    return PlanTreeReorderSiblingsRead(updated_count=updated)
