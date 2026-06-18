"""Session Bridge FastAPI dependencies."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.principal.resolver import (
    get_current_principal,
)
from app.modules.control_plane.platform_identity.principal.types import (
    PlatformPrincipal,
    Principal,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    BridgeSessionJWTError,
    decode_bridge_session_token,
)

bridge_session_bearer = HTTPBearer(
    auto_error=True,
    scheme_name="BridgeSessionJWT",
    description="Bridge Session JWT (not login JWT)",
)


def require_platform_owner_principal(
    principal: Principal = Depends(get_current_principal),
) -> PlatformPrincipal:
    if not isinstance(principal, PlatformPrincipal):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуется PlatformPrincipal (platform_owner)",
        )
    if principal.platform_role != PLATFORM_ROLE_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуется роль platform_owner",
        )
    return principal


def get_current_bridge_principal(
    credentials: HTTPAuthorizationCredentials = Depends(bridge_session_bearer),
) -> BridgePrincipal:
    try:
        return decode_bridge_session_token(credentials.credentials)
    except BridgeSessionJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный Bridge Session JWT",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
