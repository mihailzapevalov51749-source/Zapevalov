"""Unified Platform Identity profile API (CP + TEMPLATE bridge)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.platform_auth_resolver import (
    resolve_platform_owner_store_match,
)
from app.modules.control_plane.platform_identity.profile_schemas import PlatformIdentityProfileRead
from app.modules.control_plane.platform_identity.profile_service import get_platform_identity_profile
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    optional_runtime_bearer,
    require_runtime_bearer_token,
    resolve_login_user,
    try_resolve_infrastructure_bridge_actor,
)
from app.modules.users.models import User

router = APIRouter(prefix="/platform-identity", tags=["Platform Identity"])


def resolve_authenticated_platform_identity_id(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
) -> uuid.UUID:
    token = require_runtime_bearer_token(credentials)

    bridge_actor = try_resolve_infrastructure_bridge_actor(token)
    if bridge_actor is not None:
        return bridge_actor.bridge_principal.platform_identity_id

    user: User = resolve_login_user(db, token)
    store_match = resolve_platform_owner_store_match(db, user)
    if store_match is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ к профилю Platform Identity запрещён",
        )
    return uuid.UUID(store_match.platform_identity_id)


@router.get("/me", response_model=PlatformIdentityProfileRead)
def get_platform_identity_me(
    platform_identity_id: uuid.UUID = Depends(resolve_authenticated_platform_identity_id),
) -> PlatformIdentityProfileRead:
    return get_platform_identity_profile(platform_identity_id)
