"""Audit navigation system_key items and run ensure."""

from __future__ import annotations

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.navigation.service import ensure_designer_system_items
from app.modules.platform.designer.workspaces.models import DesignerWorkspace
from app.modules.platform.designer.workspaces.service import publish_workspace_menu_placements
from app.modules.platform.designer.object_types.menu_placements.schemas import (
    DESIGNER_MENU_SCOPE,
    MenuPlacementInput,
)
from app.modules.portals.models import Portal
from app.modules.users.models import User  # noqa: F401


def main() -> None:
    db = SessionLocal()
    try:
        portal_ids = [
            row[0]
            for row in db.execute(
                text("SELECT id FROM portals ORDER BY id")
            ).all()
        ]

        rows = db.execute(
            text(
                """
                SELECT portal_id, system_key, menu_scope, COUNT(*) AS cnt
                FROM navigation_items
                WHERE deleted_at IS NULL
                  AND system_key IS NOT NULL
                  AND system_key <> ''
                GROUP BY portal_id, system_key, menu_scope
                ORDER BY portal_id, system_key
                """
            )
        ).mappings().all()

        dups = [r for r in rows if int(r["cnt"] or 0) > 1]
        print("PORTALS", portal_ids)
        print("TOTAL_KEYS", len(rows))
        print("DUPLICATES", len(dups))

        required = ("designer.objects", "designer.users", "designer.settings")
        for portal_id in portal_ids:
            missing = []
            for key in required:
                count = next(
                    (int(r["cnt"]) for r in rows if r["portal_id"] == portal_id and r["system_key"] == key),
                    0,
                )
                if count != 1:
                    missing.append((key, count))
            if missing:
                print("MISSING_OR_INVALID", portal_id, missing)

        print("---PRE_TABLE---")
        print("tenant\tsystem_key\tcount\tstatus")
        for r in rows:
            status = "ok" if int(r["cnt"] or 0) == 1 else "invalid"
            print(f"{r['portal_id']}\t{r['system_key']}\t{r['cnt']}\t{status}")

        for portal_id in portal_ids:
            ensure_designer_system_items(db, portal_id)

        for workspace in (
            db.query(DesignerWorkspace)
            .filter(DesignerWorkspace.deleted_at.is_(None))
            .order_by(DesignerWorkspace.tenant_id, DesignerWorkspace.slug)
            .all()
        ):
            publish_workspace_menu_placements(
                db,
                tenant_id=workspace.tenant_id,
                workspace_id=workspace.id,
                placements=[
                    MenuPlacementInput(
                        menu_scope=DESIGNER_MENU_SCOPE,
                        parent_id=None,
                        sort_order=workspace.sort_order,
                        is_visible=workspace.status == "active",
                    )
                ],
            )

        post_rows = db.execute(
            text(
                """
                SELECT portal_id, system_key, menu_scope, COUNT(*) AS cnt
                FROM navigation_items
                WHERE deleted_at IS NULL
                  AND system_key IS NOT NULL
                  AND system_key <> ''
                GROUP BY portal_id, system_key, menu_scope
                ORDER BY portal_id, system_key
                """
            )
        ).mappings().all()
        post_dups = sum(1 for r in post_rows if int(r["cnt"] or 0) > 1)
        post_invalid = sum(1 for r in post_rows if int(r["cnt"] or 0) != 1)
        print("POST_DUPLICATES", post_dups)
        print("POST_INVALID", post_invalid)
        print("---POST_TABLE---")
        for r in post_rows:
            status = "ok" if int(r["cnt"] or 0) == 1 else "invalid"
            print(f"{r['portal_id']}\t{r['system_key']}\t{r['cnt']}\t{status}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
