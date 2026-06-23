#!/usr/bin/env python3
"""Read-only architecture mapping: current vs canonical target classification."""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
AUDIT_JSON = REPO_ROOT / "docs" / "audit" / "full_page_inventory_audit.json"
OUTPUT_DIR = REPO_ROOT / "docs" / "audit"

TENANT_ADMIN_TITLES = frozenset({"администрирование", "настройка системы"})

RUNTIME_MODULE_KEYS = frozenset(
    {
        "runtime.chat",
        "runtime.calendar",
        "runtime.notifications",
        "runtime.documents",
        "runtime.yasii",
        "runtime.bpmn",
    }
)


def _norm(value) -> str:
    return str(value or "").strip()


def _target_registry(classification_target: str) -> str:
    mapping = {
        "page": "pages_registry",
        "module": "modules_registry",
        "object": "objects_registry",
        "library": "libraries_registry",
        "workspace": "workspaces_registry",
        "tenant_administration": "tenant_administration",
        "studio": "studio_admin",
        "control_plane": "control_plane",
        "legacy_orphan": "archive_review",
        "needs_review": "archive_review",
    }
    return mapping.get(classification_target, "unknown")


def _target_for_page_row(row: dict) -> tuple[str, str, str]:
    runtime_key = _norm(row.get("runtime_key_derived") or row.get("navigation_system_key"))
    nav_type = _norm(row.get("navigation_type"))
    title = _norm(row.get("title")).lower()
    current = _norm(row.get("classification"))

    if runtime_key in RUNTIME_MODULE_KEYS or current == "runtime_module_entry":
        return (
            "module",
            "Page row + nav today; target standalone module entry",
            _target_registry("module"),
        )

    if current == "special_office_home" or runtime_key == "runtime.office_home":
        return (
            "page",
            "Canonical system home page (special page, not module)",
            _target_registry("page"),
        )

    if current == "document_library_entry" or nav_type == "document_library":
        return (
            "library",
            "document_library nav; page row is legacy shell",
            _target_registry("library"),
        )

    if current == "workspace_page":
        return (
            "workspace",
            "Workspace home/tab target page",
            _target_registry("workspace"),
        )

    if title in TENANT_ADMIN_TITLES and current == "user_page":
        return (
            "tenant_administration",
            "Tenant admin screen; not user CMS content",
            _target_registry("tenant_administration"),
        )

    if current == "user_page":
        return ("page", "User CMS content page", _target_registry("page"))

    if current in {"orphan_page", "draft_page"}:
        return (
            "legacy_orphan",
            "No nav/workspace binding or unpublished draft",
            _target_registry("legacy_orphan"),
        )

    return ("needs_review", "Manual review required", _target_registry("needs_review"))


def _target_for_nav_row(row: dict) -> tuple[str, str, str]:
    nav_type = _norm(row.get("nav_type"))
    system_key = _norm(row.get("system_key"))
    object_type_key = _norm(row.get("object_type_key"))

    if nav_type == "object_type" or object_type_key:
        return (
            "object",
            f"object_type entry ({object_type_key or 'unknown key'})",
            _target_registry("object"),
        )

    if nav_type == "document_library":
        return ("library", "document_library navigation entry", _target_registry("library"))

    if nav_type == "workspace" or system_key.startswith("designer.workspace."):
        return ("workspace", "Workspace navigation entry", _target_registry("workspace"))

    if system_key.startswith("designer.") or nav_type == "system_page":
        return ("studio", "Studio constructor admin route/nav", _target_registry("studio"))

    if nav_type == "external_link":
        return ("needs_review", "External link nav item", _target_registry("needs_review"))

    return ("needs_review", f"Unhandled nav type={nav_type}", _target_registry("needs_review"))


def _misclassification(
    *,
    entity_kind: str,
    current_model: str,
    target_model: str,
    system_key: str,
) -> dict | None:
    if current_model == target_model:
        return None

    risk = "medium"
    complexity = "medium"
    if target_model == "module" and entity_kind == "page":
        risk = "high"
        complexity = "high"
    elif target_model in {"library", "object"}:
        risk = "medium"
        complexity = "medium"
    elif target_model == "tenant_administration":
        risk = "medium"
        complexity = "low"
    elif target_model == "legacy_orphan":
        risk = "low"
        complexity = "low"

    return {
        "entity_kind": entity_kind,
        "system_key": system_key or None,
        "current_model": current_model,
        "target_model": target_model,
        "risk": risk,
        "fix_complexity": complexity,
        "note": "Representation mismatch; no data migration in architecture phase",
    }


def build_mapping(payload: dict) -> dict:
    inventory = []
    misclassified = []

    for row in payload.get("table_2_full_page_registry", []):
        target, reason, registry = _target_for_page_row(row)
        entity = {
            "entity_kind": "page",
            "entity_id": f"page:{row['page_id']}",
            "tenant_id": row["tenant_id"],
            "portal_id": row["portal_id"],
            "tenant_name": row.get("tenant_name"),
            "tenant_type": row.get("tenant_type"),
            "title": row["title"],
            "type": row.get("navigation_type"),
            "system_key": row.get("navigation_system_key") or row.get("runtime_key_derived"),
            "object_type_key": row.get("navigation_object_type_key"),
            "page_id": row["page_id"],
            "nav_id": row.get("navigation_item_id"),
            "status": row.get("status"),
            "classification_now": row.get("classification"),
            "classification_target": target,
            "target_registry": registry,
            "target_reason": reason,
            "page_backed": True,
            "virtual": False,
        }
        inventory.append(entity)
        miss = _misclassification(
            entity_kind="page",
            current_model="page" if row.get("classification") not in {
                "runtime_module_entry",
                "document_library_entry",
                "special_office_home",
            } else row.get("classification"),
            target_model=target,
            system_key=_norm(entity["system_key"]),
        )
        if miss:
            miss.update(
                {
                    "tenant_id": row["tenant_id"],
                    "entity_id": entity["entity_id"],
                    "title": row["title"],
                    "page_id": row["page_id"],
                    "nav_id": row.get("navigation_item_id"),
                }
            )
            misclassified.append(miss)

        if row.get("classification") == "runtime_module_entry":
            misclassified.append(
                {
                    "entity_kind": "page",
                    "entity_id": entity["entity_id"],
                    "tenant_id": row["tenant_id"],
                    "title": row["title"],
                    "page_id": row["page_id"],
                    "nav_id": row.get("navigation_item_id"),
                    "system_key": entity["system_key"],
                    "current_model": "pages table + navigation",
                    "target_model": "module",
                    "risk": "high",
                    "fix_complexity": "high",
                    "note": "Runtime UI bypasses CMS canvas; should not live in Pages registry",
                }
            )

    for row in payload.get("table_5_object_document_entries", []):
        target, reason, registry = _target_for_nav_row(row)
        entity = {
            "entity_kind": "navigation",
            "entity_id": f"nav:{row['nav_id']}",
            "tenant_id": row["tenant_id"],
            "portal_id": row["portal_id"],
            "tenant_name": row.get("tenant_name"),
            "tenant_type": row.get("tenant_type"),
            "title": row["title"],
            "type": row.get("nav_type"),
            "system_key": row.get("system_key"),
            "object_type_key": row.get("object_type_key"),
            "page_id": None,
            "nav_id": row["nav_id"],
            "status": None,
            "classification_now": row.get("classification"),
            "classification_target": target,
            "target_registry": registry,
            "target_reason": reason,
            "page_backed": False,
            "virtual": target in {"studio", "control_plane"},
        }
        inventory.append(entity)

    for row in payload.get("table_6_virtual_routes", []):
        area = _norm(row.get("area")).lower()
        target = "control_plane" if area == "control plane" else "studio"
        entity = {
            "entity_kind": "virtual_route",
            "entity_id": f"route:{row['route']}",
            "tenant_id": None,
            "portal_id": None,
            "tenant_name": None,
            "tenant_type": None,
            "title": row["title"],
            "type": "virtual_route",
            "system_key": None,
            "object_type_key": None,
            "page_id": None,
            "nav_id": None,
            "status": None,
            "classification_now": "studio_virtual_page"
            if target == "studio"
            else "control_plane_virtual_page",
            "classification_target": target,
            "target_registry": _target_registry(target),
            "target_reason": row.get("purpose"),
            "page_backed": False,
            "virtual": True,
            "route": row["route"],
            "source_file": row.get("source_file"),
        }
        inventory.append(entity)

    # Deduplicate explicit runtime misclassification already covered
    seen = set()
    unique_misclassified = []
    for item in misclassified:
        key = (
            item.get("entity_id"),
            item.get("target_model"),
            item.get("system_key"),
        )
        if key in seen:
            continue
        seen.add(key)
        unique_misclassified.append(item)

    production_tenants = {1, 2, 21}
    production_inventory = [e for e in inventory if e.get("tenant_id") in production_tenants]

    summary = {
        "inventory_total": len(inventory),
        "production_like_tenants": sorted(production_tenants),
        "production_inventory_count": len(production_inventory),
        "misclassified_count": len(unique_misclassified),
        "target_counts": dict(
            sorted(
                {k: 0 for k in []}.items()
            )
        ),
    }
    target_counts: dict[str, int] = {}
    for entity in inventory:
        key = entity["classification_target"]
        target_counts[key] = target_counts.get(key, 0) + 1
    summary["target_counts"] = dict(sorted(target_counts.items()))

    return {
        "summary": summary,
        "canonical_model_version": "2026-06-14",
        "inventory_mapping": inventory,
        "production_inventory_mapping": production_inventory,
        "misclassified_entities": unique_misclassified,
        "registry_separation_plan": {
            "pages_registry": [
                "page (user CMS)",
                "page (special_office_home / system home)",
            ],
            "modules_registry": [
                "module (runtime.chat, runtime.calendar, runtime.notifications, future runtime.*)",
            ],
            "objects_registry": ["object (object_type nav)"],
            "libraries_registry": ["library (document_library)"],
            "workspaces_registry": ["workspace (workspace nav + workspace pages)"],
            "tenant_administration": [
                "tenant_administration (Администрирование, Настройка системы)",
            ],
            "studio_admin": ["studio virtual routes + designer.* nav"],
            "control_plane": ["control_plane virtual routes"],
            "archive_review": ["legacy_orphan", "needs_review"],
        },
    }


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    if not AUDIT_JSON.exists():
        print("Missing audit JSON. Run audit_full_page_inventory.py first.", file=sys.stderr)
        sys.exit(1)

    payload = json.loads(AUDIT_JSON.read_text(encoding="utf-8"))
    mapping = build_mapping(payload)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUTPUT_DIR / "architecture_entity_mapping.json"
    json_path.write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )

    flat_rows = []
    for entity in mapping["inventory_mapping"]:
        flat_rows.append(
            {
                "entity_id": entity["entity_id"],
                "tenant_id": entity["tenant_id"],
                "portal_id": entity["portal_id"],
                "title": entity["title"],
                "type": entity["type"],
                "system_key": entity["system_key"],
                "object_type_key": entity["object_type_key"],
                "page_id": entity["page_id"],
                "nav_id": entity["nav_id"],
                "classification_now": entity["classification_now"],
                "classification_target": entity["classification_target"],
                "target_registry": entity["target_registry"],
            }
        )
    write_csv(OUTPUT_DIR / "architecture_entity_mapping.csv", flat_rows)
    write_csv(
        OUTPUT_DIR / "architecture_misclassified_entities.csv",
        mapping["misclassified_entities"],
    )

    print(json.dumps(mapping["summary"], ensure_ascii=False, indent=2))
    print(f"JSON: {json_path}")


if __name__ == "__main__":
    main()
