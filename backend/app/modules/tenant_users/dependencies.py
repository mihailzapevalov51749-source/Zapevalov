"""Dependencies for tenant administration APIs."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.bridge_designer_actor import (
    InfrastructureBridgeDesignerActor,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
    infrastructure_bridge_actor_matches_tenant,
    is_infrastructure_bridge_actor,
    optional_runtime_bearer,
    require_runtime_bearer_token,
    resolve_login_user,
    try_resolve_infrastructure_bridge_actor,
)
from app.modules.tenant_roles.access import user_can_manage_tenant_users_in_tenant
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User


def require_tenant_users_manager(
    tenant_id: int,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
) -> RuntimeDesignerActor:
    token = require_runtime_bearer_token(credentials)

    bridge_actor = try_resolve_infrastructure_bridge_actor(token)
    if bridge_actor is not None:
        if not infrastructure_bridge_actor_matches_tenant(bridge_actor, tenant_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bridge session не соответствует portal",
            )
        return bridge_actor

    current_user = resolve_login_user(db, token)
    if not user_has_tenant_access(db, current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к компании",
        )

    if not user_can_manage_tenant_users_in_tenant(db, current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав управления пользователями компании",
        )

    return current_user
