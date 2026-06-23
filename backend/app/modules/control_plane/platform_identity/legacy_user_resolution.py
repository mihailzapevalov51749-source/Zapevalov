"""Resolve legacy platform user id for a platform identity (activity linkage only)."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.constants import PLATFORM_IDENTITY_STATUS_ACTIVE
from app.modules.control_plane.platform_identity.models import PlatformIdentity
from app.modules.control_plane.platform_identity.platform_identity_store_session import (
    platform_identity_store_session,
)
from app.modules.control_plane.platform_identity.repository import normalize_email
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.users.bootstrap_owner_service import is_bootstrap_owner
from app.modules.users.models import User


def resolve_legacy_user_id_for_platform_identity(
    platform_identity_id: uuid.UUID,
    db: Session | None = None,
) -> int | None:
    """Map platform identity to legacy global users.id (no tenant user creation)."""

    def _lookup(session: Session) -> int | None:
        identity = session.get(PlatformIdentity, platform_identity_id)
        if identity is None or identity.status != PLATFORM_IDENTITY_STATUS_ACTIVE:
            return None

        settings = session.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
        if settings is not None and settings.platform_owner_user_id is not None:
            owner_user = session.get(User, settings.platform_owner_user_id)
            if (
                owner_user is not None
                and not is_bootstrap_owner(owner_user)
                and normalize_email(owner_user.email) == normalize_email(identity.email)
            ):
                return int(owner_user.id)

        user = (
            session.query(User)
            .filter(User.tenant_id.is_(None))
            .filter(User.email == identity.email)
            .order_by(User.id.asc())
            .first()
        )
        if user is not None and not is_bootstrap_owner(user):
            return int(user.id)
        return None

    if db is not None:
        return _lookup(db)

    with platform_identity_store_session() as session:
        return _lookup(session)
