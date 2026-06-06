from typing import Any
from uuid import UUID

from sqlalchemy import Numeric, and_, cast, not_
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, aliased, joinedload

from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance
from app.modules.platform.runtime.entities.system_fields import (
    SYSTEM_FIELD_KEYS,
    is_runtime_system_field_key,
)
from app.modules.platform.runtime.query.filter_operators import (
    FILTER_OP_AFTER,
    FILTER_OP_BEFORE,
    FILTER_OP_CONTAINS,
    FILTER_OP_ENDS_WITH,
    FILTER_OP_EQ,
    FILTER_OP_GT,
    FILTER_OP_GTE,
    FILTER_OP_IN,
    FILTER_OP_IS_EMPTY,
    FILTER_OP_IS_NOT_EMPTY,
    FILTER_OP_LT,
    FILTER_OP_LTE,
    FILTER_OP_NEQ,
    FILTER_OP_NOT_CONTAINS,
    FILTER_OP_NOT_IN,
    FILTER_OP_STARTS_WITH,
    ParsedFilterCondition,
    normalize_catalog_field_type,
)
from app.modules.platform.runtime.query.validators import ENTITY_SORT_FIELDS
from app.modules.platform.shared.enums import FieldType

SYSTEM_FIELD_FILTER_COLUMNS = {
    SYSTEM_FIELD_KEYS["id"]: RuntimeEntity.id,
    SYSTEM_FIELD_KEYS["created_by"]: RuntimeEntity.created_by,
    SYSTEM_FIELD_KEYS["created_at"]: RuntimeEntity.created_at,
    SYSTEM_FIELD_KEYS["updated_by"]: RuntimeEntity.updated_by,
    SYSTEM_FIELD_KEYS["updated_at"]: RuntimeEntity.updated_at,
    SYSTEM_FIELD_KEYS["record_version"]: RuntimeEntity.record_version,
    SYSTEM_FIELD_KEYS["record_number"]: RuntimeEntity.record_number,
}


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


def _jsonb_text(column):
    """Scalar JSONB as plain text (#>> '{}'); works on ORM InstrumentedAttribute."""
    return column.op("#>>")("{}")


def _has_meaningful_custom_value(column):
    text_value = _jsonb_text(column)
    return and_(column.isnot(None), text_value.isnot(None), text_value != "")


def _custom_field_nonempty_subquery(db: Session, tenant_id: int, field_key: str):
    return (
        db.query(RuntimeEntityValue.entity_id)
        .filter(
            RuntimeEntityValue.tenant_id == tenant_id,
            RuntimeEntityValue.field_key == field_key,
            _has_meaningful_custom_value(RuntimeEntityValue.value_json),
        )
        .subquery()
    )


def _apply_custom_field_predicate(
    value_column,
    field_type: str,
    op: str,
    value: Any,
):
    if op == FILTER_OP_EQ:
        return value_column == cast(value, JSONB)

    if op == FILTER_OP_NEQ:
        return value_column != cast(value, JSONB)

    if op in {FILTER_OP_IN, FILTER_OP_NOT_IN}:
        json_values = [cast(item, JSONB) for item in (value or [])]
        predicate = value_column.in_(json_values)
        return not_(predicate) if op == FILTER_OP_NOT_IN else predicate

    if field_type == FieldType.NUMBER.value and op in {
        FILTER_OP_GT,
        FILTER_OP_GTE,
        FILTER_OP_LT,
        FILTER_OP_LTE,
    }:
        json_bound = cast(value, JSONB)
        if op == FILTER_OP_GT:
            return value_column > json_bound
        if op == FILTER_OP_GTE:
            return value_column >= json_bound
        if op == FILTER_OP_LT:
            return value_column < json_bound
        return value_column <= json_bound

    if field_type in {FieldType.DATE.value, FieldType.DATETIME.value}:
        json_bound = cast(value, JSONB)
        if op in {FILTER_OP_LT, FILTER_OP_BEFORE}:
            return value_column < json_bound
        if op in {FILTER_OP_GT, FILTER_OP_AFTER}:
            return value_column > json_bound
        if op == FILTER_OP_EQ:
            return value_column == json_bound
        if op == FILTER_OP_NEQ:
            return value_column != json_bound

    if op == FILTER_OP_CONTAINS:
        text_value = _jsonb_text(value_column)
        return text_value.ilike(f"%{value}%")

    if op == FILTER_OP_NOT_CONTAINS:
        text_value = _jsonb_text(value_column)
        return not_(text_value.ilike(f"%{value}%"))

    if op == FILTER_OP_STARTS_WITH:
        text_value = _jsonb_text(value_column)
        return text_value.ilike(f"{value}%")

    if op == FILTER_OP_ENDS_WITH:
        text_value = _jsonb_text(value_column)
        return text_value.ilike(f"%{value}")

    raise ValueError(f"Неподдерживаемый оператор фильтра: {op}")


def _apply_system_field_predicate(column, field_type: str, op: str, value: Any):
    if op == FILTER_OP_IS_EMPTY:
        return column.is_(None)

    if op == FILTER_OP_IS_NOT_EMPTY:
        return column.isnot(None)

    if op == FILTER_OP_EQ:
        return column == value

    if op == FILTER_OP_NEQ:
        return column != value

    if op in {FILTER_OP_IN, FILTER_OP_NOT_IN}:
        predicate = column.in_(value or [])
        return not_(predicate) if op == FILTER_OP_NOT_IN else predicate

    if field_type in {FieldType.DATE.value, FieldType.DATETIME.value}:
        compare_value = value
        if op in {FILTER_OP_LT, FILTER_OP_BEFORE}:
            return column < compare_value
        if op in {FILTER_OP_GT, FILTER_OP_AFTER}:
            return column > compare_value
        return column == compare_value

    if field_type == FieldType.NUMBER.value and op in {
        FILTER_OP_GT,
        FILTER_OP_GTE,
        FILTER_OP_LT,
        FILTER_OP_LTE,
    }:
        if op == FILTER_OP_GT:
            return column > value
        if op == FILTER_OP_GTE:
            return column >= value
        if op == FILTER_OP_LT:
            return column < value
        return column <= value

    if op == FILTER_OP_CONTAINS:
        return cast(column, JSONB).op("#>>")("{}").ilike(f"%{value}%")

    if op == FILTER_OP_NOT_CONTAINS:
        return not_(cast(column, JSONB).op("#>>")("{}").ilike(f"%{value}%"))

    if op == FILTER_OP_STARTS_WITH:
        return cast(column, JSONB).op("#>>")("{}").ilike(f"{value}%")

    if op == FILTER_OP_ENDS_WITH:
        return cast(column, JSONB).op("#>>")("{}").ilike(f"%{value}")

    raise ValueError(f"Неподдерживаемый оператор фильтра: {op}")


def _parse_relation_field_settings(field_meta: dict[str, Any]) -> tuple[str, str]:
    settings = field_meta.get("settings_json") or {}
    if not isinstance(settings, dict):
        settings = {}

    relation_key = str(settings.get("relation_key") or "").strip()
    role = str(settings.get("role") or "").strip()

    if not relation_key or role not in {"source", "target"}:
        field_key = field_meta.get("key", "?")
        raise ValueError(
            f"Поле '{field_key}': relation field settings_json некорректны",
        )

    return relation_key, role


def _relation_linked_entity_ids_subquery(
    db: Session,
    tenant_id: int,
    *,
    relation_key: str,
    role: str,
    peer_entity_id: UUID | None = None,
):
    relation_query = db.query(RuntimeRelationInstance).filter(
        RuntimeRelationInstance.tenant_id == tenant_id,
        RuntimeRelationInstance.relation_key == relation_key,
        RuntimeRelationInstance.deleted_at.is_(None),
    )

    if role == "source":
        if peer_entity_id is not None:
            relation_query = relation_query.filter(
                RuntimeRelationInstance.target_entity_id == peer_entity_id,
            )
        return relation_query.with_entities(
            RuntimeRelationInstance.source_entity_id,
        ).distinct()

    if peer_entity_id is not None:
        relation_query = relation_query.filter(
            RuntimeRelationInstance.source_entity_id == peer_entity_id,
        )
    return relation_query.with_entities(
        RuntimeRelationInstance.target_entity_id,
    ).distinct()


def _apply_relation_field_filter(
    query,
    db: Session,
    tenant_id: int,
    condition: ParsedFilterCondition,
    field_meta: dict[str, Any],
):
    relation_key, role = _parse_relation_field_settings(field_meta)

    if condition.op in {FILTER_OP_IS_EMPTY, FILTER_OP_IS_NOT_EMPTY}:
        linked_entities = _relation_linked_entity_ids_subquery(
            db,
            tenant_id,
            relation_key=relation_key,
            role=role,
        ).subquery()

        if condition.op == FILTER_OP_IS_EMPTY:
            return query.filter(~RuntimeEntity.id.in_(linked_entities))
        return query.filter(RuntimeEntity.id.in_(linked_entities))

    peer_entity_id = UUID(str(condition.value))
    linked_entities = _relation_linked_entity_ids_subquery(
        db,
        tenant_id,
        relation_key=relation_key,
        role=role,
        peer_entity_id=peer_entity_id,
    ).subquery()

    if condition.op == FILTER_OP_EQ:
        return query.filter(RuntimeEntity.id.in_(linked_entities))

    if condition.op == FILTER_OP_NEQ:
        return query.filter(~RuntimeEntity.id.in_(linked_entities))

    raise ValueError(f"Неподдерживаемый оператор фильтра: {condition.op}")


def _apply_single_filter_condition(
    query,
    db: Session,
    tenant_id: int,
    condition: ParsedFilterCondition,
    field_map: dict[str, dict[str, Any]],
):
    field_meta = field_map[condition.field]
    field_type = normalize_catalog_field_type(field_meta.get("field_type"))
    entity_column = SYSTEM_FIELD_FILTER_COLUMNS.get(condition.field)

    if field_type == FieldType.RELATION.value:
        return _apply_relation_field_filter(
            query,
            db,
            tenant_id,
            condition,
            field_meta,
        )

    if entity_column is not None:
        return query.filter(
            _apply_system_field_predicate(
                entity_column,
                field_type,
                condition.op,
                condition.value,
            ),
        )

    if condition.op in {FILTER_OP_IS_EMPTY, FILTER_OP_IS_NOT_EMPTY}:
        nonempty = _custom_field_nonempty_subquery(db, tenant_id, condition.field)
        if condition.op == FILTER_OP_IS_EMPTY:
            return query.filter(~RuntimeEntity.id.in_(nonempty))
        return query.filter(RuntimeEntity.id.in_(nonempty))

    matching_entities = (
        db.query(RuntimeEntityValue.entity_id)
        .filter(
            RuntimeEntityValue.tenant_id == tenant_id,
            RuntimeEntityValue.field_key == condition.field,
            _apply_custom_field_predicate(
                RuntimeEntityValue.value_json,
                field_type,
                condition.op,
                condition.value,
            ),
        )
        .subquery()
    )

    return query.filter(RuntimeEntity.id.in_(matching_entities))


def _apply_field_filters(
    query,
    db: Session,
    tenant_id: int,
    filter_conditions: list[ParsedFilterCondition],
    field_map: dict[str, dict[str, Any]],
):
    for condition in filter_conditions:
        query = _apply_single_filter_condition(
            query,
            db,
            tenant_id,
            condition,
            field_map,
        )
    return query


def _order_clause(sort_field: str, sort_order: str):
    from sqlalchemy import asc, desc, nullsfirst, nullslast

    if sort_order == "asc":
        return asc, nullslast
    return desc, nullsfirst


def _resolve_entity_sort_field(sort_field: str) -> str:
    entity_sort_field = sort_field
    if is_runtime_system_field_key(sort_field):
        from app.modules.platform.runtime.entities.system_fields import (
            runtime_sort_field_for_column_key,
        )

        entity_sort_field = runtime_sort_field_for_column_key(sort_field)
    return entity_sort_field


def _apply_sort_specs(
    query,
    tenant_id: int,
    sort_specs: list[tuple[str, str]],
):
    from sqlalchemy import asc, desc

    order_parts = []
    custom_join_index = 0

    for sort_field, sort_order in sort_specs:
        order_fn, nulls_fn = _order_clause(sort_field, sort_order)
        entity_sort_field = _resolve_entity_sort_field(sort_field)

        if entity_sort_field in ENTITY_SORT_FIELDS:
            order_col = getattr(RuntimeEntity, entity_sort_field)
            order_parts.append(nulls_fn(order_fn(order_col)))
        else:
            sort_value = aliased(RuntimeEntityValue, name=f"ov_sort_{custom_join_index}")
            custom_join_index += 1
            query = query.outerjoin(
                sort_value,
                and_(
                    sort_value.entity_id == RuntimeEntity.id,
                    sort_value.tenant_id == tenant_id,
                    sort_value.field_key == sort_field,
                ),
            )
            order_parts.append(nulls_fn(order_fn(sort_value.value_json)))

    last_order = sort_specs[-1][1] if sort_specs else "asc"
    tie_order_fn = asc if last_order == "asc" else desc
    order_parts.append(tie_order_fn(RuntimeEntity.id))

    return query.order_by(*order_parts)


def query_entities(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    *,
    filter_conditions: list[ParsedFilterCondition] | None = None,
    filters: dict[str, Any] | None = None,
    field_map: dict[str, dict[str, Any]] | None = None,
    sort_specs: list[tuple[str, str]] | None = None,
    limit: int,
    offset: int,
) -> tuple[list[RuntimeEntity], int]:
    conditions = list(filter_conditions or [])

    if not conditions and filters:
        conditions = [
            ParsedFilterCondition(field=field_key, op=FILTER_OP_EQ, value=value)
            for field_key, value in filters.items()
        ]

    filtered = _apply_field_filters(
        _base_query(db, tenant_id, object_type_key),
        db,
        tenant_id,
        conditions,
        field_map or {},
    )

    total = filtered.count()

    specs = list(sort_specs or [])
    if not specs:
        specs = [("created_at", "desc")]

    ordered = _apply_sort_specs(filtered, tenant_id, specs)

    entities = (
        ordered.options(joinedload(RuntimeEntity.values))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return entities, total
