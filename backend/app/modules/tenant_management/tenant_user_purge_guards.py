"""Guards for tenant purge — protected users must not be hard-deleted."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_users.registry_service import is_platform_registry_user
from app.modules.tenant_roles.owner_service import get_company_owner
from app.modules.tenant_users.membership_service import user_has_other_active_memberships
from app.modules.users.bootstrap_owner_service import is_bootstrap_owner
from app.modules.users.models import User


def _is_protected_user(db: Session, user: User) -> bool:
    from app.modules.user_management.demo_user_inventory import is_protected_user

    return is_protected_user(db, user)


def is_protected_from_tenant_user_purge(db: Session, user: User) -> bool:
    if is_bootstrap_owner(user):
        return True
    if _is_protected_user(db, user):
        return True
    if is_platform_registry_user(db, user):
        return True

    settings = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings is not None:
        if settings.platform_owner_user_id is not None and settings.platform_owner_user_id == user.id:
            return True
        owner_email = str(settings.platform_owner_email or "").strip().lower()
        if owner_email and str(user.email or "").strip().lower() == owner_email:
            return True

    return False


def detach_user_from_tenant_scope(
    db: Session,
    *,
    tenant_id: int,
    user: User,
) -> None:
    """Safely detach a protected user from legacy tenant_id scope without deleting the row."""
    user_id = int(user.id)
    updates: dict[str, object] = {}

    if user.tenant_id == tenant_id:
        updates["tenant_id"] = None

    owner = get_company_owner(db, tenant_id)
    if owner is not None and int(owner.id) == user_id:
        updates["is_company_owner"] = False

    if not updates:
        return

    db.query(User).filter(User.id == user_id).update(updates, synchronize_session=False)
    db.expire(user)


def delete_or_detach_tenant_scoped_users(db: Session, tenant_id: int) -> tuple[int, int]:
    """Delete legacy tenant-scoped users; detach protected users instead of deleting."""
    deleted = 0
    detached = 0

    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    for user in users:
        if is_protected_from_tenant_user_purge(db, user):
            detach_user_from_tenant_scope(db, tenant_id=tenant_id, user=user)
            detached += 1
            continue

        if user_has_other_active_memberships(
            db,
            user_id=user.id,
            exclude_tenant_id=tenant_id,
        ):
            detach_user_from_tenant_scope(db, tenant_id=tenant_id, user=user)
            detached += 1
            continue

        db.delete(user)
        deleted += 1

    return deleted, detached
