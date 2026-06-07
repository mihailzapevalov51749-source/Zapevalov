"""create default_quick_form views from legacy quick_create fields

Revision ID: 20260607_0019
Revises: 20260607_0018
Create Date: 2026-06-07

"""

from __future__ import annotations

import json
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260607_0019"
down_revision: Union[str, None] = "20260607_0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_QUICK_FORM_VIEW_KEY = "default_quick_form"
DEFAULT_QUICK_FORM_VIEW_NAME = "Быстрая форма"
TEXT_LIKE_FIELD_TYPES = {"text", "textarea"}
OBJECT_VIEW_SCHEMA_VERSION = 1


def _resolve_title_field_key(fields: list[dict]) -> str | None:
    for field in fields:
        settings = field.get("settings_json") or {}
        if isinstance(settings, dict) and settings.get("is_title") is True:
            return str(field.get("key") or "").strip() or None

    for field in fields:
        if str(field.get("field_type") or "").lower() in TEXT_LIKE_FIELD_TYPES:
            return str(field.get("key") or "").strip() or None

    return None


def _build_quick_form_projection(fields: list[dict]) -> dict:
    title_field_key = _resolve_title_field_key(fields)
    selected_keys: list[str] = []
    seen: set[str] = set()

    if title_field_key:
        selected_keys.append(title_field_key)
        seen.add(title_field_key)

    for field in sorted(fields, key=lambda row: (row.get("sort_order") or 0, row.get("key") or "")):
        key = str(field.get("key") or "").strip()
        if not key or key in seen:
            continue

        if field.get("is_system") is True:
            continue

        if field.get("quick_create") is True:
            selected_keys.append(key)
            seen.add(key)

    return {
        "fieldKeys": selected_keys,
        "fieldOrder": list(selected_keys),
        "titleFieldKey": title_field_key,
    }


def _build_settings_json(projection: dict) -> dict:
    object_view = {
        "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
        "key": DEFAULT_QUICK_FORM_VIEW_KEY,
        "viewType": "quick_form",
        "projection": {
            "fieldKeys": projection["fieldKeys"],
            "fieldOrder": projection["fieldOrder"],
            "titleFieldKey": projection["titleFieldKey"],
            "infoFieldKeys": [],
        },
        "roleMapping": {},
        "query": {
            "filters": {
                "conditions": [],
                "savedFilters": [],
                "quickFilters": [],
                "defaultQuickFilterId": None,
            },
            "sort": {"rules": []},
            "pagination": {"defaultPageSize": 20},
        },
        "presentation": {
            "quickForm": {},
        },
    }

    return {
        "objectView": object_view,
        "projection": {
            "visible_fields": projection["fieldKeys"],
            "field_order": projection["fieldOrder"],
            "title_field": projection["titleFieldKey"],
            "default_sort": {"field": None, "order": "desc"},
        },
    }


def upgrade() -> None:
    bind = op.get_bind()

    object_types = bind.execute(
        sa.text(
            """
            SELECT id, tenant_id
            FROM designer_object_types
            WHERE deleted_at IS NULL
            """,
        ),
    ).mappings().all()

    for object_type in object_types:
        object_type_id = object_type["id"]
        tenant_id = object_type["tenant_id"]

        existing = bind.execute(
            sa.text(
                """
                SELECT id
                FROM designer_view_definitions
                WHERE object_type_id = :object_type_id
                  AND view_type = 'quick_form'
                  AND deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {"object_type_id": object_type_id},
        ).first()

        if existing:
            continue

        field_rows = bind.execute(
            sa.text(
                """
                SELECT key, field_type, sort_order, quick_create, is_system, settings_json
                FROM designer_field_definitions
                WHERE object_type_id = :object_type_id
                  AND deleted_at IS NULL
                ORDER BY sort_order ASC, key ASC
                """,
            ),
            {"object_type_id": object_type_id},
        ).mappings().all()

        fields = [dict(row) for row in field_rows]
        projection = _build_quick_form_projection(fields)

        if not projection["fieldKeys"]:
            continue

        settings_json = _build_settings_json(projection)
        view_id = uuid.uuid4()

        bind.execute(
            sa.text(
                """
                INSERT INTO designer_view_definitions (
                    id,
                    tenant_id,
                    object_type_id,
                    key,
                    name,
                    description,
                    view_type,
                    is_default,
                    is_system,
                    is_active,
                    sort_order,
                    settings_json,
                    layout_json,
                    filters_json,
                    visibility_json,
                    draft_revision
                ) VALUES (
                    :id,
                    :tenant_id,
                    :object_type_id,
                    :key,
                    :name,
                    :description,
                    :view_type,
                    false,
                    true,
                    true,
                    900,
                    CAST(:settings_json AS jsonb),
                    '{}'::jsonb,
                    '{}'::jsonb,
                    '{}'::jsonb,
                    1
                )
                """,
            ),
            {
                "id": view_id,
                "tenant_id": tenant_id,
                "object_type_id": object_type_id,
                "key": DEFAULT_QUICK_FORM_VIEW_KEY,
                "name": DEFAULT_QUICK_FORM_VIEW_NAME,
                "description": "Системное представление быстрого создания записи",
                "view_type": "quick_form",
                "settings_json": json.dumps(settings_json),
            },
        )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM designer_view_definitions
        WHERE key = 'default_quick_form'
          AND view_type = 'quick_form'
          AND is_system = TRUE
          AND deleted_at IS NULL
        """,
    )
