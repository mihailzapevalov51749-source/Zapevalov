import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.modules.platform.designer.publish.draft_loader import TenantDraftCatalog
from app.modules.platform.designer.publish.object_view_contract import (
    normalize_settings_json_for_publish,
    preserve_object_tab_settings,
)

logger = logging.getLogger(__name__)

_MENU_IN_TAB_DEBUG = os.environ.get("YASNOPRO_DEBUG_MENU_IN_TAB", "").lower() in {
    "1",
    "true",
    "yes",
}


SCHEMA_VERSION = 2


def _serialize_field(field) -> dict[str, Any]:
    return {
        "id": str(field.id),
        "key": field.key,
        "name": field.name,
        "description": field.description,
        "placeholder": field.placeholder,
        "field_type": field.field_type,
        "sort_order": field.sort_order,
        "is_required": field.is_required,
        "is_unique": field.is_unique,
        "quick_create": field.quick_create,
        "is_system": field.is_system,
        "default_value_json": field.default_value_json,
        "settings_json": field.settings_json or {},
        "validation_json": field.validation_json or {},
        "visibility_json": field.visibility_json or {},
    }


def _serialize_action_placement(placement) -> dict[str, Any]:
    config_json = placement.config_json
    if not isinstance(config_json, dict):
        config_json = {}

    return {
        "id": str(placement.id),
        "placement_key": placement.placement_key,
        "is_active": placement.is_active,
        "sort_order": placement.sort_order,
        "label_override": placement.label_override,
        "icon_key": placement.icon_key,
        "config_json": config_json,
    }


def _serialize_action_form_field(
    form_field,
    *,
    field_key_by_id: dict[UUID, str],
) -> dict[str, Any]:
    field_key = field_key_by_id.get(form_field.field_definition_id)
    if not field_key:
        return {}

    return {
        "id": str(form_field.id),
        "field_key": field_key,
        "label_override": form_field.label_override,
        "placeholder": form_field.placeholder,
        "help_text": form_field.help_text,
        "required": form_field.required,
        "sort_order": form_field.sort_order,
        "is_visible": form_field.is_visible,
    }


def _serialize_action_form(
    action_form,
    form_fields: list,
    *,
    field_key_by_id: dict[UUID, str],
) -> dict[str, Any] | None:
    if not action_form or not action_form.is_active:
        return None

    active_fields = sorted(
        (
            field_row
            for field_row in form_fields
            if field_row.is_visible
        ),
        key=lambda row: (row.sort_order, str(row.id)),
    )

    serialized_fields = [
        serialized
        for field_row in active_fields
        if (serialized := _serialize_action_form_field(
            field_row,
            field_key_by_id=field_key_by_id,
        ))
    ]

    if not serialized_fields:
        return None

    return {
        "id": str(action_form.id),
        "title": action_form.title,
        "description": action_form.description,
        "submit_label": action_form.submit_label,
        "cancel_label": action_form.cancel_label,
        "is_active": action_form.is_active,
        "fields": serialized_fields,
    }


def _serialize_auto_link_relation(
    action,
    *,
    relation_by_id: dict[UUID, object],
) -> dict[str, Any] | None:
    if action.action_type_key != "create_record":
        return None

    if not bool(getattr(action, "auto_link_enabled", False)):
        return None

    relation_id = getattr(action, "auto_link_relation_id", None)
    if not relation_id:
        return None

    relation = relation_by_id.get(relation_id)
    if not relation:
        return None

    return {
        "id": str(relation.id),
        "key": relation.key,
        "name": relation.name,
    }


def _serialize_target_object_type(
    action,
    *,
    object_type_by_id: dict[UUID, object],
) -> dict[str, Any] | None:
    if action.action_type_key != "create_record":
        return None

    target_id = getattr(action, "target_object_type_id", None)
    if not target_id:
        return None

    target = object_type_by_id.get(target_id)
    if not target:
        return None

    return {
        "id": str(target.id),
        "key": target.key,
        "name": target.name,
    }


def _serialize_action(
    action,
    placements: list,
    *,
    action_form=None,
    action_form_fields: list | None = None,
    field_key_by_id: dict[UUID, str] | None = None,
    object_type_by_id: dict[UUID, object] | None = None,
    relation_by_id: dict[UUID, object] | None = None,
) -> dict[str, Any]:
    active_placements = sorted(
        (placement for placement in placements if placement.is_active),
        key=lambda row: (row.sort_order, row.placement_key),
    )

    config_json = getattr(action, "config_json", None)
    if not isinstance(config_json, dict):
        config_json = {}

    version = getattr(action, "version", None)
    if not isinstance(version, int) or version < 1:
        version = 1

    payload = {
        "id": str(action.id),
        "key": action.key,
        "name": action.name,
        "description": action.description,
        "action_type_key": action.action_type_key,
        "is_active": action.is_active,
        "version": version,
        "config_json": config_json,
        "placements": [
            _serialize_action_placement(placement) for placement in active_placements
        ],
    }

    serialized_form = _serialize_action_form(
        action_form,
        action_form_fields or [],
        field_key_by_id=field_key_by_id or {},
    )
    if serialized_form:
        payload["form"] = serialized_form

    if object_type_by_id is not None:
        target_object_type = _serialize_target_object_type(
            action,
            object_type_by_id=object_type_by_id,
        )
        if target_object_type:
            payload["target_object_type"] = target_object_type

    if relation_by_id is not None and action.action_type_key == "create_record":
        payload["auto_link_enabled"] = bool(getattr(action, "auto_link_enabled", False))
        auto_link_relation = _serialize_auto_link_relation(
            action,
            relation_by_id=relation_by_id,
        )
        if auto_link_relation:
            payload["auto_link_relation"] = auto_link_relation

    return payload


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
    else:
        settings_json = preserve_object_tab_settings(
            settings_json if isinstance(settings_json, dict) else {},
        )

    if _MENU_IN_TAB_DEBUG:
        tab_settings = (
            settings_json.get("tabSettings")
            if isinstance(settings_json, dict)
            else None
        )
        menu_in_tab = (
            tab_settings.get("menuInTab")
            if isinstance(tab_settings, dict)
            else None
        )
        logger.warning(
            "MENU_IN_TAB_PUBLISH_CONTRACT view_key=%s menuInTab=%s tabSettings=%s",
            view.key,
            menu_in_tab,
            tab_settings,
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
    actions_by_object_type: dict[UUID, list] = {}
    placements_by_action: dict[UUID, list] = {}
    forms_by_action: dict[UUID, object] = {}
    form_fields_by_form: dict[UUID, list] = {}
    field_key_by_id: dict[UUID, str] = {}

    for field in sorted(
        catalog.fields,
        key=lambda row: (row.sort_order, row.key),
    ):
        fields_by_object_type.setdefault(field.object_type_id, []).append(field)
        field_key_by_id[field.id] = field.key

    for view in sorted(
        catalog.views,
        key=lambda row: (row.sort_order, row.key),
    ):
        views_by_object_type.setdefault(view.object_type_id, []).append(view)

    for action in sorted(
        catalog.actions,
        key=lambda row: (row.name, row.key),
    ):
        if not action.is_active:
            continue
        actions_by_object_type.setdefault(action.object_type_id, []).append(action)

    for placement in catalog.placements:
        if not placement.is_active:
            continue
        placements_by_action.setdefault(placement.action_definition_id, []).append(
            placement,
        )

    for action_form in catalog.action_forms:
        forms_by_action[action_form.action_definition_id] = action_form

    for form_field in catalog.action_form_fields:
        form_fields_by_form.setdefault(form_field.action_form_id, []).append(form_field)

    object_type_keys = {row.id: row.key for row in catalog.object_types}
    object_type_by_id = {row.id: row for row in catalog.object_types}
    relation_by_id = {row.id: row for row in catalog.relations}

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
                "icon_type": object_type.icon_type,
                "icon_file_url": object_type.icon_file_url,
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
                "actions": [
                    _serialize_action(
                        action,
                        placements_by_action.get(action.id, []),
                        action_form=forms_by_action.get(action.id),
                        action_form_fields=form_fields_by_form.get(
                            forms_by_action[action.id].id,
                            [],
                        )
                        if action.id in forms_by_action
                        else [],
                        field_key_by_id=field_key_by_id,
                        object_type_by_id=object_type_by_id,
                        relation_by_id=relation_by_id,
                    )
                    for action in actions_by_object_type.get(object_type.id, [])
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
