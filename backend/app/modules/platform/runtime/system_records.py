"""Platform System Records — internal runtime entities hidden from user surfaces."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Query

from app.modules.platform.runtime.entities.models import RuntimeEntity


def is_runtime_system_entity(entity: RuntimeEntity | None) -> bool:
    if entity is None:
        return False

    return bool(getattr(entity, "is_system", False))


def apply_user_visible_entity_filter(query: Query) -> Query:
    """Exclude System Records from user-facing entity lists."""
    return query.filter(RuntimeEntity.is_system.is_(False))


def user_facing_entity_not_found() -> HTTPException:
    """System Records are not addressable through user entity APIs."""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Entity не найдена",
    )


def assert_user_facing_entity(entity: RuntimeEntity | None) -> RuntimeEntity:
    if entity is None or is_runtime_system_entity(entity):
        raise user_facing_entity_not_found()
    return entity
