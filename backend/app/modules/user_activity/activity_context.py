"""Resolve activity DB session and user_id for runtime actors."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.legacy_user_resolution import (
    resolve_legacy_user_id_for_platform_identity,
)
from app.modules.control_plane.platform_identity.platform_identity_store_session import (
    open_platform_identity_store_session,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
    is_infrastructure_bridge_actor,
)


@dataclass(slots=True)
class UserActivityContext:
    db: Session
    user_id: int
    owns_db: bool = False


def resolve_user_activity_context(
    tenant_db: Session,
    actor: RuntimeDesignerActor,
) -> UserActivityContext:
    if is_infrastructure_bridge_actor(actor):
        identity_id = actor.bridge_principal.platform_identity_id
        catalog_db = open_platform_identity_store_session()
        legacy_user_id = resolve_legacy_user_id_for_platform_identity(
            identity_id,
            catalog_db,
        )
        if legacy_user_id is None:
            catalog_db.close()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Platform owner legacy user не найден для учёта активности",
            )
        return UserActivityContext(
            db=catalog_db,
            user_id=legacy_user_id,
            owns_db=True,
        )

    user_id = getattr(actor, "id", None)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )
    return UserActivityContext(db=tenant_db, user_id=int(user_id), owns_db=False)
