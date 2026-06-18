"""Shared runtime auth helpers for login JWT and Bridge Session JWT."""

from __future__ import annotations

from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.modules.auth.security import ALGORITHM, SECRET_KEY
from app.modules.control_plane.platform_identity.infrastructure_superadmin import (
    is_infrastructure_superadmin,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_designer_actor import (
    InfrastructureBridgeDesignerActor,
    build_infrastructure_bridge_designer_actor,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    BridgeSessionJWTError,
    decode_bridge_session_token,
)
from app.modules.users.bootstrap_owner_service import attach_platform_owner_flag
from app.modules.users.models import User

optional_runtime_bearer = HTTPBearer(auto_error=False)

RuntimeDesignerActor = User | InfrastructureBridgeDesignerActor


def require_runtime_bearer_token(
    credentials: HTTPAuthorizationCredentials | None,
) -> str:
    if credentials is None or not str(credentials.credentials or "").strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return str(credentials.credentials).strip()


def try_decode_bridge_principal(token: str) -> BridgePrincipal | None:
    try:
        return decode_bridge_session_token(token)
    except BridgeSessionJWTError:
        return None


def bridge_principal_is_infrastructure_superadmin(
    principal: BridgePrincipal,
) -> bool:
    return is_infrastructure_superadmin(
        platform_role=principal.platform_role,
        environment_key=principal.environment_key,
        portal_id=principal.portal_id,
        database_name=principal.database_name,
    )


def resolve_login_user(db: Session, token: str) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Не удалось определить пользователя",
            )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен",
        ) from exc

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь отключен",
        )
    return attach_platform_owner_flag(db, user)


def is_infrastructure_bridge_actor(
    actor: RuntimeDesignerActor | None,
) -> bool:
    return isinstance(actor, InfrastructureBridgeDesignerActor)


def infrastructure_bridge_actor_matches_tenant(
    actor: InfrastructureBridgeDesignerActor,
    tenant_id: int,
) -> bool:
    return int(actor.bridge_principal.portal_id) == int(tenant_id)


def try_resolve_infrastructure_bridge_actor(
    token: str,
) -> InfrastructureBridgeDesignerActor | None:
    principal = try_decode_bridge_principal(token)
    if principal is None:
        return None
    if not bridge_principal_is_infrastructure_superadmin(principal):
        return None
    return build_infrastructure_bridge_designer_actor(principal)
