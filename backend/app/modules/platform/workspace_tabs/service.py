from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.shared.constants import DESIGNER_ROLES
from app.modules.platform.workspace_tabs import repository
from app.modules.platform.workspace_tabs.models import UserWorkspaceTab
from app.modules.platform.workspace_tabs.registry import (
    ALLOWED_MODULE_KEYS,
    ALLOWED_PAGE_TYPES,
    OFFICE_MODULE_KEYS,
    STUDIO_MODULE_KEYS,
)
from app.modules.platform.workspace_tabs.schemas import (
    WorkspaceTabCreate,
    WorkspaceTabRead,
    WorkspaceTabReorder,
    WorkspaceTabUpdate,
)
from app.modules.platform.workspace_tabs.tenant_access import (
    assert_user_has_workspace_tab_tenant_access,
    get_workspace_tab_for_user,
    resolve_tab_tenant_id,
    resolve_tenant_id_from_route,
    user_can_access_workspace_tab_tenant,
)
from app.modules.portals.models import Portal
from app.modules.users.models import User


def actor_user_id(current_user: User) -> int:
    return int(current_user.id)


def _role_name(current_user: User) -> str | None:
    return current_user.role.name if current_user.role else None


def _is_superadmin(current_user: User) -> bool:
    return _role_name(current_user) == "superadmin"


def _is_designer(current_user: User) -> bool:
    role = _role_name(current_user)
    return bool(role and role in DESIGNER_ROLES)


def _ensure_tenant_exists(db: Session, tenant_id: int | None) -> None:
    if tenant_id is None:
        return

    portal = db.query(Portal).filter(Portal.id == tenant_id).first()
    if not portal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tenant (portal) не найден",
        )


def _validate_tab_payload(
    *,
    title: str,
    route: str,
    module_key: str,
    page_type: str,
    context_json: dict | None,
) -> tuple[str, str, str, str, dict]:
    normalized_title = str(title or "").strip()
    normalized_route = str(route or "").strip()
    normalized_module_key = str(module_key or "").strip()
    normalized_page_type = str(page_type or "").strip()

    if not normalized_title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="title обязателен",
        )
    if not normalized_route:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="route обязателен",
        )
    if normalized_module_key not in ALLOWED_MODULE_KEYS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Недопустимый module_key",
        )
    if normalized_page_type not in ALLOWED_PAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Недопустимый page_type",
        )

    normalized_context = context_json if isinstance(context_json, dict) else {}
    return (
        normalized_title,
        normalized_route,
        normalized_module_key,
        normalized_page_type,
        normalized_context,
    )


def _can_manage_tab(
    current_user: User,
    *,
    module_key: str,
    tenant_id: int | None,
) -> None:
    if _is_superadmin(current_user):
        return

    if module_key in OFFICE_MODULE_KEYS:
        return

    if module_key in STUDIO_MODULE_KEYS and _is_designer(current_user):
        if tenant_id is not None:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Studio-вкладки доступны только в контексте tenant",
        )

    if module_key == "admin" and _is_superadmin(current_user):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Недостаточно прав для закрепления этой страницы",
    )


def _get_owned_tab(
    db: Session,
    current_user: User,
    tab_id: UUID,
) -> UserWorkspaceTab:
    entity = get_workspace_tab_for_user(db, current_user, tab_id)
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace tab не найден",
        )
    return entity


def _resolve_effective_tenant_id(
    *,
    tenant_id: int | None,
    route: str,
) -> int | None:
    route_tenant_id = resolve_tenant_id_from_route(route)
    if tenant_id is not None and route_tenant_id is not None:
        if int(tenant_id) != int(route_tenant_id):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="tenant_id не соответствует tenant в route",
            )
    return tenant_id if tenant_id is not None else route_tenant_id


def list_workspace_tabs(
    db: Session,
    current_user: User,
    *,
    tenant_id: int | None = None,
) -> list[WorkspaceTabRead]:
    if tenant_id is not None:
        _ensure_tenant_exists(db, tenant_id)
        assert_user_has_workspace_tab_tenant_access(db, current_user, tenant_id)

    entities = repository.list_tabs_for_user(
        db,
        actor_user_id(current_user),
        tenant_id=tenant_id,
    )

    visible_entities = [
        entity
        for entity in entities
        if user_can_access_workspace_tab_tenant(
            db,
            current_user,
            resolve_tab_tenant_id(entity),
        )
    ]
    return [WorkspaceTabRead.model_validate(entity) for entity in visible_entities]


def create_workspace_tab(
    db: Session,
    current_user: User,
    payload: WorkspaceTabCreate,
) -> WorkspaceTabRead:
    title, route, module_key, page_type, context_json = _validate_tab_payload(
        title=payload.title,
        route=payload.route,
        module_key=payload.module_key,
        page_type=payload.page_type,
        context_json=payload.context_json,
    )

    effective_tenant_id = _resolve_effective_tenant_id(
        tenant_id=payload.tenant_id,
        route=route,
    )
    if effective_tenant_id is not None:
        _ensure_tenant_exists(db, effective_tenant_id)
        assert_user_has_workspace_tab_tenant_access(
            db,
            current_user,
            effective_tenant_id,
        )

    _can_manage_tab(
        current_user,
        module_key=module_key,
        tenant_id=effective_tenant_id,
    )

    user_id = actor_user_id(current_user)
    existing = repository.get_tab_by_route(db, user_id, route)
    if existing:
        existing.last_opened_at = datetime.now(timezone.utc)
        existing.is_minimized = False
        if payload.is_pinned:
            existing.is_pinned = True
        if payload.title:
            existing.title = title
        if payload.icon_key is not None:
            existing.icon_key = payload.icon_key
        existing.context_json = context_json
        existing.updated_at = datetime.now(timezone.utc)
        entity = repository.save_tab(db, existing)
        return WorkspaceTabRead.model_validate(entity)

    entity = UserWorkspaceTab(
        user_id=user_id,
        tenant_id=effective_tenant_id,
        title=title,
        route=route,
        module_key=module_key,
        page_type=page_type,
        icon_key=payload.icon_key,
        context_json=context_json,
        is_pinned=payload.is_pinned,
        is_minimized=payload.is_minimized,
        sort_order=payload.sort_order,
        last_opened_at=datetime.now(timezone.utc),
    )
    entity = repository.create_tab(db, entity)
    return WorkspaceTabRead.model_validate(entity)


def update_workspace_tab(
    db: Session,
    current_user: User,
    tab_id: UUID,
    payload: WorkspaceTabUpdate,
) -> WorkspaceTabRead:
    entity = _get_owned_tab(db, current_user, tab_id)
    _can_manage_tab(
        current_user,
        module_key=entity.module_key,
        tenant_id=entity.tenant_id,
    )

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Нет полей для обновления",
        )

    if "title" in updates:
        title = str(updates["title"] or "").strip()
        if not title:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="title обязателен",
            )
        entity.title = title

    if "context_json" in updates:
        context_json = updates["context_json"]
        if not isinstance(context_json, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="context_json должен быть объектом",
            )
        entity.context_json = context_json

    for field in ("icon_key", "is_pinned", "is_minimized", "sort_order", "last_opened_at"):
        if field in updates:
            setattr(entity, field, updates[field])

    entity.updated_at = datetime.now(timezone.utc)
    entity = repository.save_tab(db, entity)
    return WorkspaceTabRead.model_validate(entity)


def delete_workspace_tab(
    db: Session,
    current_user: User,
    tab_id: UUID,
) -> None:
    entity = _get_owned_tab(db, current_user, tab_id)
    repository.delete_tab(db, entity)


def open_workspace_tab(
    db: Session,
    current_user: User,
    tab_id: UUID,
) -> WorkspaceTabRead:
    entity = _get_owned_tab(db, current_user, tab_id)
    entity = repository.touch_tab_opened(db, entity)
    return WorkspaceTabRead.model_validate(entity)


def reorder_workspace_tabs(
    db: Session,
    current_user: User,
    payload: WorkspaceTabReorder,
) -> list[WorkspaceTabRead]:
    user_id = actor_user_id(current_user)
    tab_ids = [item.id for item in payload.items]
    entities = {
        entity.id: entity
        for entity in db.query(UserWorkspaceTab)
        .filter(
            UserWorkspaceTab.user_id == user_id,
            UserWorkspaceTab.id.in_(tab_ids),
        )
        .all()
    }

    if len(entities) != len(tab_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Одна или несколько вкладок не найдены",
        )

    for entity in entities.values():
        assert_user_has_workspace_tab_tenant_access(
            db,
            current_user,
            resolve_tab_tenant_id(entity),
        )

    for item in payload.items:
        entities[item.id].sort_order = item.sort_order
        entities[item.id].updated_at = datetime.now(timezone.utc)

    db.commit()
    for entity in entities.values():
        db.refresh(entity)

    return list_workspace_tabs(db, current_user)
