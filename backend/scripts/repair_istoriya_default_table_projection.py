#!/usr/bin/env python3
"""One-off repair: remove stale projection keys from istoriya/default_table."""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.platform.designer.publish.draft_loader import load_tenant_draft_catalog
from app.modules.platform.designer.publish.validators import validate_tenant_draft_catalog

TENANT_ID = 1
OBJECT_TYPE_KEY = "istoriya"
OBJECT_TYPE_ID = UUID("1f6f4a1f-0b20-4d39-838c-610b0c6745f8")
VIEW_ID = UUID("07ca8837-4936-431e-8cb8-359ebfe1c537")
VIEW_KEY = "default_table"

STALE_KEYS = frozenset({"data", "kommit", "versiya_etap"})

EXPECTED_ACTIVE_FIELD_KEYS = frozenset(
    {
        "izmenennye_fayly",
        "napravlenie",
        "nazvanie_sobytiya",
        "opisanie_izmeneniy",
        "rezultat",
        "sleduyuschiy_shag",
        "status",
        "tip_sobytiya",
    }
)

BACKUP_DIR = SCRIPTS_ROOT / "backups"


def _normalize_key_list(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(key).strip() for key in value if str(key or "").strip()]


def _remove_stale_keys(keys: list[str]) -> tuple[list[str], list[str]]:
    removed: list[str] = []
    kept: list[str] = []
    for key in keys:
        if key in STALE_KEYS:
            removed.append(key)
            continue
        kept.append(key)
    return kept, removed


def _read_projection(settings_json: dict) -> tuple[dict, dict]:
    object_view = settings_json.get("objectView")
    if not isinstance(object_view, dict):
        raise ValueError("settings_json.objectView отсутствует или не является объектом")

    projection = object_view.get("projection")
    if not isinstance(projection, dict):
        raise ValueError("settings_json.objectView.projection отсутствует или не является объектом")

    return object_view, projection


def _fetch_object_type(db: Session) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT id::text AS id, key, name
            FROM designer_object_types
            WHERE tenant_id = :tenant_id
              AND id = :object_type_id
              AND deleted_at IS NULL
            LIMIT 1
            """
        ),
        {"tenant_id": TENANT_ID, "object_type_id": str(OBJECT_TYPE_ID)},
    ).mappings().first()
    return dict(row) if row else None


def _fetch_view(db: Session) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT id::text AS id, key, settings_json, updated_at
            FROM designer_view_definitions
            WHERE tenant_id = :tenant_id
              AND id = :view_id
              AND object_type_id = :object_type_id
              AND deleted_at IS NULL
            LIMIT 1
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "view_id": str(VIEW_ID),
            "object_type_id": str(OBJECT_TYPE_ID),
        },
    ).mappings().first()
    return dict(row) if row else None


def _active_field_keys(db: Session) -> set[str]:
    rows = db.execute(
        text(
            """
            SELECT key
            FROM designer_field_definitions
            WHERE tenant_id = :tenant_id
              AND object_type_id = :object_type_id
              AND deleted_at IS NULL
            ORDER BY sort_order, key
            """
        ),
        {"tenant_id": TENANT_ID, "object_type_id": str(OBJECT_TYPE_ID)},
    ).scalars().all()
    return {str(key) for key in rows}


def _unknown_projection_keys(projection_keys: list[str], active_keys: set[str]) -> list[str]:
    return sorted(key for key in projection_keys if key not in active_keys)


def _save_backup(settings_json: dict) -> Path:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"istoriya_default_table_settings_{timestamp}.json"
    backup_path.write_text(
        json.dumps(settings_json, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return backup_path


def main() -> int:
    db = SessionLocal()
    try:
        object_type = _fetch_object_type(db)
        if not object_type or object_type["key"] != OBJECT_TYPE_KEY:
            print("ERROR: ObjectType istoriya не найден или key не совпадает")
            return 1

        view = _fetch_view(db)
        if not view or view["key"] != VIEW_KEY:
            print("ERROR: View default_table не найден или не совпадает с ожиданием")
            return 1

        active_keys = _active_field_keys(db)
        if active_keys != EXPECTED_ACTIVE_FIELD_KEYS:
            print("ERROR: Активные field keys не совпадают с ожиданием аудита")
            print("expected:", sorted(EXPECTED_ACTIVE_FIELD_KEYS))
            print("actual:  ", sorted(active_keys))
            return 1

        settings_json = deepcopy(view["settings_json"] or {})
        if not isinstance(settings_json, dict):
            print("ERROR: settings_json не является объектом")
            return 1

        object_view, projection = _read_projection(settings_json)
        before_field_keys = _normalize_key_list(
            projection.get("fieldKeys") or projection.get("field_keys")
        )
        before_field_order = _normalize_key_list(
            projection.get("fieldOrder") or projection.get("field_order")
        )

        print("=== BEFORE ===")
        print("fieldKeys:", before_field_keys)
        print("fieldOrder:", before_field_order)
        print(
            "unknownFieldKeys:",
            _unknown_projection_keys(before_field_keys, active_keys),
        )

        stale_in_projection = sorted(set(before_field_keys) & STALE_KEYS)
        if not stale_in_projection:
            print("NOOP: устаревшие ключи уже отсутствуют в projection")
            return 0

        after_field_keys, removed_from_keys = _remove_stale_keys(before_field_keys)
        after_field_order, removed_from_order = _remove_stale_keys(before_field_order)

        if removed_from_keys != removed_from_order:
            print("ERROR: fieldKeys и fieldOrder содержат разный набор устаревших ключей")
            print("removed_from_keys:", removed_from_keys)
            print("removed_from_order:", removed_from_order)
            return 1

        unknown_after_keys = _unknown_projection_keys(after_field_keys, active_keys)
        if unknown_after_keys:
            print("ERROR: после очистки остаются неизвестные ключи:", unknown_after_keys)
            return 1

        backup_path = _save_backup(view["settings_json"] or {})
        print("backup:", backup_path)

        projection["fieldKeys"] = after_field_keys
        projection["fieldOrder"] = after_field_order
        object_view["projection"] = projection
        settings_json["objectView"] = object_view

        db.execute(
            text(
                """
                UPDATE designer_view_definitions
                SET settings_json = CAST(:settings_json AS jsonb),
                    updated_at = NOW()
                WHERE tenant_id = :tenant_id
                  AND id = :view_id
                  AND object_type_id = :object_type_id
                """
            ),
            {
                "settings_json": json.dumps(settings_json, ensure_ascii=False),
                "tenant_id": TENANT_ID,
                "view_id": str(VIEW_ID),
                "object_type_id": str(OBJECT_TYPE_ID),
            },
        )
        db.execute(
            text(
                """
                UPDATE designer_object_types
                SET updated_at = NOW()
                WHERE tenant_id = :tenant_id
                  AND id = :object_type_id
                """
            ),
            {"tenant_id": TENANT_ID, "object_type_id": str(OBJECT_TYPE_ID)},
        )
        db.commit()

        print("=== AFTER ===")
        print("removed:", removed_from_keys)
        print("fieldKeys:", after_field_keys)
        print("fieldOrder:", after_field_order)
        print("unknownFieldKeys:", _unknown_projection_keys(after_field_keys, active_keys))

        catalog = load_tenant_draft_catalog(db, TENANT_ID)
        report = validate_tenant_draft_catalog(catalog)
        projection_errors = [
            error
            for error in report.errors
            if error.code == "object_view_unknown_projection_field"
            and VIEW_KEY in error.path
        ]

        print("=== PUBLISH VALIDATION ===")
        print("valid:", report.valid)
        print("projection_errors:", len(projection_errors))
        for error in projection_errors:
            print(f"  - {error.path}: {error.message}")

        if projection_errors:
            return 1

        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
