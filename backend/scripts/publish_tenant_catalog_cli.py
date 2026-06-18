#!/usr/bin/env python3
"""Publish tenant catalog through platform publish service (Studio-equivalent)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

# Register ORM metadata required for designer publish FK resolution.
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
from app.modules.tenant_management.exceptions import TenantWriteForbiddenError
from structure_write_script_guard import guard_script_structure_write


def main() -> int:
    tenant_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1

    db = SessionLocal()
    try:
        guard_script_structure_write(
            db,
            tenant_id,
            "publish_tenant_catalog_cli",
        )
        result = publish_tenant_catalog(db, tenant_id, current_user=None)
        db.commit()
        payload = {
            "tenant_id": tenant_id,
            "catalog_version": result.catalog_version,
            "schema_version": result.schema_version,
            "snapshot_id": str(result.snapshot_id),
            "published_at": result.published_at.isoformat(),
        }
        sys.stdout.buffer.write(
            json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        )
        sys.stdout.buffer.write(b"\n")
        return 0
    except TenantWriteForbiddenError as exc:
        db.rollback()
        print(f"Publish blocked by tenant write policy: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        db.rollback()
        print(f"Publish failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
