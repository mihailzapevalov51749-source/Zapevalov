from typing import Any

from sqlalchemy import and_, asc, cast, desc, nullsfirst, nullslast
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, aliased, joinedload

from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.query.validators import ENTITY_SORT_FIELDS


def _base_query(
    db: Session,
    tenant_id: int,
    object_type_key: str,
):
    return db.query(RuntimeEntity).filter(
        RuntimeEntity.tenant_id == tenant_id,
        RuntimeEntity.object_type_key == object_type_key,
        RuntimeEntity.deleted_at.is_(None),
    )


def _apply_field_filters(
    query,
    db: Session,
    tenant_id: int,
    filters: dict[str, Any],
):
    for field_key, value in filters.items():
        query = query.filter(
            RuntimeEntity.id.in_(
                db.query(RuntimeEntityValue.entity_id).filter(
                    RuntimeEntityValue.tenant_id == tenant_id,
                    RuntimeEntityValue.field_key == field_key,
                    RuntimeEntityValue.value_json == cast(value, JSONB),
                ),
            ),
        )
    return query


def _order_clause(sort_field: str, sort_order: str):
    if sort_order == "asc":
        return asc, nullslast
    return desc, nullsfirst


def query_entities(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    *,
    filters: dict[str, Any],
    sort_field: str,
    sort_order: str,
    limit: int,
    offset: int,
) -> tuple[list[RuntimeEntity], int]:
    filtered = _apply_field_filters(
        _base_query(db, tenant_id, object_type_key),
        db,
        tenant_id,
        filters,
    )

    total = filtered.count()

    order_fn, nulls_fn = _order_clause(sort_field, sort_order)

    if sort_field in ENTITY_SORT_FIELDS:
        order_col = getattr(RuntimeEntity, sort_field)
        ordered = filtered.order_by(
            nulls_fn(order_fn(order_col)),
            order_fn(RuntimeEntity.id),
        )
    else:
        sort_value = aliased(RuntimeEntityValue)
        ordered = filtered.outerjoin(
            sort_value,
            and_(
                sort_value.entity_id == RuntimeEntity.id,
                sort_value.tenant_id == tenant_id,
                sort_value.field_key == sort_field,
            ),
        ).order_by(
            nulls_fn(order_fn(sort_value.value_json)),
            order_fn(RuntimeEntity.id),
        )

    entities = (
        ordered.options(joinedload(RuntimeEntity.values))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return entities, total
