#!/usr/bin/env python3
"""Ensure Plan views use self-contained hierarchy relations (generic, all object types)."""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text

from app.modules.portals.models import Portal  # noqa: F401
from app.modules.platform.designer.field_definitions.models import (  # noqa: F401
    DesignerFieldDefinition,
)
from app.modules.platform.designer.object_types.models import (  # noqa: F401
    DesignerObjectType,
)
from app.modules.platform.designer.publish.models import (  # noqa: F401
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.platform.designer.relation_definitions.models import (  # noqa: F401
    DesignerRelationDefinition,
)
from app.modules.platform.designer.view_definitions.models import (  # noqa: F401
    DesignerViewDefinition,
)

from app.db.session import SessionLocal
from app.modules.platform.designer.publish.service import publish_tenant_catalog
from app.modules.platform.shared.hierarchy_relation_profile import (
    is_hierarchy_relation_definition,
    is_self_relation_definition,
)

TENANT_ID = 1


def _is_plan_tree_self_hierarchy(relation: dict, object_type_key: str) -> bool:
    if not is_hierarchy_relation_definition(relation, object_type_key):
        return False
    return is_self_relation_definition(relation)


def _plan_hierarchy_key_from_view_settings(settings_json: dict | None) -> str | None:
    if not isinstance(settings_json, dict):
        return None
    object_view = settings_json.get("objectView")
    if not isinstance(object_view, dict):
        return None
    presentation = object_view.get("presentation")
    if not isinstance(presentation, dict):
        return None
    plan = presentation.get("plan")
    if not isinstance(plan, dict):
        return None
    key = str(plan.get("hierarchyRelationKey") or "").strip()
    return key or None


def _set_plan_hierarchy_key(settings_json: dict, relation_key: str) -> dict:
    settings = deepcopy(settings_json) if isinstance(settings_json, dict) else {}
    object_view = settings.setdefault("objectView", {})
    presentation = object_view.setdefault("presentation", {})
    plan = presentation.setdefault("plan", {})
    plan["hierarchyRelationKey"] = relation_key
    return settings


def main() -> int:
    db = SessionLocal()
    changes: list[dict] = []

    try:
        object_types = db.execute(
            text(
                """
                SELECT id::text AS id, key, name
                FROM designer_object_types
                WHERE tenant_id = :tenant_id AND deleted_at IS NULL
                ORDER BY key
                """,
            ),
            {"tenant_id": TENANT_ID},
        ).mappings().all()

        relations = db.execute(
            text(
                """
                SELECT
                    r.id::text AS id,
                    r.key,
                    r.name,
                    r.relation_type,
                    r.settings_json,
                    s.key AS source_object_type_key,
                    t.key AS target_object_type_key
                FROM designer_relation_definitions r
                JOIN designer_object_types s ON s.id = r.source_object_type_id
                JOIN designer_object_types t ON t.id = r.target_object_type_id
                WHERE r.tenant_id = :tenant_id AND r.deleted_at IS NULL
                """,
            ),
            {"tenant_id": TENANT_ID},
        ).mappings().all()

        relations_by_key = {row["key"]: dict(row) for row in relations}

        plan_views = db.execute(
            text(
                """
                SELECT v.id::text AS id, v.key, v.settings_json, ot.key AS object_type_key
                FROM designer_view_definitions v
                JOIN designer_object_types ot ON ot.id = v.object_type_id
                WHERE v.tenant_id = :tenant_id
                  AND v.deleted_at IS NULL
                  AND lower(v.view_type) = 'plan'
                ORDER BY ot.key, v.key
                """,
            ),
            {"tenant_id": TENANT_ID},
        ).mappings().all()

        for view in plan_views:
            object_type_key = str(view["object_type_key"])
            configured_key = _plan_hierarchy_key_from_view_settings(view["settings_json"])
            if not configured_key:
                continue

            configured_relation = relations_by_key.get(configured_key)
            if configured_relation and _is_plan_tree_self_hierarchy(
                configured_relation,
                object_type_key,
            ):
                continue

            fallback_key = None
            for rel in relations:
                rel_dict = dict(rel)
                if _is_plan_tree_self_hierarchy(rel_dict, object_type_key):
                    fallback_key = rel_dict["key"]
                    break

            if not fallback_key:
                object_type_id = next(
                    ot["id"] for ot in object_types if ot["key"] == object_type_key
                )
                fallback_key = f"pod{object_type_key}"[:64]
                if fallback_key not in relations_by_key:
                    template = relations_by_key.get("podpunkt") or relations_by_key.get("podmihail")
                    settings_json = deepcopy(template["settings_json"]) if template else {
                        "is_hierarchy": True,
                        "parent_entity_side": "source",
                        "child_entity_side": "target",
                    }
                    settings_json["is_hierarchy"] = True
                    relation_id = str(uuid4())
                    db.execute(
                        text(
                            """
                            INSERT INTO designer_relation_definitions (
                                id, tenant_id, key, name, description,
                                source_object_type_id, target_object_type_id,
                                relation_type, reverse_name, sort_order,
                                is_required, is_system, is_active, bidirectional,
                                cascade_delete, settings_json, validation_json
                            ) VALUES (
                                CAST(:id AS uuid), :tenant_id, :key, :name, :description,
                                CAST(:source_object_type_id AS uuid),
                                CAST(:target_object_type_id AS uuid),
                                :relation_type, :reverse_name, 0,
                                false, false, true, true,
                                false, CAST(:settings_json AS jsonb), '{}'::jsonb
                            )
                            """,
                        ),
                        {
                            "id": relation_id,
                            "tenant_id": TENANT_ID,
                            "key": fallback_key,
                            "name": "Подпункт",
                            "description": "Plan hierarchy (auto-created self-relation)",
                            "source_object_type_id": object_type_id,
                            "target_object_type_id": object_type_id,
                            "relation_type": template["relation_type"] if template else "one_to_many",
                            "reverse_name": (template or {}).get("reverse_name") or "Родитель",
                            "settings_json": json.dumps(settings_json, ensure_ascii=False),
                        },
                    )
                    relations_by_key[fallback_key] = {
                        "key": fallback_key,
                        "source_object_type_key": object_type_key,
                        "target_object_type_key": object_type_key,
                        "settings_json": settings_json,
                    }

            new_settings = _set_plan_hierarchy_key(view["settings_json"] or {}, fallback_key)
            db.execute(
                text(
                    """
                    UPDATE designer_view_definitions
                    SET settings_json = CAST(:settings_json AS jsonb)
                    WHERE id = CAST(:view_id AS uuid)
                    """,
                ),
                {
                    "view_id": view["id"],
                    "settings_json": json.dumps(new_settings, ensure_ascii=False),
                },
            )
            changes.append(
                {
                    "objectType": object_type_key,
                    "viewKey": view["key"],
                    "from": configured_key,
                    "to": fallback_key,
                },
            )

        if changes:
            publish_tenant_catalog(db, TENANT_ID, current_user=None)

        db.commit()
        print(json.dumps({"changes": changes}, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        db.rollback()
        print(f"Failed: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
