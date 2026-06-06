from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.entities import serializer
from app.modules.platform.runtime.query import repository
from app.modules.platform.runtime.query.schemas import (
    DEFAULT_QUERY_LIMIT,
    EntityQueryResponse,
    PaginationMeta,
    PublishedViewMeta,
    ViewProjectionResponse,
)
from app.modules.platform.runtime.query.validators import (
    coerce_filter_conditions,
    fields_by_key,
    parse_filter_conditions,
    parse_sort_specs,
    validate_filter_conditions,
    validate_limit,
    validate_offset,
    validate_order,
    validate_sort,
    validate_sort_specs,
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
    filter_conditions_raw = parse_filter_conditions(query_params)
    sort_specs = parse_sort_specs(query_params)

    try:
        validate_limit(limit)
        validate_offset(offset)
        validate_order(order)
        validate_sort(sort, field_map)
        if sort_specs is None:
            sort_specs = [(sort, order)]
        else:
            validate_sort_specs(sort_specs, field_map)
        validate_filter_conditions(filter_conditions_raw, field_map)
        filter_conditions = (
            coerce_filter_conditions(filter_conditions_raw, field_map)
            if filter_conditions_raw
            else []
        )
        for condition in filter_conditions:
            field_type = field_map[condition.field].get("field_type")
            if field_type in {FieldType.UUID, FieldType.RELATION} and condition.value not in (
                None,
                "",
            ):
                validate_uuid_string(str(condition.value), condition.field)
    except ValueError as exc:
        raise _validation_http_error(exc) from exc

    entities, total = repository.query_entities(
        db,
        tenant_id,
        object_type_key,
        filter_conditions=filter_conditions,
        field_map=field_map,
        sort_specs=sort_specs,
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

    view_meta = metadata.view_meta if isinstance(metadata.view_meta, dict) else {}

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
        object_view=metadata.object_view,
        filters_json=metadata.filters_json or {},
        view=PublishedViewMeta(
            key=str(view_meta.get("key") or metadata.view_key),
            name=view_meta.get("name"),
            view_type=view_meta.get("view_type"),
            is_default=bool(view_meta.get("is_default")),
            is_system=bool(view_meta.get("is_system")),
            settings_json=view_meta.get("settings_json") or {},
            filters_json=view_meta.get("filters_json") or {},
            layout_json=view_meta.get("layout_json") or {},
        ),
    )
