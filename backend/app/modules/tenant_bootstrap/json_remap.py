from __future__ import annotations

import copy
from uuid import UUID

from app.modules.tenant_bootstrap.context import CloneContext
from app.modules.tenant_bootstrap.url_rewrite import rewrite_tenant_urls

INT_REMAP_KEYS = frozenset(
    {
        "page_id",
        "pageId",
        "section_id",
        "sectionId",
        "block_id",
        "blockId",
        "library_id",
        "libraryId",
        "navigation_item_id",
        "navigationItemId",
        "workspace_id",
        "workspaceId",
        "home_page_id",
        "homePageId",
    }
)

UUID_REMAP_KEYS = frozenset(
    {
        "object_type_id",
        "objectTypeId",
        "field_id",
        "fieldId",
        "field_definition_id",
        "fieldDefinitionId",
        "relation_id",
        "relationId",
        "view_id",
        "viewId",
        "object_view_id",
        "objectViewId",
        "action_id",
        "actionId",
        "action_definition_id",
        "actionDefinitionId",
        "action_form_id",
        "actionFormId",
        "target_object_type_id",
        "targetObjectTypeId",
        "auto_link_relation_id",
        "autoLinkRelationId",
        "source_object_type_id",
        "sourceObjectTypeId",
    }
)

URL_LIKE_KEYS = frozenset(
    {
        "url",
        "route",
        "path",
        "targetPath",
        "href",
        "link",
    }
)


def _normalize_int_key(key: str) -> str:
    snake = key.replace("Id", "_id").replace("ID", "_id")
    if snake.endswith("_id"):
        return snake
    return key


def _remap_int_value(ctx: CloneContext, key: str, value: int) -> int:
    normalized = _normalize_int_key(key)
    remapped = ctx.remap_int(normalized, value)
    if remapped != value:
        return remapped
    if key == "target_id":
        return ctx.page_id_map.get(value, value)
    return value


def _remap_uuid_value(ctx: CloneContext, key: str, value: UUID) -> UUID:
    normalized = key.replace("Id", "_id")
    if normalized.endswith("_id"):
        remapped = ctx.remap_uuid(normalized, value)
        if remapped is not None:
            return remapped
    return ctx.object_type_id_map.get(value, value)


def remap_json_structure(value, ctx: CloneContext):
    if value is None:
        return None
    if isinstance(value, str):
        return rewrite_tenant_urls(
            value,
            source_tenant_id=ctx.source_tenant_id,
            target_tenant_id=ctx.target_tenant_id,
        )
    if isinstance(value, list):
        return [remap_json_structure(item, ctx) for item in value]
    if isinstance(value, dict):
        remapped: dict = {}
        for key, item in value.items():
            if key in URL_LIKE_KEYS and isinstance(item, str):
                remapped[key] = rewrite_tenant_urls(
                    item,
                    source_tenant_id=ctx.source_tenant_id,
                    target_tenant_id=ctx.target_tenant_id,
                )
                continue
            if key in INT_REMAP_KEYS and isinstance(item, int):
                remapped[key] = _remap_int_value(ctx, key, item)
                continue
            if key in UUID_REMAP_KEYS and isinstance(item, (str, UUID)):
                try:
                    uuid_value = item if isinstance(item, UUID) else UUID(str(item))
                except (ValueError, TypeError):
                    remapped[key] = remap_json_structure(item, ctx)
                    continue
                new_uuid = _remap_uuid_value(ctx, key, uuid_value)
                remapped[key] = str(new_uuid) if isinstance(item, str) else new_uuid
                continue
            if key == "target_id" and isinstance(item, str) and item.isdigit():
                remapped[key] = str(ctx.page_id_map.get(int(item), int(item)))
                continue
            remapped[key] = remap_json_structure(item, ctx)
        return remapped
    return value


def remap_json_field(value, ctx: CloneContext):
    if value is None:
        return None
    return remap_json_structure(copy.deepcopy(value), ctx)
