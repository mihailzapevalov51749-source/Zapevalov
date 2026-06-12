from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.pages.protected_pages import (
    PROTECTED_PAGE_HARD_DELETE_MESSAGE,
    is_protected_page,
)
from app.modules.platform.designer.object_types import service as object_type_service
from app.modules.platform.designer.object_types.cascade_delete import find_external_dependencies
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.trash.dependency_resolution_service import (
    dependency_resolution_service,
)
from app.modules.platform.designer.trash.schemas import (
    TrashBulkPurgeBlockedItem,
    TrashBulkPurgeItemSummary,
    TrashBulkPurgeResponse,
    TrashEntityKind,
    TrashItemRef,
)
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab

PURGE_KIND_ORDER: dict[TrashEntityKind, int] = {
    "object_view": 10,
    "object_relation": 20,
    "navigation": 30,
    "workspace_tab": 40,
    "page": 50,
    "workspace": 60,
    "object_type": 70,
}


def trash_ref_key(kind: TrashEntityKind, entity_id: str | int) -> tuple[TrashEntityKind, str]:
    return kind, str(entity_id)


@dataclass(slots=True)
class BulkPurgePlan:
    to_purge: list[TrashBulkPurgeItemSummary] = field(default_factory=list)
    skipped_as_dependent: list[TrashBulkPurgeItemSummary] = field(default_factory=list)
    skipped_missing: list[TrashBulkPurgeItemSummary] = field(default_factory=list)


def normalize_trash_items(items: list[TrashItemRef]) -> list[TrashItemRef]:
    seen: set[tuple[TrashEntityKind, str]] = set()
    normalized: list[TrashItemRef] = []
    for item in items:
        key = trash_ref_key(item.kind, item.id)
        if key in seen:
            continue
        seen.add(key)
        normalized.append(TrashItemRef(kind=item.kind, id=str(item.id)))
    return normalized


def _entity_label(entity: Any, *, fallback: str) -> str:
    for attr in ("title", "name"):
        value = getattr(entity, attr, None)
        if value:
            return str(value)
    return fallback


def load_trash_entity(
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


def _summary_from_ref(
    db: Session,
    *,
    tenant_id: int,
    ref: TrashItemRef,
    require_deleted: bool,
) -> tuple[TrashBulkPurgeItemSummary | None, Any | None]:
    entity = load_trash_entity(
        db,
        tenant_id=tenant_id,
        kind=ref.kind,
        entity_id=ref.id,
        require_deleted=require_deleted,
    )
    if entity is None:
        return (
            TrashBulkPurgeItemSummary(kind=ref.kind, id=str(ref.id), label=str(ref.id)),
            None,
        )
    return (
        TrashBulkPurgeItemSummary(
            kind=ref.kind,
            id=str(ref.id),
            label=_entity_label(entity, fallback=str(ref.id)),
        ),
        entity,
    )


def _is_object_internal_dependent(
    db: Session,
    *,
    tenant_id: int,
    ref: TrashItemRef,
    entity: Any,
    selected_object_type_ids: set[UUID],
) -> bool:
    if ref.kind == "object_view":
        return entity.object_type_id in selected_object_type_ids
    if ref.kind == "object_relation":
        return (
            entity.source_object_type_id in selected_object_type_ids
            or entity.target_object_type_id in selected_object_type_ids
        )
    if ref.kind == "navigation":
        object_type_id = getattr(entity, "object_type_id", None)
        if object_type_id and object_type_id in selected_object_type_ids:
            return True
    return False


def build_bulk_purge_plan(
    db: Session,
    *,
    tenant_id: int,
    items: list[TrashItemRef],
) -> BulkPurgePlan:
    normalized = normalize_trash_items(items)
    plan = BulkPurgePlan()
    loaded: dict[tuple[TrashEntityKind, str], tuple[TrashBulkPurgeItemSummary, Any | None]] = {}

    for ref in normalized:
        summary, entity = _summary_from_ref(db, tenant_id=tenant_id, ref=ref, require_deleted=True)
        loaded[trash_ref_key(ref.kind, ref.id)] = (summary, entity)
        if entity is None:
            plan.skipped_missing.append(summary)

    selected_object_type_ids: set[UUID] = set()
    for key, (_summary, entity) in loaded.items():
        if key[0] == "object_type" and entity is not None:
            selected_object_type_ids.add(entity.id)

    selected_workspace_ids: set[int] = set()
    for key, (_summary, entity) in loaded.items():
        if key[0] == "workspace" and entity is not None:
            selected_workspace_ids.add(int(key[1]))

    selected_navigation_ids: set[int] = set()
    for key, (_summary, entity) in loaded.items():
        if key[0] == "navigation" and entity is not None:
            selected_navigation_ids.add(int(key[1]))

    for ref in normalized:
        key = trash_ref_key(ref.kind, ref.id)
        summary, entity = loaded[key]
        if entity is None:
            continue

        if selected_object_type_ids and _is_object_internal_dependent(
            db,
            tenant_id=tenant_id,
            ref=ref,
            entity=entity,
            selected_object_type_ids=selected_object_type_ids,
        ):
            plan.skipped_as_dependent.append(summary)
            continue

        if ref.kind == "workspace_tab" and int(entity.workspace_id) in selected_workspace_ids:
            plan.skipped_as_dependent.append(summary)
            continue

        if (
            ref.kind == "navigation"
            and entity.parent_id is not None
            and int(entity.parent_id) in selected_navigation_ids
        ):
            plan.skipped_as_dependent.append(summary)
            continue

        plan.to_purge.append(summary)

    plan.to_purge.sort(key=lambda item: (PURGE_KIND_ORDER.get(item.kind, 999), item.label))
    return plan


def _selection_keys(items: list[TrashItemRef]) -> set[tuple[TrashEntityKind, str]]:
    return {trash_ref_key(item.kind, item.id) for item in items}


def _is_page_internal_dependency(
    *,
    parent_kind: TrashEntityKind,
    dependency_kind: str | None,
    dependency_entity_kind: str | None,
) -> bool:
    if parent_kind != "page":
        return False
    if dependency_kind == "page_section":
        return True
    return dependency_entity_kind == "page_section"


def _dependency_covered_by_plan(
    *,
    parent_kind: TrashEntityKind | None = None,
    dependency_kind: str | None,
    dependency_entity_kind: str | None,
    dependency_entity_id: str | None,
    selection_keys: set[tuple[TrashEntityKind, str]],
    purge_keys: set[tuple[TrashEntityKind, str]],
    skipped_keys: set[tuple[TrashEntityKind, str]],
) -> bool:
    if parent_kind and _is_page_internal_dependency(
        parent_kind=parent_kind,
        dependency_kind=dependency_kind,
        dependency_entity_kind=dependency_entity_kind,
    ):
        return True

    if dependency_entity_kind and dependency_entity_id:
        dep_key = trash_ref_key(dependency_entity_kind, dependency_entity_id)
        if dep_key in selection_keys or dep_key in purge_keys or dep_key in skipped_keys:
            return True

    if dependency_kind == "workspace_tab" and dependency_entity_id:
        dep_key = trash_ref_key("workspace_tab", dependency_entity_id)
        if dep_key in selection_keys or dep_key in skipped_keys:
            return True

    if dependency_kind == "navigation" and dependency_entity_id:
        dep_key = trash_ref_key("navigation", dependency_entity_id)
        if dep_key in selection_keys or dep_key in skipped_keys:
            return True

    if dependency_kind == "workspace" and dependency_entity_id:
        dep_key = trash_ref_key("workspace", dependency_entity_id)
        if dep_key in selection_keys or dep_key in purge_keys or dep_key in skipped_keys:
            return True

    return False


def _deduplicate_blocked(
    blocked: list[TrashBulkPurgeBlockedItem],
) -> list[TrashBulkPurgeBlockedItem]:
    seen: set[tuple[str, str, str]] = set()
    unique: list[TrashBulkPurgeBlockedItem] = []
    for item in blocked:
        key = (item.kind, item.id, item.reason)
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def _check_protected_pages_blocked(
    db: Session,
    *,
    tenant_id: int,
    plan: BulkPurgePlan,
) -> list[TrashBulkPurgeBlockedItem]:
    blocked: list[TrashBulkPurgeBlockedItem] = []
    for item in plan.to_purge:
        if item.kind != "page":
            continue
        page = load_trash_entity(
            db,
            tenant_id=tenant_id,
            kind="page",
            entity_id=item.id,
            require_deleted=True,
        )
        if page is None:
            continue
        if not is_protected_page(db, tenant_id=tenant_id, page=page):
            continue
        blocked.append(
            TrashBulkPurgeBlockedItem(
                kind=item.kind,
                id=item.id,
                label=item.label,
                reason=PROTECTED_PAGE_HARD_DELETE_MESSAGE,
            ),
        )
    return blocked


def check_bulk_purge_blocked(
    db: Session,
    *,
    tenant_id: int,
    plan: BulkPurgePlan,
    selection: list[TrashItemRef],
) -> list[TrashBulkPurgeBlockedItem]:
    selection_keys = _selection_keys(selection)
    purge_keys = {trash_ref_key(item.kind, item.id) for item in plan.to_purge}
    skipped_keys = {trash_ref_key(item.kind, item.id) for item in plan.skipped_as_dependent}
    blocked: list[TrashBulkPurgeBlockedItem] = list(
        _check_protected_pages_blocked(db, tenant_id=tenant_id, plan=plan),
    )
    protected_page_keys = {trash_ref_key(item.kind, item.id) for item in blocked if item.kind == "page"}

    for item in plan.to_purge:
        if trash_ref_key(item.kind, item.id) in protected_page_keys:
            continue

        if item.kind == "object_type":
            entity = load_trash_entity(
                db,
                tenant_id=tenant_id,
                kind=item.kind,
                entity_id=item.id,
                require_deleted=True,
            )
            if entity is None:
                continue
            for warning in find_external_dependencies(
                db,
                tenant_id,
                UUID(item.id),
                object_type_name=entity.name,
            ):
                if not warning.items:
                    continue
                blocked.append(
                    TrashBulkPurgeBlockedItem(
                        kind=item.kind,
                        id=item.id,
                        label=item.label,
                        reason=f"{warning.label}: {', '.join(warning.items[:3])}",
                    ),
                )
            continue

        dependencies = dependency_resolution_service.get_dependencies(
            db,
            tenant_id=tenant_id,
            kind=item.kind,
            entity_id=item.id,
        )
        for dependency in dependencies:
            if _dependency_covered_by_plan(
                parent_kind=item.kind,
                dependency_kind=dependency.kind,
                dependency_entity_kind=dependency.entity_kind,
                dependency_entity_id=dependency.entity_id,
                selection_keys=selection_keys,
                purge_keys=purge_keys,
                skipped_keys=skipped_keys,
            ):
                continue
            blocked.append(
                TrashBulkPurgeBlockedItem(
                    kind=item.kind,
                    id=item.id,
                    label=item.label,
                    reason=dependency.label,
                ),
            )

    return _deduplicate_blocked(blocked)


def _purge_workspace_with_tabs(
    db: Session,
    *,
    tenant_id: int,
    workspace_id: int,
    dependent_tab_ids: set[int],
) -> None:
    if dependent_tab_ids:
        tabs = (
            db.query(DesignerWorkspaceTab)
            .filter(
                DesignerWorkspaceTab.tenant_id == tenant_id,
                DesignerWorkspaceTab.workspace_id == workspace_id,
                DesignerWorkspaceTab.id.in_(sorted(dependent_tab_ids)),
            )
            .all()
        )
        for tab in tabs:
            db.delete(tab)

    workspace = load_trash_entity(
        db,
        tenant_id=tenant_id,
        kind="workspace",
        entity_id=str(workspace_id),
        require_deleted=True,
    )
    if workspace is not None:
        db.delete(workspace)


def _purge_page_with_sections(
    db: Session,
    *,
    tenant_id: int,
    page_id: int,
) -> None:
    dependency_resolution_service._clear_page_sections(db, page_id)
    page = load_trash_entity(
        db,
        tenant_id=tenant_id,
        kind="page",
        entity_id=str(page_id),
        require_deleted=True,
    )
    if page is not None:
        db.delete(page)


def _purge_navigation_with_children(
    db: Session,
    *,
    tenant_id: int,
    navigation_id: int,
    dependent_child_ids: set[int],
) -> None:
    if dependent_child_ids:
        children = (
            db.query(NavigationItem)
            .filter(
                NavigationItem.portal_id == tenant_id,
                NavigationItem.id.in_(sorted(dependent_child_ids)),
            )
            .all()
        )
        for child in children:
            db.delete(child)

    navigation = load_trash_entity(
        db,
        tenant_id=tenant_id,
        kind="navigation",
        entity_id=str(navigation_id),
        require_deleted=True,
    )
    if navigation is not None:
        db.delete(navigation)


def _purge_entity_in_transaction(
    db: Session,
    *,
    tenant_id: int,
    item: TrashBulkPurgeItemSummary,
    dependent_tab_ids_by_workspace: dict[int, set[int]],
    dependent_child_ids_by_navigation: dict[int, set[int]],
) -> None:
    if item.kind == "object_type":
        object_type_service.purge_object_type_from_trash(db, tenant_id, UUID(item.id))
        return

    if item.kind == "workspace":
        _purge_workspace_with_tabs(
            db,
            tenant_id=tenant_id,
            workspace_id=int(item.id),
            dependent_tab_ids=dependent_tab_ids_by_workspace.get(int(item.id), set()),
        )
        return

    if item.kind == "navigation":
        _purge_navigation_with_children(
            db,
            tenant_id=tenant_id,
            navigation_id=int(item.id),
            dependent_child_ids=dependent_child_ids_by_navigation.get(int(item.id), set()),
        )
        return

    if item.kind == "page":
        _purge_page_with_sections(
            db,
            tenant_id=tenant_id,
            page_id=int(item.id),
        )
        return

    entity = load_trash_entity(
        db,
        tenant_id=tenant_id,
        kind=item.kind,
        entity_id=item.id,
        require_deleted=True,
    )
    if entity is None:
        return
    db.delete(entity)


def _build_dependent_groupings(
    db: Session,
    *,
    tenant_id: int,
    plan: BulkPurgePlan,
) -> tuple[dict[int, set[int]], dict[int, set[int]]]:
    tabs_by_workspace: dict[int, set[int]] = {}
    children_by_navigation: dict[int, set[int]] = {}

    for item in plan.skipped_as_dependent:
        if item.kind == "workspace_tab":
            tab = load_trash_entity(
                db,
                tenant_id=tenant_id,
                kind="workspace_tab",
                entity_id=item.id,
                require_deleted=False,
            )
            if tab is None:
                continue
            tabs_by_workspace.setdefault(int(tab.workspace_id), set()).add(int(tab.id))
        elif item.kind == "navigation":
            nav = load_trash_entity(
                db,
                tenant_id=tenant_id,
                kind="navigation",
                entity_id=item.id,
                require_deleted=False,
            )
            if nav is None or nav.parent_id is None:
                continue
            children_by_navigation.setdefault(int(nav.parent_id), set()).add(int(nav.id))

    return tabs_by_workspace, children_by_navigation


def execute_bulk_purge_plan(
    db: Session,
    *,
    tenant_id: int,
    plan: BulkPurgePlan,
) -> None:
    tabs_by_workspace, children_by_navigation = _build_dependent_groupings(
        db,
        tenant_id=tenant_id,
        plan=plan,
    )
    for item in plan.to_purge:
        _purge_entity_in_transaction(
            db,
            tenant_id=tenant_id,
            item=item,
            dependent_tab_ids_by_workspace=tabs_by_workspace,
            dependent_child_ids_by_navigation=children_by_navigation,
        )


def _build_success_message(
    plan: BulkPurgePlan,
    *,
    deleted_count: int,
) -> str:
    dependent_count = len(plan.skipped_as_dependent)
    if dependent_count > 0 and len(plan.to_purge) == 1 and plan.to_purge[0].kind == "object_type":
        return f"Удалён 1 объект вместе с {dependent_count} зависимостями."
    if dependent_count > 0 and len(plan.to_purge) == 1 and plan.to_purge[0].kind == "workspace":
        return f"Удалено рабочее пространство вместе с {dependent_count} вкладками."
    if dependent_count > 0:
        return f"Удалено {deleted_count} элементов вместе с зависимостями."
    if deleted_count == 1:
        return "Удалён 1 элемент."
    return f"Удалено {deleted_count} элементов."


def execute_planned_bulk_purge(
    db: Session,
    *,
    tenant_id: int,
    items: list[TrashItemRef],
) -> TrashBulkPurgeResponse:
    normalized = normalize_trash_items(items)
    if not normalized:
        return TrashBulkPurgeResponse(
            success=True,
            message="Нет элементов для удаления.",
            deleted_count=0,
        )

    plan = build_bulk_purge_plan(db, tenant_id=tenant_id, items=normalized)
    blocked = check_bulk_purge_blocked(db, tenant_id=tenant_id, plan=plan, selection=normalized)
    if blocked:
        protected_only = all(
            item.reason == PROTECTED_PAGE_HARD_DELETE_MESSAGE for item in blocked
        )
        return TrashBulkPurgeResponse(
            success=False,
            message="Удаление запрещено" if protected_only else "Невозможно удалить выбранные элементы: обнаружены зависимости.",
            blocked=blocked,
        )

    if not plan.to_purge:
        deleted_count = len(plan.skipped_as_dependent) + len(plan.skipped_missing)
        return TrashBulkPurgeResponse(
            success=True,
            message="Выбранные элементы уже удалены или покрыты другими операциями.",
            deleted_count=deleted_count,
            skipped_as_dependent=plan.skipped_as_dependent,
            skipped_missing=plan.skipped_missing,
        )

    try:
        execute_bulk_purge_plan(db, tenant_id=tenant_id, plan=plan)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось выполнить массовое удаление",
        ) from exc

    deleted_count = len(plan.to_purge) + len(plan.skipped_as_dependent)
    return TrashBulkPurgeResponse(
        success=True,
        message=_build_success_message(plan, deleted_count=deleted_count),
        deleted_count=deleted_count,
        deleted=plan.to_purge,
        skipped_as_dependent=plan.skipped_as_dependent,
        skipped_missing=plan.skipped_missing,
    )
