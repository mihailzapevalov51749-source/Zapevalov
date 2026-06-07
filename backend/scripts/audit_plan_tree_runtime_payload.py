#!/usr/bin/env python3
"""Audit Plan Tree runtime payload — simulates Office ObjectPlanView data path."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from uuid import UUID

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.modules.portals.models import Portal  # noqa: F401
from app.modules.users.models import User  # noqa: F401
from app.modules.platform.runtime.entities.models import RuntimeEntity  # noqa: F401
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance  # noqa: F401
from app.db.session import SessionLocal
from app.modules.platform.runtime.query import service as query_service
from app.modules.platform.runtime.relation_instances import repository as rel_repo
from app.modules.platform.runtime.entities import serializer

TENANT_ID = 1
OBJECT_TYPE_KEY = "napravleniya"
VIEW_KEY = "arhitektura"
HIERARCHY_RELATION_KEY = "podpunkt"
QUERY_LIMIT = 20  # ObjectTypeDataPage / ObjectViewHost default
ROOT_ID = "0b428b2a-6a18-4381-8751-f678eed52361"
TARGET_ID = "300d9128-2428-4691-9542-8a53e309ced1"

# Child directions 1, 2, 3 under Action Engine V1 (creation order from script)
DIRECTION_IDS = {
    "3.1": "9634094c-86d8-4cc4-8219-248ef2929c55",
    "3.2": "b297c474-09ea-46b2-956e-107c6926c8c8",
    "3.3": "7983b714-d3ff-4037-b4e7-fbb0422256ee",
}


def resolve_plan_title_field_key(contract_projection: dict | None) -> str | None:
    """Mirrors resolvePlanTitleFieldKey → resolveEntityTitleFieldKey with catalog=null."""
    if not contract_projection:
        return None
    explicit = str(contract_projection.get("titleFieldKey") or "").strip()
    return explicit or None


def resolve_entity_title(values: dict, title_field_key: str | None) -> str:
    key = str(title_field_key or "").strip()
    if key and values.get(key) is not None and values.get(key) != "":
        return str(values[key])
    return ""


def resolve_entity_display_title(
    entity: dict,
    *,
    title_field_key: str | None,
    object_type_key: str,
) -> str:
    """Mirrors buildPlanTree.resolveNodeTitle → resolveEntityDisplayTitle (plan path)."""
    resolved_key = str(title_field_key or "").strip() or None
    values = entity.get("values") if isinstance(entity.get("values"), dict) else entity
    if not isinstance(values, dict):
        values = {}
    from_field = resolve_entity_title(values, resolved_key)
    if from_field:
        return from_field
    entity_id = entity.get("id") or entity.get("entity_id")
    return f"[{entity_id}]" if entity_id else "—"


def entity_to_json_dict(entity_read) -> dict:
    """API-shaped item as returned by runtime query (EntityRead → JSON)."""
    data = entity_read.model_dump(mode="json")
    return data


def index_entities(items: list[dict]) -> dict[str, dict]:
    by_id: dict[str, dict] = {}
    for item in items:
        eid = str(item.get("id") or item.get("entity_id") or "").strip()
        if eid:
            by_id[eid] = item
    return by_id


def collect_tree_ids(relations, root_id: str) -> set[str]:
    ids = set()

    def walk(parent_id: str) -> None:
        ids.add(parent_id)
        for rel in relations:
            if str(rel.source_entity_id) == parent_id:
                child = str(rel.target_entity_id)
                if child not in ids:
                    walk(child)

    walk(root_id)
    return ids


def build_hierarchy_maps(relations) -> tuple[set[str], set[str], set[str]]:
    """all entity ids in hierarchy edges + child ids."""
    all_child_ids: set[str] = set()
    all_parent_ids: set[str] = set()
    for rel in relations:
        all_child_ids.add(str(rel.target_entity_id))
        all_parent_ids.add(str(rel.source_entity_id))
    all_entity_ids_in_hierarchy = all_child_ids | all_parent_ids
    return all_child_ids, all_parent_ids, all_entity_ids_in_hierarchy


def load_contract_projection(db) -> dict:
    from sqlalchemy import text

    row = db.execute(
        text(
            """
            SELECT payload FROM designer_metadata_snapshots
            WHERE tenant_id = :tenant_id
            ORDER BY catalog_version DESC LIMIT 1
            """
        ),
        {"tenant_id": TENANT_ID},
    ).fetchone()
    payload = row.payload or {}
    for ot in payload.get("object_types") or []:
        if ot.get("key") != OBJECT_TYPE_KEY:
            continue
        for view in ot.get("views") or []:
            if view.get("key") != VIEW_KEY:
                continue
            ov = (view.get("settings_json") or {}).get("objectView") or {}
            return ov.get("projection") or {}
    return {}


def audit_entity(
    entity_id: str,
    *,
    entities_by_id: dict[str, dict],
    items: list[dict],
    title_field_key: str | None,
    label: str,
) -> dict:
    normalized_id = str(entity_id).strip()
    from_map = entities_by_id.get(normalized_id)
    stub = {"id": normalized_id}
    entity_used = from_map if from_map is not None else stub
    has_entity = from_map is not None

    item_match = next(
        (it for it in items if str(it.get("id") or it.get("entity_id")) == normalized_id),
        None,
    )

    values = (
        entity_used.get("values")
        if isinstance(entity_used.get("values"), dict)
        else entity_used
    )
    title_field_value = values.get(title_field_key) if isinstance(values, dict) else None

    return {
        "label": label,
        "entityId": normalized_id,
        "entitiesById_get": from_map,
        "entitiesById_fallback_used": not has_entity,
        "buildPlanTree_entity_resolved": entity_used,
        "query_listResult_item": item_match,
        "titleFieldKey_at_tree_build": title_field_key,
        "resolveEntityTitle_result": resolve_entity_title(
            values if isinstance(values, dict) else {},
            title_field_key,
        ),
        "resolveEntityDisplayTitle_result": resolve_entity_display_title(
            entity_used,
            title_field_key=title_field_key,
            object_type_key=OBJECT_TYPE_KEY,
        ),
        "titleFieldValue": title_field_value,
        "hasEntity": has_entity,
        "renderedTitle": resolve_entity_display_title(
            entity_used,
            title_field_key=title_field_key,
            object_type_key=OBJECT_TYPE_KEY,
        ),
    }


def main() -> int:
    db = SessionLocal()
    try:
        projection = load_contract_projection(db)
        title_field_key = resolve_plan_title_field_key(projection)

        query_response = query_service.query_entities(
            db,
            TENANT_ID,
            OBJECT_TYPE_KEY,
            query_params={},
            limit=QUERY_LIMIT,
            offset=0,
            sort="created_at",
            order="desc",
        )

        items = [entity_to_json_dict(e) for e in query_response.items]
        entities_by_id = index_entities(items)

        relations = rel_repo.list_by_relation_key(db, TENANT_ID, HIERARCHY_RELATION_KEY)
        tree_ids = collect_tree_ids(relations, ROOT_ID)
        _, _, hierarchy_entity_ids = build_hierarchy_maps(relations)

        # Nodes that buildPlanTree would visit (same as buildPlanTree rootIds logic)
        all_child_ids = {str(r.target_entity_id) for r in relations}
        parent_by_child = {str(r.target_entity_id): str(r.source_entity_id) for r in relations}
        all_entity_ids = set(entities_by_id.keys()) | all_child_ids
        root_ids = [eid for eid in all_entity_ids if eid not in parent_by_child]

        # For Action Engine subtree only
        subtree_ids = sorted(tree_ids)

        table_rows = []
        real_entity_count = 0
        stub_count = 0

        for eid in subtree_ids:
            from_map = entities_by_id.get(eid)
            has_entity = from_map is not None
            if has_entity:
                real_entity_count += 1
            else:
                stub_count += 1

            entity_used = from_map if has_entity else {"id": eid}
            values = (
                entity_used.get("values")
                if isinstance(entity_used.get("values"), dict)
                else {}
            )
            tfv = values.get(title_field_key) if title_field_key else None
            rendered = resolve_entity_display_title(
                entity_used,
                title_field_key=title_field_key,
                object_type_key=OBJECT_TYPE_KEY,
            )
            table_rows.append(
                {
                    "entityId": eid,
                    "hasEntity": has_entity,
                    "titleFieldValue": tfv,
                    "renderedTitle": rendered,
                }
            )

        target_audit = audit_entity(
            TARGET_ID,
            entities_by_id=entities_by_id,
            items=items,
            title_field_key=title_field_key,
            label="TARGET 300d9128",
        )

        direction_audits = {
            key: audit_entity(
                eid,
                entities_by_id=entities_by_id,
                items=items,
                title_field_key=title_field_key,
                label=f"direction {key}",
            )
            for key, eid in DIRECTION_IDS.items()
        }

        report = {
            "simulation": {
                "path": "Office ObjectPlanView → useObjectViewQuery(limit=20) → buildPlanTree",
                "tenantId": TENANT_ID,
                "objectTypeKey": OBJECT_TYPE_KEY,
                "viewKey": VIEW_KEY,
                "queryLimit": QUERY_LIMIT,
                "querySort": "created_at desc",
                "queryTotal": query_response.pagination.total,
                "queryItemsReturned": len(items),
                "hierarchyRelationKey": HIERARCHY_RELATION_KEY,
                "hierarchyInstanceCount": len(relations),
                "actionEngineTreeNodeCount": len(subtree_ids),
            },
            "titleFieldKey_at_tree_build": title_field_key,
            "contract_projection_titleFieldKey": projection.get("titleFieldKey"),
            "buildPlanTree_stub_stats_action_engine_subtree": {
                "real_entity": real_entity_count,
                "fallback_id_only": stub_count,
                "total": len(subtree_ids),
            },
            "target_node": target_audit,
            "direction_nodes_3_1_3_2_3_3": direction_audits,
            "table_action_engine_subtree": table_rows,
        }

        out_path = BACKEND_ROOT / "audit_plan_tree_runtime_payload.json"
        out_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2, default=str),
            encoding="utf-8",
        )
        print(json.dumps(report, ensure_ascii=False, indent=2, default=str))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
