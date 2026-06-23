"""Bridge-aware runtime actor resolution for TEMPLATE portal APIs."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.legacy_user_resolution import (
    resolve_legacy_user_id_for_platform_identity,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_actor_ids import (
    resolve_bridge_actor_user_id,
)
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
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User

BRIDGE_ACTOR_USER_ID_OFFSET = -(2**30)  # re-export for tests


def resolve_runtime_actor_user_id(actor: RuntimeDesignerActor) -> int:
    if is_infrastructure_bridge_actor(actor):
        legacy_user_id = resolve_legacy_user_id_for_platform_identity(
            actor.bridge_principal.platform_identity_id,
        )
        if legacy_user_id is not None:
            return legacy_user_id
        return resolve_bridge_actor_user_id(actor.bridge_principal.platform_identity_id)
    user_id = getattr(actor, "id", None)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )
    return int(user_id)


def resolve_runtime_actor(
    db: Session,
    token: str,
) -> RuntimeDesignerActor:
    bridge_actor = try_resolve_infrastructure_bridge_actor(token)
    if bridge_actor is not None:
        return bridge_actor
    return resolve_login_user(db, token)


def assert_runtime_actor_has_tenant_access(
    db: Session,
    actor: RuntimeDesignerActor,
    tenant_id: int,
) -> int:
    normalized_tenant_id = int(tenant_id)
    if normalized_tenant_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Некорректный tenant_id",
        )

    if is_infrastructure_bridge_actor(actor):
        if not infrastructure_bridge_actor_matches_tenant(actor, normalized_tenant_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bridge session не соответствует portal",
            )
        return normalized_tenant_id

    if user_has_tenant_access(db, actor, normalized_tenant_id):
        return normalized_tenant_id

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа к компании",
    )


def require_runtime_actor(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
) -> RuntimeDesignerActor:
    token = require_runtime_bearer_token(credentials)
    return resolve_runtime_actor(db, token)


def require_runtime_tenant_actor(
    tenant_id: Annotated[int, Path(..., ge=1)],
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
) -> RuntimeDesignerActor:
    actor = require_runtime_actor(db=db, credentials=credentials)
    assert_runtime_actor_has_tenant_access(db, actor, tenant_id)
    return actor
