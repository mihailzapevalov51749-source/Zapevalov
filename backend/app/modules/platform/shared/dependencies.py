from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
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
from app.modules.portals.models import Portal
from app.modules.tenant_roles.access import user_can_access_designer
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User


def require_designer_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
) -> RuntimeDesignerActor:
    token = require_runtime_bearer_token(credentials)

    bridge_actor = try_resolve_infrastructure_bridge_actor(token)
    if bridge_actor is not None:
        return bridge_actor

    user = resolve_login_user(db, token)
    if not user_can_access_designer(db, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для Designer API",
        )

    return user


def _assert_tenant_exists_and_accessible(
    db: Session,
    tenant_id: int,
    current_user: User | InfrastructureBridgeDesignerActor,
) -> None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).first()

    if not portal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant (portal) не найден",
        )

    if is_infrastructure_bridge_actor(current_user):
        if not infrastructure_bridge_actor_matches_tenant(current_user, tenant_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bridge session не соответствует portal",
            )
        return

    if not user_has_tenant_access(db, current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к компании",
        )


def require_tenant(
    tenant_id: Annotated[
        int,
        Path(
            ...,
            description="Идентификатор tenant (portal). Только path parameter.",
            ge=1,
        ),
    ],
    db: Session = Depends(get_db),
) -> int:
    portal = db.query(Portal).filter(Portal.id == tenant_id).first()

    if not portal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant (portal) не найден",
        )

    return tenant_id


def require_tenant_membership(
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
    token = require_runtime_bearer_token(credentials)

    bridge_actor = try_resolve_infrastructure_bridge_actor(token)
    if bridge_actor is not None:
        _assert_tenant_exists_and_accessible(db, tenant_id, bridge_actor)
        return tenant_id

    user = resolve_login_user(db, token)
    _assert_tenant_exists_and_accessible(db, tenant_id, user)
    return tenant_id


def require_portal_membership(
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
    return require_tenant_membership(
        tenant_id=portal_id,
        db=db,
        credentials=credentials,
    )
