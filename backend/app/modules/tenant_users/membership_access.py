from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_roles.access import is_platform_owner
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User


def list_active_tenant_memberships(db: Session, user_id: int) -> list[TenantUserMembership]:
    return (
        db.query(TenantUserMembership)
        .filter(TenantUserMembership.user_id == user_id)
        .filter(TenantUserMembership.is_active.is_(True))
        .order_by(TenantUserMembership.tenant_id.asc())
        .all()
    )


def user_has_tenant_access(db: Session, user: User, tenant_id: int) -> bool:
    normalized_tenant_id = int(tenant_id)
    if normalized_tenant_id <= 0:
        return False

    if is_platform_owner(user):
        return True

    user_tenant_id = getattr(user, "tenant_id", None)
    if user_tenant_id is not None and int(user_tenant_id) == normalized_tenant_id:
        return True

    membership = (
        db.query(TenantUserMembership.id)
        .filter(TenantUserMembership.user_id == user.id)
        .filter(TenantUserMembership.tenant_id == normalized_tenant_id)
        .filter(TenantUserMembership.is_active.is_(True))
        .first()
    )
    return membership is not None
