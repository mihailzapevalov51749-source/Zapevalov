#!/usr/bin/env python3
"""
Apply Plan Role Mapping migration for a designer view (Studio save + publish).

Simulates Migration Assistant: fills objectView.roleMapping from legacy plan *FieldKey.
Does not remove legacy keys. Read draft from DB, save, publish through platform services.
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from uuid import UUID

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from structure_write_script_guard import guard_script_structure_write  # noqa: E402

import json as json_module

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.platform.designer.publish.object_view_contract import (
    sanitize_role_mapping,
)
from app.modules.platform.designer.publish.plan_legacy_usage_audit import (
    audit_catalog_payload,
    plan_legacy_usage_to_dict,
)
from app.modules.platform.designer.publish.service import publish_tenant_catalog

PLAN_REQUIRED_ROLE_INFERENCE: dict[str, list[str]] = {
    "nodeTitle": ["title", "name"],
    "nodeStatus": ["status"],
    "nodeDescription": ["description"],
}

PLAN_LEGACY_TO_ROLE = {
    "titleFieldKey": "nodeTitle",
    "statusFieldKey": "nodeStatus",
    "descriptionFieldKey": "nodeDescription",
    "nextStepsFieldKey": "nextSteps",
}


def generate_plan_role_mapping_from_legacy(
    plan_settings: dict,
    projection_field_keys: list[str],
    existing_role_mapping: dict | None = None,
    *,
    infer_required_roles: bool = True,
) -> dict[str, str]:
    projection_set = {str(key).strip() for key in projection_field_keys if str(key).strip()}
    result = dict(existing_role_mapping or {})

    for legacy_key, role_key in PLAN_LEGACY_TO_ROLE.items():
        field_key = str(plan_settings.get(legacy_key) or "").strip()
        if field_key and field_key in projection_set:
            result[role_key] = field_key

    if infer_required_roles:
        for role_key, candidates in PLAN_REQUIRED_ROLE_INFERENCE.items():
            if result.get(role_key):
                continue
            for candidate in candidates:
                if candidate in projection_set:
                    result[role_key] = candidate
                    break

    return sanitize_role_mapping(result, projection_field_keys=projection_set)


def apply_migration_to_view_settings(settings_json: dict) -> tuple[dict, dict]:
    settings = deepcopy(settings_json) if isinstance(settings_json, dict) else {}
    object_view = settings.get("objectView")
    if not isinstance(object_view, dict):
        raise ValueError("settings_json.objectView is required")

    presentation = object_view.get("presentation")
    plan = {}
    if isinstance(presentation, dict) and isinstance(presentation.get("plan"), dict):
        plan = presentation["plan"]

    projection = object_view.get("projection")
    projection_field_keys: list[str] = []
    if isinstance(projection, dict):
        projection_field_keys = [
            str(key).strip()
            for key in (projection.get("fieldKeys") or [])
            if str(key).strip()
        ]

    existing = object_view.get("roleMapping")
    existing_mapping = existing if isinstance(existing, dict) else {}

    role_mapping = generate_plan_role_mapping_from_legacy(
        plan,
        projection_field_keys,
        existing_mapping,
    )

    object_view = dict(object_view)
    object_view["roleMapping"] = role_mapping
    settings["objectView"] = object_view
    return settings, role_mapping


def main() -> int:
    view_id = UUID("463d34a1-9a4b-43e0-81e7-81c923173051")
    tenant_id = 1

    db = SessionLocal()
    try:
        guard_script_structure_write(db, tenant_id, "apply_plan_role_mapping_migration")
        row = db.execute(
            text(
                """
                SELECT settings_json
                FROM designer_view_definitions
                WHERE id = :view_id
                """
            ),
            {"view_id": str(view_id)},
        ).fetchone()
        if row is None:
            print("View not found", file=sys.stderr)
            return 1

        settings_json, role_mapping = apply_migration_to_view_settings(row.settings_json or {})
        db.execute(
            text(
                """
                UPDATE designer_view_definitions
                SET settings_json = CAST(:settings_json AS jsonb)
                WHERE id = :view_id
                """
            ),
            {
                "view_id": str(view_id),
                "settings_json": json_module.dumps(settings_json, ensure_ascii=False),
            },
        )
        db.commit()

        publish_catalog_version = None
        try:
            publish_result = publish_tenant_catalog(db, tenant_id, current_user=None)
            db.commit()
            publish_catalog_version = publish_result.catalog_version
        except Exception as publish_error:
            db.rollback()
            publish_catalog_version = f"skipped: {publish_error}"

        snapshot_row = db.execute(
            text(
                """
                SELECT payload, catalog_version
                FROM designer_metadata_snapshots
                WHERE tenant_id = :tenant_id
                ORDER BY catalog_version DESC
                LIMIT 1
                """
            ),
            {"tenant_id": tenant_id},
        ).fetchone()

        audit = audit_catalog_payload(
            snapshot_row.payload if snapshot_row else {},
            tenant_id=tenant_id,
        )
        if snapshot_row:
            audit.catalog_version = snapshot_row.catalog_version

        output = {
            "view_id": str(view_id),
            "role_mapping": role_mapping,
            "legacy_preserved": (
                settings_json.get("objectView", {})
                .get("presentation", {})
                .get("plan", {})
            ),
            "publish_catalog_version": publish_catalog_version,
            "audit": plan_legacy_usage_to_dict(audit),
        }
        sys.stdout.buffer.write(
            json.dumps(output, ensure_ascii=False, indent=2).encode("utf-8")
        )
        sys.stdout.buffer.write(b"\n")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"Migration failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
