#!/usr/bin/env python3
"""Fix sibling order for «Изоляция компаний» plan hierarchy."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval
from create_tenant_isolation_plan_structure import (
    HIERARCHY_RELATION_KEY,
    OBJECT_TYPE_KEY,
    ROOT_SECTION_TITLE,
    TENANT_ID,
    _find_child_by_title,
    _safe_print,
    apply_isolation_plan_order,
)
from app.db.session import SessionLocal
from app.modules.portals.models import Portal  # noqa: F401
from app.modules.users.models import User  # noqa: F401
from app.modules.platform.runtime.entities.models import RuntimeEntity  # noqa: F401
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance  # noqa: F401
from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.plan_tree.root_anchor import get_or_create_plan_tree_root_anchor


def main() -> int:
    require_platform_data_write_approval(script_name=Path(__file__).name)
    db = SessionLocal()
    try:
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            TENANT_ID,
            OBJECT_TYPE_KEY,
        )
        relation_metadata = catalog_service.get_published_relation_metadata(
            db,
            TENANT_ID,
            HIERARCHY_RELATION_KEY,
        )
        title_field_key = metadata.title_field_key or "nazvanie"
        plan_anchor = get_or_create_plan_tree_root_anchor(
            db,
            TENANT_ID,
            metadata,
            HIERARCHY_RELATION_KEY,
        )
        root_id = _find_child_by_title(
            db,
            plan_anchor.id,
            title=ROOT_SECTION_TITLE,
            title_field_key=title_field_key,
        )
        if root_id is None:
            _safe_print(f"ERROR: section '{ROOT_SECTION_TITLE}' not found", file=sys.stderr)
            return 1

        apply_isolation_plan_order(
            db,
            root_id=root_id,
            title_field_key=title_field_key,
            relation_settings_json=relation_metadata.settings_json,
        )
        db.commit()
        _safe_print(f"Reordered plan tree under '{ROOT_SECTION_TITLE}' ({root_id})")
        return 0
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        _safe_print(f"FATAL: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
