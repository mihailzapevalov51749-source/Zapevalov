from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.office_user_views import repository
from app.modules.platform.runtime.office_user_views.models import RuntimeOfficeUserTableView
from app.modules.platform.runtime.office_user_views.schemas import (
    OfficeUserTableViewCreate,
    OfficeUserTableViewRead,
    OfficeUserTableViewStateRead,
    OfficeUserTableViewUpdate,
)
from app.modules.users.models import User


def _serialize(entity: RuntimeOfficeUserTableView) -> OfficeUserTableViewRead:
    return OfficeUserTableViewRead(
        id=entity.id,
        tenant_id=entity.tenant_id,
        owner_user_id=entity.owner_user_id,
        object_type_key=entity.object_type_key,
        key=entity.view_key,
        name=entity.name,
        view_type=entity.view_type,
        is_default=bool(entity.is_default),
        is_visible=bool(entity.is_visible),
        settings_json=entity.settings_json or {},
        filters_json=entity.filters_json or {},
        layout_json=entity.layout_json or {},
        visibility_json=entity.visibility_json or {},
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def _resolve_default_view(views: list[RuntimeOfficeUserTableView]) -> RuntimeOfficeUserTableView | None:
    defaults = [item for item in views if item.is_default]

    if len(defaults) > 1:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Обнаружено несколько представлений по умолчанию в одном scope",
        )

    return defaults[0] if defaults else None


def list_user_table_views(
    db: Session,
    *,
    tenant_id: int,
    owner_user_id: int,
    object_type_key: str,
) -> OfficeUserTableViewStateRead:
    views = repository.list_views(db, tenant_id, owner_user_id, object_type_key)
    default_view = _resolve_default_view(views)

    return OfficeUserTableViewStateRead(
        default_view_id=default_view.id if default_view else None,
        default_view_key=default_view.view_key if default_view else None,
        views=[_serialize(item) for item in views],
    )


def create_user_table_view(
    db: Session,
    *,
    tenant_id: int,
    owner_user_id: int,
    object_type_key: str,
    payload: OfficeUserTableViewCreate,
) -> OfficeUserTableViewRead:
    if repository.get_by_key(
        db,
        tenant_id=tenant_id,
        owner_user_id=owner_user_id,
        object_type_key=object_type_key,
        view_key=payload.key,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Представление с key '{payload.key}' уже существует",
        )

    if payload.is_default:
        repository.clear_default_flags(
            db,
            tenant_id=tenant_id,
            owner_user_id=owner_user_id,
            object_type_key=object_type_key,
        )

    entity = RuntimeOfficeUserTableView(
        tenant_id=tenant_id,
        owner_user_id=owner_user_id,
        object_type_key=object_type_key,
        view_key=payload.key.strip(),
        name=payload.name.strip(),
        view_type=payload.view_type or "table",
        is_default=bool(payload.is_default),
        is_visible=bool(payload.is_visible),
        settings_json=payload.settings_json or {},
        filters_json=payload.filters_json or {},
        layout_json=payload.layout_json or {},
        visibility_json=payload.visibility_json or {},
    )
    repository.create_view(db, entity)
    repository.commit(db)
    repository.refresh(db, entity)
    return _serialize(entity)


def update_user_table_view(
    db: Session,
    *,
    tenant_id: int,
    owner_user_id: int,
    object_type_key: str,
    view_id: UUID,
    payload: OfficeUserTableViewUpdate,
) -> OfficeUserTableViewRead:
    entity = repository.get_by_id(
        db,
        tenant_id=tenant_id,
        owner_user_id=owner_user_id,
        object_type_key=object_type_key,
        view_id=view_id,
    )

    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Представление не найдено")

    updates = payload.model_dump(exclude_unset=True)

    if updates.get("is_default") is True:
        repository.clear_default_flags(
            db,
            tenant_id=tenant_id,
            owner_user_id=owner_user_id,
            object_type_key=object_type_key,
        )

    for key, value in updates.items():
        setattr(entity, key, value)

    repository.commit(db)
    repository.refresh(db, entity)

    if updates.get("is_default") is True:
        scope_views = repository.list_views(
            db,
            tenant_id,
            owner_user_id,
            object_type_key,
        )
        _resolve_default_view(scope_views)

    return _serialize(entity)


def delete_user_table_view(
    db: Session,
    *,
    tenant_id: int,
    owner_user_id: int,
    object_type_key: str,
    view_id: UUID,
) -> None:
    entity = repository.get_by_id(
        db,
        tenant_id=tenant_id,
        owner_user_id=owner_user_id,
        object_type_key=object_type_key,
        view_id=view_id,
    )

    if entity is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Представление не найдено")

    repository.delete_view(db, entity)
    repository.commit(db)


def actor_user_id(current_user: User | None) -> int:
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация")
    return current_user.id
