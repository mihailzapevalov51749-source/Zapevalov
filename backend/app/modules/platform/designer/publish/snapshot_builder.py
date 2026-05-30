import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.modules.platform.designer.publish.draft_loader import TenantDraftCatalog
from app.modules.platform.designer.publish.object_view_contract import (
    normalize_settings_json_for_publish,
)


SCHEMA_VERSION = 1


def _serialize_field(field) -> dict[str, Any]:
    return {
        "id": str(field.id),
        "key": field.key,
        "name": field.name,
        "description": field.description,
        "field_type": field.field_type,
        "sort_order": field.sort_order,
        "is_required": field.is_required,
        "is_unique": field.is_unique,
        "is_system": field.is_system,
        "default_value_json": field.default_value_json,
        "settings_json": field.settings_json or {},
        "validation_json": field.validation_json or {},
        "visibility_json": field.visibility_json or {},
    }


def _serialize_view(
    view,
    *,
    field_keys: set[str] | None = None,
    ordered_field_keys: list[str] | None = None,
) -> dict[str, Any]:
    settings_json = view.settings_json or {}
    if field_keys is not None:
        settings_json = normalize_settings_json_for_publish(
            settings_json if isinstance(settings_json, dict) else {},
            view_key=str(view.key or ""),
            view_type=str(view.view_type or ""),
            field_keys=field_keys,
            ordered_field_keys=ordered_field_keys,
        )

    return {
        "id": str(view.id),
        "key": view.key,
        "name": view.name,
        "description": view.description,
        "view_type": view.view_type,
        "is_default": view.is_default,
        "is_system": view.is_system,
        "is_active": view.is_active,
        "sort_order": view.sort_order,
        "settings_json": settings_json,
        "layout_json": view.layout_json or {},
        "filters_json": view.filters_json or {},
        "visibility_json": view.visibility_json or {},
    }


def build_snapshot_payload(
    *,
    tenant_id: int,
    catalog_version: int,
    catalog: TenantDraftCatalog,
) -> dict[str, Any]:
    fields_by_object_type: dict[UUID, list] = {}
    views_by_object_type: dict[UUID, list] = {}

    for field in sorted(
        catalog.fields,
        key=lambda row: (row.sort_order, row.key),
    ):
        fields_by_object_type.setdefault(field.object_type_id, []).append(field)

    for view in sorted(
        catalog.views,
        key=lambda row: (row.sort_order, row.key),
    ):
        views_by_object_type.setdefault(view.object_type_id, []).append(view)

    object_type_keys = {row.id: row.key for row in catalog.object_types}

    object_types_payload = []
    for object_type in sorted(
        catalog.object_types,
        key=lambda row: (row.sort_order, row.key),
    ):
        object_types_payload.append(
            {
                "id": str(object_type.id),
                "key": object_type.key,
                "name": object_type.name,
                "description": object_type.description,
                "icon": object_type.icon,
                "color": object_type.color,
                "sort_order": object_type.sort_order,
                "status": object_type.status,
                "is_system": object_type.is_system,
                "is_default_entity": object_type.is_default_entity,
                "settings_json": object_type.settings_json or {},
                "governance_json": object_type.governance_json or {},
                "fields": [
                    _serialize_field(field)
                    for field in fields_by_object_type.get(object_type.id, [])
                ],
                "views": [
                    _serialize_view(
                        view,
                        field_keys={
                            field.key
                            for field in fields_by_object_type.get(object_type.id, [])
                            if getattr(field, "key", None)
                        },
                        ordered_field_keys=[
                            field.key
                            for field in fields_by_object_type.get(object_type.id, [])
                            if getattr(field, "key", None)
                        ],
                    )
                    for view in views_by_object_type.get(object_type.id, [])
                ],
            },
        )

    relations_payload = []
    for relation in sorted(
        catalog.relations,
        key=lambda row: (row.sort_order, row.key),
    ):
        source_key = object_type_keys.get(relation.source_object_type_id)
        target_key = object_type_keys.get(relation.target_object_type_id)

        if not source_key or not target_key:
            continue

        relations_payload.append(
            {
                "id": str(relation.id),
                "key": relation.key,
                "name": relation.name,
                "description": relation.description,
                "source_object_type_id": str(relation.source_object_type_id),
                "target_object_type_id": str(relation.target_object_type_id),
                "source_object_type_key": source_key,
                "target_object_type_key": target_key,
                "relation_type": relation.relation_type,
                "reverse_name": relation.reverse_name,
                "sort_order": relation.sort_order,
                "is_required": relation.is_required,
                "is_system": relation.is_system,
                "is_active": relation.is_active,
                "bidirectional": relation.bidirectional,
                "cascade_delete": relation.cascade_delete,
                "settings_json": relation.settings_json or {},
                "validation_json": relation.validation_json or {},
            },
        )

    published_at = datetime.now(timezone.utc).isoformat()

    return {
        "schema_version": SCHEMA_VERSION,
        "catalog_version": catalog_version,
        "tenant_id": tenant_id,
        "published_at": published_at,
        "object_types": object_types_payload,
        "relations": relations_payload,
    }


def canonical_json_dumps(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_payload_hash(payload: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_json_dumps(payload).encode("utf-8")).hexdigest()
