"""Principal resolver and FastAPI dependency."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.control_plane.platform_identity.principal.factory import (
    PrincipalFactory,
)
from app.modules.control_plane.platform_identity.principal.types import Principal
from app.modules.users.models import User


def resolve_principal_from_user(db: Session, user: User) -> Principal:
    """Resolve principal for an authenticated user without touching JWT/login."""
    return PrincipalFactory.from_user(db, user)


def get_current_principal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Principal:
    """FastAPI dependency: JWT → get_current_user() → principal."""
    return resolve_principal_from_user(db, current_user)
