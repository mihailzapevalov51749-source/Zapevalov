from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.trash.schemas import TrashEntityKind
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab

RESTORE_CONFLICT_ERROR = "restore_conflict"

FIELD_DEFINITION_ENTITY_TYPE = "field_definition"


def build_restore_conflict_detail(
    *,
    entity_type: str,
    key: str | None = None,
    message: str | None = None,
) -> dict[str, str]:
    return {
        "error": RESTORE_CONFLICT_ERROR,
        "message": message or "Активная сущность с таким ключом уже существует",
        "entity_type": entity_type,
        "key": key or "",
    }


def raise_restore_conflict(*, entity_type: str, key: str | None = None, message: str | None = None) -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=build_restore_conflict_detail(entity_type=entity_type, key=key, message=message),
    )


def _active_conflict_exists(query) -> bool:
    return query.first() is not None


def check_restore_conflict(
    db: Session,
    *,
    tenant_id: int,
    kind: TrashEntityKind,
    entity: Any,
) -> dict[str, str] | None:
    if kind == "object_type":
        return _check_object_type_conflict(db, tenant_id=tenant_id, entity=entity)
    if kind == "object_relation":
        return _check_relation_definition_conflict(db, tenant_id=tenant_id, entity=entity)
    if kind == "object_view":
        return _check_object_view_conflict(db, tenant_id=tenant_id, entity=entity)
    if kind == "workspace":
        return _check_workspace_conflict(db, tenant_id=tenant_id, entity=entity)
    if kind == "workspace_tab":
        return _check_workspace_tab_conflict(db, entity=entity)
    if kind == "navigation":
        return _check_navigation_conflict(db, tenant_id=tenant_id, entity=entity)
    return None


def check_field_definition_restore_conflict(
    db: Session,
    *,
    tenant_id: int,
    entity: DesignerFieldDefinition,
) -> dict[str, str] | None:
    conflict = _active_conflict_exists(
        db.query(DesignerFieldDefinition.id).filter(
            DesignerFieldDefinition.tenant_id == tenant_id,
            DesignerFieldDefinition.object_type_id == entity.object_type_id,
            DesignerFieldDefinition.key == entity.key,
            DesignerFieldDefinition.deleted_at.is_(None),
            DesignerFieldDefinition.id != entity.id,
        ),
    )
    if not conflict:
        return None
    return build_restore_conflict_detail(
        entity_type=FIELD_DEFINITION_ENTITY_TYPE,
        key=str(entity.key),
    )


def ensure_restore_allowed(
    db: Session,
    *,
    tenant_id: int,
    kind: TrashEntityKind,
    entity: Any,
) -> None:
    conflict = check_restore_conflict(db, tenant_id=tenant_id, kind=kind, entity=entity)
    if conflict is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict)


def _check_object_type_conflict(db: Session, *, tenant_id: int, entity: DesignerObjectType) -> dict[str, str] | None:
    conflict = _active_conflict_exists(
        db.query(DesignerObjectType.id).filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.key == entity.key,
            DesignerObjectType.deleted_at.is_(None),
            DesignerObjectType.id != entity.id,
        ),
    )
    if not conflict:
        return None
    return build_restore_conflict_detail(entity_type="object_type", key=str(entity.key))


def _check_relation_definition_conflict(
    db: Session,
    *,
    tenant_id: int,
    entity: DesignerRelationDefinition,
) -> dict[str, str] | None:
    conflict = _active_conflict_exists(
        db.query(DesignerRelationDefinition.id).filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.key == entity.key,
            DesignerRelationDefinition.deleted_at.is_(None),
            DesignerRelationDefinition.id != entity.id,
        ),
    )
    if not conflict:
        return None
    return build_restore_conflict_detail(entity_type="relation_definition", key=str(entity.key))


def _check_object_view_conflict(
    db: Session,
    *,
    tenant_id: int,
    entity: DesignerViewDefinition,
) -> dict[str, str] | None:
    conflict = _active_conflict_exists(
        db.query(DesignerViewDefinition.id).filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.object_type_id == entity.object_type_id,
            DesignerViewDefinition.key == entity.key,
            DesignerViewDefinition.deleted_at.is_(None),
            DesignerViewDefinition.id != entity.id,
        ),
    )
    if conflict:
        return build_restore_conflict_detail(entity_type="object_view", key=str(entity.key))

    if not getattr(entity, "is_default", False):
        return None

    default_conflict = _active_conflict_exists(
        db.query(DesignerViewDefinition.id).filter(
            DesignerViewDefinition.object_type_id == entity.object_type_id,
            DesignerViewDefinition.is_default.is_(True),
            DesignerViewDefinition.deleted_at.is_(None),
            DesignerViewDefinition.id != entity.id,
        ),
    )
    if not default_conflict:
        return None
    return build_restore_conflict_detail(
        entity_type="object_view",
        key=str(entity.key),
        message="Активное представление по умолчанию для этого объекта уже существует",
    )


def _check_workspace_conflict(db: Session, *, tenant_id: int, entity: DesignerWorkspace) -> dict[str, str] | None:
    conflict = _active_conflict_exists(
        db.query(DesignerWorkspace.id).filter(
            DesignerWorkspace.tenant_id == tenant_id,
            DesignerWorkspace.slug == entity.slug,
            DesignerWorkspace.deleted_at.is_(None),
            DesignerWorkspace.id != entity.id,
        ),
    )
    if not conflict:
        return None
    return build_restore_conflict_detail(entity_type="workspace", key=str(entity.slug))


def _check_workspace_tab_conflict(db: Session, *, entity: DesignerWorkspaceTab) -> dict[str, str] | None:
    conflict = _active_conflict_exists(
        db.query(DesignerWorkspaceTab.id).filter(
            DesignerWorkspaceTab.workspace_id == entity.workspace_id,
            DesignerWorkspaceTab.slug == entity.slug,
            DesignerWorkspaceTab.deleted_at.is_(None),
            DesignerWorkspaceTab.id != entity.id,
        ),
    )
    if not conflict:
        return None
    return build_restore_conflict_detail(entity_type="workspace_tab", key=str(entity.slug))


def _check_navigation_conflict(db: Session, *, tenant_id: int, entity: NavigationItem) -> dict[str, str] | None:
    object_type_id = getattr(entity, "object_type_id", None)
    if object_type_id is None:
        return None

    conflict = _active_conflict_exists(
        db.query(NavigationItem.id).filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.menu_scope == entity.menu_scope,
            NavigationItem.object_type_id == object_type_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.id != entity.id,
        ),
    )
    if not conflict:
        return None

    key = str(object_type_id)
    return build_restore_conflict_detail(
        entity_type="navigation_item",
        key=key,
        message="Активный элемент навигации для этого объекта уже существует",
    )


def check_page_restore_conflict(db: Session, *, tenant_id: int, entity: Page) -> dict[str, str] | None:
    """Reserved for future page-level unique constraints."""
    return None
