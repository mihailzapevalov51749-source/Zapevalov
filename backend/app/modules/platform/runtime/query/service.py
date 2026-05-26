from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.entities import serializer
from app.modules.platform.runtime.query import repository
from app.modules.platform.runtime.query.schemas import (
    DEFAULT_QUERY_LIMIT,
    EntityQueryResponse,
    ViewProjectionResponse,
    PaginationMeta,
)
from app.modules.platform.runtime.query.validators import (
    coerce_filters,
    fields_by_key,
    parse_filter_params,
    validate_filter_fields,
    validate_limit,
    validate_offset,
    validate_order,
    validate_sort,
    validate_uuid_string,
)
from app.modules.platform.shared.enums import FieldType
from app.modules.platform.shared.exceptions import CatalogNotFound


def _validation_http_error(exc: ValueError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=str(exc),
    )


def _catalog_http_error(exc: CatalogNotFound) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc) or "Published catalog не найден",
    )


def query_entities(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    *,
    query_params: dict[str, str],
    limit: int = DEFAULT_QUERY_LIMIT,
    offset: int = 0,
    sort: str = "created_at",
    order: str = "desc",
) -> EntityQueryResponse:
    try:
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            tenant_id,
            object_type_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    field_map = fields_by_key(metadata.fields)
    filters_raw = parse_filter_params(query_params)

    try:
        validate_limit(limit)
        validate_offset(offset)
        validate_order(order)
        validate_sort(sort, field_map)
        validate_filter_fields(filters_raw, field_map)
        filters = coerce_filters(filters_raw, field_map) if filters_raw else {}
        for field_key, value in filters.items():
            if field_map[field_key].get("field_type") == FieldType.UUID:
                validate_uuid_string(str(value), field_key)
    except ValueError as exc:
        raise _validation_http_error(exc) from exc

    entities, total = repository.query_entities(
        db,
        tenant_id,
        object_type_key,
        filters=filters,
        sort_field=sort,
        sort_order=order,
        limit=limit,
        offset=offset,
    )

    items = [
        serializer.serialize_entity(entity, list(entity.values))
        for entity in entities
    ]

    has_more = offset + len(items) < total

    return EntityQueryResponse(
        tenant_id=tenant_id,
        object_type_key=object_type_key,
        catalog_version=metadata.catalog_version,
        schema_version=metadata.schema_version,
        items=items,
        pagination=PaginationMeta(
            limit=limit,
            offset=offset,
            total=total,
            has_more=has_more,
        ),
    )


def get_view_projection(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    *,
    view_key: str | None,
) -> ViewProjectionResponse:
    try:
        metadata = catalog_service.get_published_view_projection_metadata(
            db,
            tenant_id,
            object_type_key,
            view_key=view_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    return ViewProjectionResponse(
        tenant_id=tenant_id,
        object_type_key=object_type_key,
        view_key=metadata.view_key,
        projection={
            "visible_fields": metadata.visible_fields,
            "field_order": metadata.field_order,
            "title_field": metadata.title_field,
            "default_sort": {
                "field": metadata.default_sort_field,
                "order": metadata.default_sort_order,
            },
        },
    )
