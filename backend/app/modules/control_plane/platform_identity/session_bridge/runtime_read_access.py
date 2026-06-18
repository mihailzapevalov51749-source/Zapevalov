"""Bridge-aware read access for portal runtime shell (WI-09)."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    BridgeSessionJWTError,
    decode_bridge_session_token,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    optional_runtime_bearer,
    require_runtime_bearer_token,
    resolve_login_user,
)
from app.modules.platform.shared.dependencies import (
    _assert_tenant_exists_and_accessible,
)
from app.modules.portals.models import Portal
from app.modules.users.models import User


def _assert_portal_exists(db: Session, portal_id: int) -> None:
    portal = db.query(Portal).filter(Portal.id == portal_id).first()
    if not portal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant (portal) не найден",
        )


def require_portal_runtime_read(
    portal_id: Annotated[
        int,
        Path(
            ...,
            description="Идентификатор portal (tenant). Только path parameter.",
            ge=1,
        ),
    ],
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
) -> int:
    """Allow login membership or BridgePrincipal read for matching portal_id only."""
    token = require_runtime_bearer_token(credentials)

    try:
        bridge = decode_bridge_session_token(token)
        if int(bridge.portal_id) != int(portal_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bridge session не соответствует portal",
            )
        _assert_portal_exists(db, portal_id)
        return portal_id
    except BridgeSessionJWTError:
        pass

    user = resolve_login_user(db, token)
    _assert_tenant_exists_and_accessible(db, portal_id, user)
    return portal_id


def require_tenant_runtime_read(
    tenant_id: Annotated[
        int,
        Path(
            ...,
            description="Идентификатор tenant (portal). Только path parameter.",
            ge=1,
        ),
    ],
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
) -> int:
    """Allow login membership or BridgePrincipal read for matching tenant_id only."""
    return require_portal_runtime_read(
        portal_id=tenant_id,
        db=db,
        credentials=credentials,
    )


def is_bridge_session_token(token: str) -> bool:
    try:
        decode_bridge_session_token(str(token or "").strip())
        return True
    except BridgeSessionJWTError:
        return False
