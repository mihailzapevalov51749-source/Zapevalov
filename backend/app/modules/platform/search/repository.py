from uuid import UUID

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.runtime.search.ranking import compute_text_match_rank


def _contains_pattern(query: str) -> str:
    return f"%{query.strip()}%"


def _text_match_filter(column, query: str):
    pattern = _contains_pattern(query)
    return func.lower(column).like(func.lower(pattern))


def _best_text_rank(*values: object, query: str) -> int:
    ranks = [compute_text_match_rank(value, query) for value in values if value is not None]
    valid = [rank for rank in ranks if rank < 999]
    return min(valid) if valid else 999


def search_designer_object_types(
    db: Session,
    *,
    tenant_id: int,
    query: str,
    limit: int,
    object_type_id: UUID | None = None,
) -> list[tuple[DesignerObjectType, int]]:
    filters = [
        DesignerObjectType.tenant_id == tenant_id,
        DesignerObjectType.deleted_at.is_(None),
        or_(
            _text_match_filter(DesignerObjectType.name, query),
            _text_match_filter(DesignerObjectType.key, query),
        ),
    ]

    if object_type_id is not None:
        filters.append(DesignerObjectType.id == object_type_id)

    rows = (
        db.query(DesignerObjectType)
        .filter(and_(*filters))
        .order_by(DesignerObjectType.sort_order.asc(), DesignerObjectType.name.asc())
        .limit(max(limit * 3, limit))
        .all()
    )

    ranked = [
        (row, _best_text_rank(row.name, row.key, query=query))
        for row in rows
    ]
    ranked = [item for item in ranked if item[1] < 999]
    ranked.sort(key=lambda item: (item[1], item[0].name.casefold(), str(item[0].id)))
    return ranked[:limit]


def search_designer_fields(
    db: Session,
    *,
    tenant_id: int,
    query: str,
    limit: int,
    object_type_id: UUID | None = None,
) -> list[tuple[DesignerFieldDefinition, DesignerObjectType | None, int]]:
    filters = [
        DesignerFieldDefinition.tenant_id == tenant_id,
        DesignerFieldDefinition.deleted_at.is_(None),
        or_(
            _text_match_filter(DesignerFieldDefinition.name, query),
            _text_match_filter(DesignerFieldDefinition.key, query),
        ),
    ]

    if object_type_id is not None:
        filters.append(DesignerFieldDefinition.object_type_id == object_type_id)

    rows = (
        db.query(DesignerFieldDefinition, DesignerObjectType)
        .outerjoin(
            DesignerObjectType,
            and_(
                DesignerObjectType.id == DesignerFieldDefinition.object_type_id,
                DesignerObjectType.deleted_at.is_(None),
            ),
        )
        .filter(and_(*filters))
        .order_by(DesignerFieldDefinition.sort_order.asc(), DesignerFieldDefinition.name.asc())
        .limit(max(limit * 3, limit))
        .all()
    )

    ranked = [
        (
            field,
            object_type,
            _best_text_rank(field.name, field.key, query=query),
        )
        for field, object_type in rows
    ]
    ranked = [item for item in ranked if item[2] < 999]
    ranked.sort(key=lambda item: (item[2], item[0].name.casefold(), str(item[0].id)))
    return ranked[:limit]


def search_designer_views(
    db: Session,
    *,
    tenant_id: int,
    query: str,
    limit: int,
    object_type_id: UUID | None = None,
) -> list[tuple[DesignerViewDefinition, DesignerObjectType | None, int]]:
    filters = [
        DesignerViewDefinition.tenant_id == tenant_id,
        DesignerViewDefinition.deleted_at.is_(None),
        or_(
            _text_match_filter(DesignerViewDefinition.name, query),
            _text_match_filter(DesignerViewDefinition.key, query),
        ),
    ]

    if object_type_id is not None:
        filters.append(DesignerViewDefinition.object_type_id == object_type_id)

    rows = (
        db.query(DesignerViewDefinition, DesignerObjectType)
        .outerjoin(
            DesignerObjectType,
            and_(
                DesignerObjectType.id == DesignerViewDefinition.object_type_id,
                DesignerObjectType.deleted_at.is_(None),
            ),
        )
        .filter(and_(*filters))
        .order_by(DesignerViewDefinition.sort_order.asc(), DesignerViewDefinition.name.asc())
        .limit(max(limit * 3, limit))
        .all()
    )

    ranked = [
        (
            view,
            object_type,
            _best_text_rank(view.name, view.key, query=query),
        )
        for view, object_type in rows
    ]
    ranked = [item for item in ranked if item[2] < 999]
    ranked.sort(key=lambda item: (item[2], item[0].name.casefold(), str(item[0].id)))
    return ranked[:limit]


def search_designer_relations(
    db: Session,
    *,
    tenant_id: int,
    query: str,
    limit: int,
    object_type_id: UUID | None = None,
) -> list[tuple[DesignerRelationDefinition, int]]:
    filters = [
        DesignerRelationDefinition.tenant_id == tenant_id,
        DesignerRelationDefinition.deleted_at.is_(None),
        or_(
            _text_match_filter(DesignerRelationDefinition.name, query),
            _text_match_filter(DesignerRelationDefinition.key, query),
        ),
    ]

    if object_type_id is not None:
        filters.append(
            or_(
                DesignerRelationDefinition.source_object_type_id == object_type_id,
                DesignerRelationDefinition.target_object_type_id == object_type_id,
            )
        )

    rows = (
        db.query(DesignerRelationDefinition)
        .filter(and_(*filters))
        .order_by(DesignerRelationDefinition.sort_order.asc(), DesignerRelationDefinition.name.asc())
        .limit(max(limit * 3, limit))
        .all()
    )

    ranked = [
        (row, _best_text_rank(row.name, row.key, query=query))
        for row in rows
    ]
    ranked = [item for item in ranked if item[1] < 999]
    ranked.sort(key=lambda item: (item[1], item[0].name.casefold(), str(item[0].id)))
    return ranked[:limit]
