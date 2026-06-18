"""Minimal cleanup for last archived test tenant leak (no structure)."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.platform_release.models import PlatformRelease
from app.modules.portals.models import Portal
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import User

TENANT_ID = 1052
PRESERVE_IDS = {1, 2, 21}
MARKERS = ("company_admin_", "existing_global", "invite_", "blocked_", "new_admin_", "dev_member_")


def _clear_user_references(db, user_ids: list[int]) -> None:
    if not user_ids:
        return

    nullable_deleted_by = (
        Page,
        NavigationItem,
        DesignerObjectType,
        DesignerFieldDefinition,
        DesignerRelationDefinition,
        DesignerViewDefinition,
        DesignerWorkspace,
        DesignerWorkspaceTab,
    )
    for model in nullable_deleted_by:
        db.query(model).filter(model.deleted_by.in_(user_ids)).update(
            {model.deleted_by: None},
            synchronize_session=False,
        )

    release_nullable_fields = (
        "created_by",
        "submitted_by",
        "review_started_by",
        "approved_by",
        "changes_requested_by",
        "published_by",
    )
    for field_name in release_nullable_fields:
        column = getattr(PlatformRelease, field_name)
        db.query(PlatformRelease).filter(column.in_(user_ids)).update(
            {field_name: None},
            synchronize_session=False,
        )


def _delete_or_detach_users(db, tenant_id: int) -> tuple[int, int]:
    deleted = 0
    detached = 0
    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    for user in users:
        _clear_user_references(db, [user.id])
        try:
            with db.begin_nested():
                db.delete(user)
                db.flush()
            deleted += 1
        except Exception:
            user.tenant_id = None
            user.is_company_owner = False
            db.add(user)
            detached += 1
    return deleted, detached


def main() -> int:
    if TENANT_ID in PRESERVE_IDS:
        print("Refusing to touch preserve list tenant")
        return 1

    db = SessionLocal()
    try:
        portal = db.get(Portal, TENANT_ID)
        if portal is None:
            print(f"Tenant {TENANT_ID} already absent")
            return 0

        print(
            f"target id={portal.id} name={portal.name!r} code={portal.code!r} "
            f"status={portal.tenant_status} protected={portal.is_protected}"
        )

        m = db.query(TenantUserMembership).filter(TenantUserMembership.tenant_id == TENANT_ID).delete()
        p = db.query(TenantUserProfile).filter(TenantUserProfile.tenant_id == TENANT_ID).delete()

        user_ids = [
            row.id
            for row in db.query(User.id).filter(User.tenant_id == TENANT_ID).all()
        ]
        _clear_user_references(db, user_ids)
        deleted_users, detached_users = _delete_or_detach_users(db, TENANT_ID)
        u = deleted_users
        db.query(Portal).filter(Portal.id == TENANT_ID).delete()
        db.flush()

        orphans = 0
        for user in (
            db.query(User)
            .outerjoin(TenantUserMembership, TenantUserMembership.user_id == User.id)
            .filter(TenantUserMembership.id.is_(None))
            .filter(User.email.ilike("%@example.com"))
            .all()
        ):
            email = str(user.email or "")
            if any(marker in email for marker in MARKERS):
                _clear_user_references(db, [user.id])
                db.delete(user)
                orphans += 1
                print(f"orphan removed id={user.id} email={email}")

        db.commit()
        print(f"deleted memberships={m} profiles={p} users_deleted={u} users_detached={detached_users} orphans={orphans}")

        remaining = db.query(Portal).order_by(Portal.id).all()
        print("remaining portals:")
        for row in remaining:
            print(f"  id={row.id} name={row.name!r} status={row.tenant_status}")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
