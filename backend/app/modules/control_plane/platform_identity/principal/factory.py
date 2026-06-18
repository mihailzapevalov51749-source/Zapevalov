"""Principal factory: current_user → principal."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.platform_auth_resolver import (
    resolve_platform_owner_store_entities,
)
from app.modules.control_plane.platform_identity.principal.types import (
    PlatformPrincipal,
    Principal,
    SystemPrincipal,
    TenantPrincipal,
)
from app.modules.tenant_users.membership_service import get_tenant_membership
from app.modules.users.models import User

class PrincipalFactory:
    """Build principals from authenticated users or explicit system actors."""

    @staticmethod
    def from_user(db: Session, user: User) -> Principal:
        platform_principal = PrincipalFactory._try_build_platform_principal(db, user)
        if platform_principal is not None:
            return platform_principal
        return PrincipalFactory._build_tenant_principal(db, user)

    @staticmethod
    def from_system_actor(system_actor: str) -> SystemPrincipal:
        actor = str(system_actor or "").strip()
        if not actor:
            raise ValueError("system_actor is required")
        return SystemPrincipal(system_actor=actor)

    @staticmethod
    def _try_build_platform_principal(
        db: Session,
        user: User,
    ) -> PlatformPrincipal | None:
        store_entities = resolve_platform_owner_store_entities(db, user)
        if store_entities is None:
            return None

        identity, owner_binding, _credential = store_entities
        if owner_binding.platform_role != PLATFORM_ROLE_OWNER:
            return None

        return PlatformPrincipal(
            platform_identity_id=identity.platform_identity_id,
            platform_role=PLATFORM_ROLE_OWNER,
            email=identity.email,
            display_name=identity.full_name or user.full_name,
        )
    @staticmethod
    def _build_tenant_principal(db: Session, user: User) -> TenantPrincipal:
        role_key = PrincipalFactory._resolve_legacy_role_key(db, user)
        return TenantPrincipal(
            user_id=user.id,
            tenant_id=getattr(user, "tenant_id", None),
            role_key=role_key,
        )

    @staticmethod
    def _resolve_legacy_role_key(db: Session, user: User) -> str | None:
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id is not None:
            membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user.id)
            if membership is not None and membership.role_key:
                return membership.role_key

        if user.role is not None and user.role.name:
            return str(user.role.name)

        return None


def build_principal_from_user(db: Session, user: User) -> Principal:
    return PrincipalFactory.from_user(db, user)


def build_system_principal(system_actor: str) -> SystemPrincipal:
    return PrincipalFactory.from_system_actor(system_actor)
