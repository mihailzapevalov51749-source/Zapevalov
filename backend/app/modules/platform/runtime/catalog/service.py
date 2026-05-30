from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import repository
from app.modules.platform.runtime.catalog.schemas import (
    RuntimeCatalogPayload,
    RuntimeCatalogVersionInfo,
)
from app.modules.platform.shared.exceptions import CatalogNotFound


def get_latest_catalog(db: Session, tenant_id: int) -> RuntimeCatalogPayload:
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published catalog не найден для tenant",
        )

    payload = snapshot.payload or {}

    return RuntimeCatalogPayload(
        schema_version=payload.get("schema_version", snapshot.schema_version),
        catalog_version=payload.get("catalog_version", snapshot.catalog_version),
        tenant_id=payload.get("tenant_id", tenant_id),
        published_at=payload.get("published_at", snapshot.published_at.isoformat()),
        object_types=payload.get("object_types", []),
        relations=payload.get("relations", []),
    )


def get_catalog_version_info(
    db: Session,
    tenant_id: int,
) -> RuntimeCatalogVersionInfo:
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published catalog не найден для tenant",
        )

    return RuntimeCatalogVersionInfo(
        tenant_id=tenant_id,
        catalog_version=snapshot.catalog_version,
        schema_version=snapshot.schema_version,
        published_at=snapshot.published_at,
        payload_hash=snapshot.payload_hash,
    )


@dataclass(frozen=True)
class PublishedObjectTypeMetadata:
    tenant_id: int
    catalog_version: int
    schema_version: int
    object_type_id: UUID
    object_type_key: str
    fields: list[dict[str, Any]]


def get_published_object_type_metadata(
    db: Session,
    tenant_id: int,
    object_type_key: str,
) -> PublishedObjectTypeMetadata:
    """Resolve object type + fields from latest published snapshot only."""
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise CatalogNotFound(f"Published catalog не найден для tenant {tenant_id}")

    payload = snapshot.payload or {}
    catalog_version = payload.get("catalog_version", snapshot.catalog_version)

    for object_type in payload.get("object_types", []):
        if object_type.get("key") != object_type_key:
            continue

        raw_id = object_type.get("id")
        if not raw_id:
            break

        return PublishedObjectTypeMetadata(
            tenant_id=tenant_id,
            catalog_version=catalog_version,
            schema_version=payload.get("schema_version", snapshot.schema_version),
            object_type_id=UUID(str(raw_id)),
            object_type_key=object_type_key,
            fields=list(object_type.get("fields") or []),
        )

    raise CatalogNotFound(
        f"ObjectType '{object_type_key}' не найден в published catalog "
        f"для tenant {tenant_id}",
    )


@dataclass(frozen=True)
class PublishedRelationMetadata:
    tenant_id: int
    catalog_version: int
    relation_id: UUID
    relation_key: str
    relation_type: str
    source_object_type_key: str
    target_object_type_key: str
    is_active: bool


def get_published_relation_metadata(
    db: Session,
    tenant_id: int,
    relation_key: str,
) -> PublishedRelationMetadata:
    """Resolve relation definition from latest published snapshot only."""
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise CatalogNotFound(f"Published catalog не найден для tenant {tenant_id}")

    payload = snapshot.payload or {}
    catalog_version = payload.get("catalog_version", snapshot.catalog_version)

    for relation in payload.get("relations", []):
        if relation.get("key") != relation_key:
            continue

        raw_id = relation.get("id")
        if not raw_id:
            break

        return PublishedRelationMetadata(
            tenant_id=tenant_id,
            catalog_version=catalog_version,
            relation_id=UUID(str(raw_id)),
            relation_key=relation_key,
            relation_type=str(relation.get("relation_type", "")),
            source_object_type_key=str(relation.get("source_object_type_key", "")),
            target_object_type_key=str(relation.get("target_object_type_key", "")),
            is_active=bool(relation.get("is_active", True)),
        )

    raise CatalogNotFound(
        f"Relation '{relation_key}' не найдена в published catalog "
        f"для tenant {tenant_id}",
    )


@dataclass(frozen=True)
class PublishedViewProjectionMetadata:
    tenant_id: int
    catalog_version: int
    schema_version: int
    object_type_key: str
    view_key: str
    visible_fields: list[str]
    field_order: list[str]
    title_field: str | None
    default_sort_field: str | None
    default_sort_order: str
    object_view: dict[str, Any] | None
    filters_json: dict[str, Any]
    layout_json: dict[str, Any]
    view_meta: dict[str, Any]


def get_published_view_projection_metadata(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    view_key: str | None = None,
) -> PublishedViewProjectionMetadata:
    """
    Resolves view projection metadata from the latest published catalog only.

    This is a lightweight projection contract (no runtime truth, no entities).
    """
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise CatalogNotFound(f"Published catalog не найден для tenant {tenant_id}")

    payload = snapshot.payload or {}
    catalog_version = payload.get("catalog_version", snapshot.catalog_version)
    schema_version = payload.get("schema_version", snapshot.schema_version)

    object_type_payload = None
    for ot in payload.get("object_types", []):
        if ot.get("key") == object_type_key:
            object_type_payload = ot
            break

    if not object_type_payload:
        raise CatalogNotFound(
            f"ObjectType '{object_type_key}' не найден в published catalog "
            f"для tenant {tenant_id}",
        )

    field_keys = [
        f.get("key")
        for f in (object_type_payload.get("fields") or [])
        if isinstance(f, dict) and f.get("key")
    ]

    views_payload = object_type_payload.get("views") or []
    if not isinstance(views_payload, list):
        views_payload = []

    selected_view = None
    if view_key:
        for v in views_payload:
            if v.get("key") == view_key and v.get("is_active", True):
                selected_view = v
                break

    if not selected_view:
        default_candidates = [
            v for v in views_payload if v.get("is_active", True) and v.get("is_default")
        ]
        if default_candidates:
            selected_view = default_candidates[0]
        else:
            # Fallback: first active view, then first view.
            for v in views_payload:
                if v.get("is_active", True):
                    selected_view = v
                    break
            if not selected_view and views_payload:
                selected_view = views_payload[0]

    if not selected_view:
        raise CatalogNotFound(
            f"View metadata не найдена для ObjectType '{object_type_key}' "
            f"в published catalog tenant {tenant_id}",
        )

    view_settings = selected_view.get("settings_json") or {}
    if not isinstance(view_settings, dict):
        view_settings = {}

    filters_json = selected_view.get("filters_json") or {}
    if not isinstance(filters_json, dict):
        filters_json = {}

    layout_json = selected_view.get("layout_json") or {}
    if not isinstance(layout_json, dict):
        layout_json = {}

    object_view_raw = view_settings.get("objectView")
    object_view: dict[str, Any] | None
    if isinstance(object_view_raw, dict):
        object_view = object_view_raw
    else:
        object_view = None

    projection = view_settings.get("projection")
    if not isinstance(projection, dict) or (
        not (projection.get("visible_fields") or [])
        and not (projection.get("field_order") or [])
        and object_view is not None
    ):
        from app.modules.platform.designer.publish.object_view_contract import (
            projection_from_object_view,
        )

        if object_view is not None:
            projection = projection_from_object_view(object_view)
        elif not isinstance(projection, dict):
            projection = {}

    if not isinstance(projection, dict):
        projection = {}

    visible_fields_raw = projection.get("visible_fields")
    field_order_raw = projection.get("field_order")
    title_field_raw = projection.get("title_field")
    default_sort_raw = projection.get("default_sort") or {}

    visible_fields: list[str]
    if isinstance(visible_fields_raw, list) and all(
        isinstance(x, str) for x in visible_fields_raw
    ):
        visible_fields = visible_fields_raw
    else:
        visible_fields = list(field_keys)

    field_order: list[str]
    if isinstance(field_order_raw, list) and all(
        isinstance(x, str) for x in field_order_raw
    ):
        field_order = field_order_raw
    else:
        field_order = list(visible_fields)

    title_field: str | None
    if isinstance(title_field_raw, str):
        title_field = title_field_raw
    else:
        title_field = visible_fields[0] if visible_fields else None

    default_sort_order = "desc"
    default_sort_field: str | None = None
    if isinstance(default_sort_raw, dict):
        raw_order = default_sort_raw.get("order")
        if raw_order in {"asc", "desc"}:
            default_sort_order = raw_order

        raw_field = default_sort_raw.get("field")
        if isinstance(raw_field, str):
            default_sort_field = raw_field

    view_meta = {
        "id": selected_view.get("id"),
        "key": selected_view.get("key"),
        "name": selected_view.get("name"),
        "view_type": selected_view.get("view_type"),
        "is_default": bool(selected_view.get("is_default")),
        "is_system": bool(selected_view.get("is_system")),
        "settings_json": view_settings,
        "filters_json": filters_json,
        "layout_json": layout_json,
    }

    return PublishedViewProjectionMetadata(
        tenant_id=tenant_id,
        catalog_version=catalog_version,
        schema_version=schema_version,
        object_type_key=object_type_key,
        view_key=str(selected_view.get("key") or ""),
        visible_fields=visible_fields,
        field_order=field_order,
        title_field=title_field,
        default_sort_field=default_sort_field,
        default_sort_order=default_sort_order,
        object_view=object_view,
        filters_json=filters_json,
        layout_json=layout_json,
        view_meta=view_meta,
    )
