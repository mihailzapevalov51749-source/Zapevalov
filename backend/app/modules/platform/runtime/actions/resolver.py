from __future__ import annotations

from typing import Any
from uuid import UUID

from app.modules.platform.runtime.actions.schemas import (
    PublishedRuntimeAction,
    PublishedRuntimeActionForm,
    PublishedRuntimeActionFormField,
)


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _resolve_action_form(action: dict[str, Any]) -> PublishedRuntimeActionForm | None:
    raw_form = action.get("form")
    if not isinstance(raw_form, dict):
        return None

    if raw_form.get("is_active") is False:
        return None

    title = str(raw_form.get("title") or "").strip()
    if not title:
        return None

    raw_fields = raw_form.get("fields")
    if not isinstance(raw_fields, list):
        return None

    fields: list[PublishedRuntimeActionFormField] = []
    for raw_field in raw_fields:
        if not isinstance(raw_field, dict):
            continue

        if raw_field.get("is_visible") is False:
            continue

        field_key = str(raw_field.get("field_key") or "").strip()
        if not field_key:
            continue

        sort_order = raw_field.get("sort_order", 100)
        if not isinstance(sort_order, int):
            sort_order = 100

        fields.append(
            PublishedRuntimeActionFormField(
                field_key=field_key,
                label_override=raw_field.get("label_override"),
                placeholder=raw_field.get("placeholder"),
                help_text=raw_field.get("help_text"),
                required=bool(raw_field.get("required")),
                sort_order=sort_order,
                is_visible=True,
            ),
        )

    if not fields:
        return None

    fields.sort(key=lambda item: (item.sort_order, item.field_key.casefold()))

    return PublishedRuntimeActionForm(
        title=title,
        description=raw_form.get("description"),
        submit_label=str(raw_form.get("submit_label") or "Создать"),
        cancel_label=str(raw_form.get("cancel_label") or "Отмена"),
        fields=fields,
    )


def _resolve_config_json(
    action: dict[str, Any],
    placement: dict[str, Any],
) -> dict[str, Any]:
    action_config = _as_dict(action.get("config_json"))
    placement_config = _as_dict(placement.get("config_json"))
    return {**action_config, **placement_config}


def _resolve_auto_link(
    action: dict[str, Any],
) -> tuple[bool, UUID | None, str | None]:
    enabled = bool(action.get("auto_link_enabled"))
    if not enabled:
        return False, None, None

    raw_relation = action.get("auto_link_relation")
    if not isinstance(raw_relation, dict):
        return True, None, None

    raw_id = raw_relation.get("id")
    relation_id = UUID(str(raw_id)) if raw_id else None
    relation_key = str(raw_relation.get("key") or "").strip() or None
    return True, relation_id, relation_key


def _resolve_target_object_type(
    action: dict[str, Any],
) -> tuple[UUID | None, str | None, str | None]:
    raw_target = action.get("target_object_type")
    if not isinstance(raw_target, dict):
        return None, None, None

    raw_id = raw_target.get("id")
    target_id = UUID(str(raw_id)) if raw_id else None
    target_key = str(raw_target.get("key") or "").strip() or None
    target_name = str(raw_target.get("name") or "").strip() or None
    return target_id, target_key, target_name


def resolve_actions_for_placement(
    actions: list[dict[str, Any]],
    placement_key: str,
) -> list[PublishedRuntimeAction]:
    """Resolve published actions for a placement key in a single pass over actions."""
    normalized_placement_key = str(placement_key or "").strip()
    if not normalized_placement_key:
        return []

    resolved: list[PublishedRuntimeAction] = []

    for action in actions:
        if not isinstance(action, dict):
            continue

        if action.get("is_active") is False:
            continue

        action_key = str(action.get("key") or "").strip()
        if not action_key:
            continue

        placements = action.get("placements", [])
        if not isinstance(placements, list):
            continue

        for placement in placements:
            if not isinstance(placement, dict):
                continue

            if placement.get("is_active") is False:
                continue

            if str(placement.get("placement_key") or "").strip() != normalized_placement_key:
                continue

            raw_id = action.get("id")
            if not raw_id:
                continue

            sort_order = placement.get("sort_order", 100)
            if not isinstance(sort_order, int):
                sort_order = 100

            target_object_type_id, target_object_type_key, target_object_type_name = (
                _resolve_target_object_type(action)
            )
            auto_link_enabled, auto_link_relation_id, auto_link_relation_key = (
                _resolve_auto_link(action)
            )

            resolved.append(
                PublishedRuntimeAction(
                    id=UUID(str(raw_id)),
                    key=action_key,
                    name=str(action.get("name") or action_key),
                    description=action.get("description"),
                    action_type_key=str(action.get("action_type_key") or ""),
                    placement_key=normalized_placement_key,
                    sort_order=sort_order,
                    label_override=placement.get("label_override"),
                    icon_key=placement.get("icon_key"),
                    config_json=_resolve_config_json(action, placement),
                    target_object_type_id=target_object_type_id,
                    target_object_type_key=target_object_type_key,
                    target_object_type_name=target_object_type_name,
                    auto_link_enabled=auto_link_enabled,
                    auto_link_relation_id=auto_link_relation_id,
                    auto_link_relation_key=auto_link_relation_key,
                    form=_resolve_action_form(action),
                ),
            )
            break

    resolved.sort(key=lambda item: (item.sort_order, item.name.casefold(), item.key))
    return resolved
