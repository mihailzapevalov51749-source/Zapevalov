from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.shared.soft_delete import apply_soft_delete, restore_soft_deleted
from app.modules.platform.designer.trash.restore_conflict import ensure_restore_allowed
from app.modules.platform.designer.trash.dependency_resolution_service import (
    dependency_resolution_service,
)
from app.modules.platform.designer.object_types.cascade_delete import (
    count_internal_entities,
    find_external_dependencies,
)
from app.modules.platform.designer.object_types import service as object_type_service
from app.modules.platform.designer.trash.schemas import (
    TrashCascadeCountItem,
    TrashDependencyActionResponse,
    TrashBulkResponse,
    TrashBulkResultItem,
    TrashDependencyRead,
    TrashDetailRead,
    TrashEntityKind,
    TrashExternalWarningGroup,
    TrashItemRef,
    TrashListItemRead,
    TrashListResponse,
    TrashPurgeBlockedResponse,
)
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.sections.models import Section
from app.modules.users.models import User

KIND_LABELS: dict[TrashEntityKind, str] = {
    "workspace": "Рабочее пространство",
    "workspace_tab": "Вкладка рабочего пространства",
    "object_type": "Объект",
    "object_view": "Представление",
    "object_relation": "Связь",
    "page": "Страница",
    "navigation": "Навигация",
}

def _user_label_map(db: Session, user_ids: set[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    rows = db.query(User.id, User.full_name, User.email).filter(User.id.in_(user_ids)).all()
    result: dict[int, str] = {}
    for user_id, full_name, email in rows:
        label = str(full_name or "").strip() or str(email or "").strip() or f"Пользователь #{user_id}"
        result[int(user_id)] = label
    return result


def _workspace_title_map(db: Session, tenant_id: int) -> dict[int, str]:
    rows = (
        db.query(DesignerWorkspace.id, DesignerWorkspace.title)
        .filter(DesignerWorkspace.tenant_id == tenant_id)
        .all()
    )
    return {int(row_id): str(title) for row_id, title in rows}


def _object_type_name_map(db: Session, tenant_id: int) -> dict[UUID, str]:
    rows = (
        db.query(DesignerObjectType.id, DesignerObjectType.name)
        .filter(DesignerObjectType.tenant_id == tenant_id)
        .all()
    )
    return {row_id: str(name) for row_id, name in rows}


def _to_list_item(
    *,
    kind: TrashEntityKind,
    entity_id: str,
    title: str,
    placement_label: str,
    deleted_at: datetime | None,
    created_at: datetime | None,
    deleted_by: int | None,
    user_labels: dict[int, str],
) -> TrashListItemRead:
    return TrashListItemRead(
        kind=kind,
        id=entity_id,
        title=title,
        kind_label=KIND_LABELS[kind],
        placement_label=placement_label or "—",
        deleted_by_label=user_labels.get(deleted_by, "—") if deleted_by else "—",
        deleted_at=deleted_at,
        created_at=created_at,
    )


def list_trash_items(db: Session, *, tenant_id: int) -> TrashListResponse:
    user_ids: set[int] = set()
    items: list[TrashListItemRead] = []
    workspace_titles = _workspace_title_map(db, tenant_id)
    object_type_names = _object_type_name_map(db, tenant_id)

    for workspace in (
        db.query(DesignerWorkspace)
        .filter(
            DesignerWorkspace.tenant_id == tenant_id,
            DesignerWorkspace.deleted_at.isnot(None),
        )
        .all()
    ):
        if workspace.deleted_by:
            user_ids.add(int(workspace.deleted_by))
        items.append(
            _to_list_item(
                kind="workspace",
                entity_id=str(workspace.id),
                title=workspace.title,
                placement_label="Студия",
                deleted_at=workspace.deleted_at,
                created_at=workspace.created_at,
                deleted_by=workspace.deleted_by,
                user_labels={},
            ),
        )

    for tab in (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.tenant_id == tenant_id,
            DesignerWorkspaceTab.deleted_at.isnot(None),
        )
        .all()
    ):
        if tab.deleted_by:
            user_ids.add(int(tab.deleted_by))
        workspace_title = workspace_titles.get(int(tab.workspace_id), "—")
        items.append(
            _to_list_item(
                kind="workspace_tab",
                entity_id=str(tab.id),
                title=tab.title,
                placement_label=f"Workspace {workspace_title}",
                deleted_at=tab.deleted_at,
                created_at=tab.created_at,
                deleted_by=tab.deleted_by,
                user_labels={},
            ),
        )

    for entity in (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.isnot(None),
        )
        .all()
    ):
        if entity.deleted_by:
            user_ids.add(int(entity.deleted_by))
        items.append(
            _to_list_item(
                kind="object_type",
                entity_id=str(entity.id),
                title=entity.name,
                placement_label="Студия → Объекты",
                deleted_at=entity.deleted_at,
                created_at=entity.created_at,
                deleted_by=entity.deleted_by,
                user_labels={},
            ),
        )

    for view in (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.deleted_at.isnot(None),
        )
        .all()
    ):
        if view.deleted_by:
            user_ids.add(int(view.deleted_by))
        object_name = object_type_names.get(view.object_type_id, "—")
        items.append(
            _to_list_item(
                kind="object_view",
                entity_id=str(view.id),
                title=view.name,
                placement_label=f"Объект {object_name}",
                deleted_at=view.deleted_at,
                created_at=view.created_at,
                deleted_by=view.deleted_by,
                user_labels={},
            ),
        )

    for relation in (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.deleted_at.isnot(None),
        )
        .all()
    ):
        if relation.deleted_by:
            user_ids.add(int(relation.deleted_by))
        source_name = object_type_names.get(relation.source_object_type_id, "—")
        target_name = object_type_names.get(relation.target_object_type_id, "—")
        items.append(
            _to_list_item(
                kind="object_relation",
                entity_id=str(relation.id),
                title=relation.name,
                placement_label=f"{source_name} → {target_name}",
                deleted_at=relation.deleted_at,
                created_at=relation.created_at,
                deleted_by=relation.deleted_by,
                user_labels={},
            ),
        )

    for page in (
        db.query(Page)
        .filter(Page.portal_id == tenant_id, Page.deleted_at.isnot(None))
        .all()
    ):
        if page.deleted_by:
            user_ids.add(int(page.deleted_by))
        items.append(
            _to_list_item(
                kind="page",
                entity_id=str(page.id),
                title=page.title,
                placement_label="Студия → Страницы",
                deleted_at=page.deleted_at,
                created_at=page.created_at,
                deleted_by=page.deleted_by,
                user_labels={},
            ),
        )

    for nav in (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.deleted_at.isnot(None),
        )
        .all()
    ):
        if nav.deleted_by:
            user_ids.add(int(nav.deleted_by))
        items.append(
            _to_list_item(
                kind="navigation",
                entity_id=str(nav.id),
                title=nav.title,
                placement_label="Office → Навигация",
                deleted_at=nav.deleted_at,
                created_at=None,
                deleted_by=nav.deleted_by,
                user_labels={},
            ),
        )

    user_labels = _user_label_map(db, user_ids)
    final_items: list[TrashListItemRead] = []
    for raw in items:
        deleted_by_id = _resolve_deleted_by_id(db, tenant_id, raw.kind, raw.id)
        final_items.append(
            raw.model_copy(
                update={
                    "deleted_by_label": user_labels.get(deleted_by_id, "—")
                    if deleted_by_id
                    else "—",
                },
            ),
        )

    final_items.sort(key=lambda row: row.deleted_at or datetime.min, reverse=True)
    return TrashListResponse(items=final_items)


def _resolve_deleted_by_id(db: Session, tenant_id: int, kind: TrashEntityKind, entity_id: str) -> int | None:
    entity = _load_entity(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id, require_deleted=False)
    if entity is None:
        return None
    value = getattr(entity, "deleted_by", None)
    return int(value) if value is not None else None


def get_trash_detail(db: Session, *, tenant_id: int, kind: TrashEntityKind, entity_id: str) -> TrashDetailRead:
    entity = _load_entity(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id, require_deleted=True)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Элемент корзины не найден")

    listed = list_trash_items(db, tenant_id=tenant_id)
    match = next((item for item in listed.items if item.kind == kind and item.id == entity_id), None)
    if match is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Элемент корзины не найден")

    return TrashDetailRead(**match.model_dump(), deleted_by_id=_resolve_deleted_by_id(db, tenant_id, kind, entity_id))


def _load_entity(
    db: Session,
    *,
    tenant_id: int,
    kind: TrashEntityKind,
    entity_id: str,
    require_deleted: bool,
) -> Any | None:
    if kind == "workspace":
        query = db.query(DesignerWorkspace).filter(
            DesignerWorkspace.tenant_id == tenant_id,
            DesignerWorkspace.id == int(entity_id),
        )
    elif kind == "workspace_tab":
        query = db.query(DesignerWorkspaceTab).filter(
            DesignerWorkspaceTab.tenant_id == tenant_id,
            DesignerWorkspaceTab.id == int(entity_id),
        )
    elif kind == "object_type":
        query = db.query(DesignerObjectType).filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.id == UUID(entity_id),
        )
    elif kind == "object_view":
        query = db.query(DesignerViewDefinition).filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.id == UUID(entity_id),
        )
    elif kind == "object_relation":
        query = db.query(DesignerRelationDefinition).filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.id == UUID(entity_id),
        )
    elif kind == "page":
        query = db.query(Page).filter(Page.portal_id == tenant_id, Page.id == int(entity_id))
    elif kind == "navigation":
        query = db.query(NavigationItem).filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.id == int(entity_id),
        )
    else:
        return None

    entity = query.first()
    if entity is None:
        return None
    if require_deleted and getattr(entity, "deleted_at", None) is None:
        return None
    return entity


def collect_purge_dependencies(
    db: Session,
    *,
    tenant_id: int,
    kind: TrashEntityKind,
    entity_id: str,
) -> list[TrashDependencyRead]:
    return dependency_resolution_service.get_dependencies(
        db,
        tenant_id=tenant_id,
        kind=kind,
        entity_id=entity_id,
    )


def _http_exception_error_message(exc: HTTPException) -> str:
    if isinstance(exc.detail, str):
        return exc.detail
    if isinstance(exc.detail, dict):
        return str(exc.detail.get("message") or exc.detail.get("error") or exc.detail)
    return str(exc.detail)


def restore_trash_item(db: Session, *, tenant_id: int, kind: TrashEntityKind, entity_id: str) -> None:
    entity = _load_entity(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id, require_deleted=True)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Элемент корзины не найден")
    ensure_restore_allowed(db, tenant_id=tenant_id, kind=kind, entity=entity)
    restore_soft_deleted(entity)
    db.commit()


def purge_trash_item(db: Session, *, tenant_id: int, kind: TrashEntityKind, entity_id: str) -> None:
    entity = _load_entity(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id, require_deleted=True)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Элемент корзины не найден")

    if kind == "object_type":
        object_type_service.purge_object_type_from_trash(
            db,
            tenant_id,
            UUID(entity_id),
        )
        db.commit()
        return

    dependencies = collect_purge_dependencies(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id)
    if dependencies:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Зависимости обнаружены",
                "dependencies": [item.model_dump() for item in dependencies],
            },
        )

    db.delete(entity)
    db.commit()


def restore_trash_bulk(db: Session, *, tenant_id: int, items: list[TrashItemRef]) -> TrashBulkResponse:
    results: list[TrashBulkResultItem] = []
    for item in items:
        try:
            restore_trash_item(db, tenant_id=tenant_id, kind=item.kind, entity_id=item.id)
            results.append(TrashBulkResultItem(kind=item.kind, id=item.id, success=True))
        except HTTPException as exc:
            results.append(
                TrashBulkResultItem(
                    kind=item.kind,
                    id=item.id,
                    success=False,
                    error=_http_exception_error_message(exc),
                ),
            )
    return TrashBulkResponse(results=results)


def purge_trash_bulk(db: Session, *, tenant_id: int, items: list[TrashItemRef]) -> TrashBulkResponse:
    results: list[TrashBulkResultItem] = []
    for item in items:
        try:
            purge_trash_item(db, tenant_id=tenant_id, kind=item.kind, entity_id=item.id)
            results.append(TrashBulkResultItem(kind=item.kind, id=item.id, success=True))
        except HTTPException as exc:
            results.append(
                TrashBulkResultItem(
                    kind=item.kind,
                    id=item.id,
                    success=False,
                    error=_http_exception_error_message(exc),
                ),
            )
    return TrashBulkResponse(results=results)


def check_purge_allowed(
    db: Session,
    *,
    tenant_id: int,
    kind: TrashEntityKind,
    entity_id: str,
) -> TrashPurgeBlockedResponse | None:
    if kind == "object_type":
        entity = _load_entity(
            db,
            tenant_id=tenant_id,
            kind=kind,
            entity_id=entity_id,
            require_deleted=True,
        )
        if entity is None:
            return None

        internal_counts = count_internal_entities(
            db,
            tenant_id,
            entity.id,
            object_type_key=entity.key,
        )
        external_warnings = find_external_dependencies(
            db,
            tenant_id,
            entity.id,
            object_type_name=entity.name,
        )
        return TrashPurgeBlockedResponse(
            blocked=False,
            message="",
            internal_counts=[
                TrashCascadeCountItem(
                    category=item.category,
                    label=item.label,
                    count=item.count,
                )
                for item in internal_counts
            ],
            external_warnings=[
                TrashExternalWarningGroup(
                    category=item.category,
                    label=item.label,
                    items=item.items,
                )
                for item in external_warnings
            ],
            has_external_warnings=bool(external_warnings),
        )

    dependencies = collect_purge_dependencies(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id)
    if not dependencies:
        return None
    entity = _load_entity(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id, require_deleted=True)
    title = str(getattr(entity, "title", None) or getattr(entity, "name", None) or "Объект")
    tree = dependency_resolution_service.build_dependency_tree(
        db,
        tenant_id=tenant_id,
        kind=kind,
        entity_id=entity_id,
        title=title,
    )
    return TrashPurgeBlockedResponse(dependencies=dependencies, tree=tree)


def clear_purge_dependencies(
    db: Session,
    *,
    tenant_id: int,
    kind: TrashEntityKind,
    entity_id: str,
) -> TrashDependencyActionResponse:
    entity = _load_entity(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id, require_deleted=True)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Элемент корзины не найден")

    cleared = dependency_resolution_service.clear_dependencies(
        db,
        tenant_id=tenant_id,
        kind=kind,
        entity_id=entity_id,
    )
    purge_trash_item(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id)
    return TrashDependencyActionResponse(mode="clear", cleared_dependencies=cleared)


def cascade_purge_with_dependencies(
    db: Session,
    *,
    tenant_id: int,
    kind: TrashEntityKind,
    entity_id: str,
    confirm: bool,
) -> TrashDependencyActionResponse:
    entity = _load_entity(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id, require_deleted=True)
    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Элемент корзины не найден")

    title = str(getattr(entity, "title", None) or getattr(entity, "name", None) or "Объект")
    tree = dependency_resolution_service.build_dependency_tree(
        db,
        tenant_id=tenant_id,
        kind=kind,
        entity_id=entity_id,
        title=title,
    )

    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Требуется подтверждение каскадного удаления",
                "tree": tree.model_dump(),
                "total_nodes": tree.total_nodes,
            },
        )

    deleted_pairs = dependency_resolution_service.cascade_delete(
        db,
        tenant_id=tenant_id,
        kind=kind,
        entity_id=entity_id,
    )
    purge_trash_item(db, tenant_id=tenant_id, kind=kind, entity_id=entity_id)
    deleted_items = [TrashItemRef(kind=kind, id=entity_id)]
    deleted_items.extend(TrashItemRef(kind=item_kind, id=item_id) for item_kind, item_id in deleted_pairs)
    return TrashDependencyActionResponse(mode="cascade", deleted_items=deleted_items, tree=tree)
