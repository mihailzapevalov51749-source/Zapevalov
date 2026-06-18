"""Dry-run audit for runtime menu settings inheritance.

Reports tenants with designer menu settings but no tenant runtime menu settings,
and counts user_menu_preferences rows.

Usage (from backend/):
  python scripts/audit_runtime_menu_settings.py
"""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.platform.designer.system_menu_settings.models import DesignerSystemMenuSetting
from app.modules.platform.runtime.menu_settings.models import TenantRuntimeMenuSetting, UserMenuPreference
from app.modules.portals.models import Portal


def main() -> None:
    db = SessionLocal()
    try:
        tenants = db.query(Portal).order_by(Portal.id.asc()).all()
        print("Runtime menu settings audit (dry-run)")
        print("=" * 60)

        for tenant in tenants:
            runtime_count = (
                db.query(TenantRuntimeMenuSetting)
                .filter(TenantRuntimeMenuSetting.tenant_id == tenant.id)
                .count()
            )
            designer_count = (
                db.query(DesignerSystemMenuSetting)
                .filter(DesignerSystemMenuSetting.tenant_id == tenant.id)
                .count()
            )
            user_pref_count = (
                db.query(UserMenuPreference)
                .filter(UserMenuPreference.tenant_id == tenant.id)
                .count()
            )

            if runtime_count or designer_count or user_pref_count:
                print(
                    f"tenant {tenant.id} ({tenant.name!r}) "
                    f"runtime={runtime_count} designer={designer_count} user_prefs={user_pref_count}"
                )

        print("=" * 60)
        print("Note: legacy browser localStorage tenant menu settings are not in DB.")
        print("Admins should re-save runtime menu once after deploy, or run a future migration tool.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
