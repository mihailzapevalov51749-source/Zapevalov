"""Dry-run repair plan for runtime menu visibility (tenant 2 / any tenant).

Shows navigation items and what tenant/user settings would hide them.
Does NOT modify data unless --apply is passed (apply not implemented — report only).

Usage (from backend/):
  python scripts/repair_runtime_menu_visibility.py --tenant-id 2
"""

from __future__ import annotations

import argparse

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.platform.runtime.menu_settings.models import (
    TenantRuntimeMenuSetting,
    UserMenuPreference,
)


def _visible_label(is_visible: bool | None) -> str:
    if is_visible is True:
        return "visible"
    if is_visible is False:
        return "hidden"
    return "inherit"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", type=int, required=True)
    parser.add_argument("--user-id", type=int, default=None)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        tenant_id = args.tenant_id
        print(f"Runtime menu visibility dry-run for tenant {tenant_id}")
        print("=" * 72)

        nav_items = (
            db.query(NavigationItem)
            .filter(
                NavigationItem.portal_id == tenant_id,
                NavigationItem.deleted_at.is_(None),
                NavigationItem.menu_scope == "runtime",
                NavigationItem.parent_id.is_(None),
            )
            .order_by(NavigationItem.sort_order.asc(), NavigationItem.id.asc())
            .all()
        )

        tenant_settings = {
            row.item_key: row
            for row in db.query(TenantRuntimeMenuSetting)
            .filter(TenantRuntimeMenuSetting.tenant_id == tenant_id)
            .all()
        }

        user_prefs = {}
        if args.user_id is not None:
            user_prefs = {
                row.item_key: row
                for row in db.query(UserMenuPreference)
                .filter(
                    UserMenuPreference.tenant_id == tenant_id,
                    UserMenuPreference.user_id == args.user_id,
                )
                .all()
            }

        print(f"{'id':>6}  {'system_key':<24}  {'title':<22}  base  tenant  user  effective")
        print("-" * 72)

        for item in nav_items:
            key = str(item.system_key or f"nav:{item.id}")
            tenant_row = tenant_settings.get(key) or tenant_settings.get(f"nav:{item.id}")
            user_row = user_prefs.get(key) or user_prefs.get(f"nav:{item.id}")

            base_visible = item.is_visible is not False
            tenant_visible = (
                tenant_row.is_visible if tenant_row and tenant_row.is_visible is not None else None
            )
            user_hidden = user_row.is_hidden if user_row else None

            if tenant_visible is False:
                effective = False
            elif user_hidden is True:
                effective = False
            elif tenant_visible is True:
                effective = True
            else:
                effective = base_visible

            print(
                f"{item.id:>6}  {key:<24}  {str(item.title or ''):<22}  "
                f"{_visible_label(item.is_visible if item.is_visible is not None else None):<6}  "
                f"{_visible_label(tenant_visible):<6}  "
                f"{'hidden' if user_hidden else 'inherit':<6}  "
                f"{_visible_label(effective)}"
            )

        orphan_tenant = [
            key
            for key in tenant_settings
            if key not in {str(i.system_key or f"nav:{i.id}") for i in nav_items}
            and key not in {f"nav:{i.id}" for i in nav_items}
        ]
        if orphan_tenant:
            print("\nOrphan tenant_runtime_menu_settings keys:", ", ".join(sorted(orphan_tenant)))

        if args.user_id is not None:
            orphan_user = [
                key
                for key in user_prefs
                if key not in {str(i.system_key or f"nav:{i.id}") for i in nav_items}
                and key not in {f"nav:{i.id}" for i in nav_items}
            ]
            if orphan_user:
                print("Orphan user_menu_preferences keys:", ", ".join(sorted(orphan_user)))

        print("\nApply: NOT RUN (dry-run only). Fix visibility in UI or delete orphan rows manually.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
