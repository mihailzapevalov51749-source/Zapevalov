"""Platform Identity profile read service (single owner profile SoT)."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.constants import PLATFORM_IDENTITY_STATUS_ACTIVE
from app.modules.control_plane.platform_identity.legacy_user_resolution import (
    resolve_legacy_user_id_for_platform_identity,
)
from app.modules.control_plane.platform_identity.models import PlatformIdentity
from app.modules.control_plane.platform_identity.platform_identity_store_session import (
    platform_identity_store_session,
)
from app.modules.control_plane.platform_identity.profile_schemas import PlatformIdentityProfileRead
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.users.models import User


def serialize_platform_identity_profile(
    identity: PlatformIdentity,
    *,
    legacy_user_id: int | None = None,
) -> PlatformIdentityProfileRead:
    avatar_settings = identity.avatar_settings
    if legacy_user_id is not None:
        # Avatar settings may still live on legacy user row until full migration.
        pass

    return PlatformIdentityProfileRead(
        platform_identity_id=str(identity.platform_identity_id),
        full_name=identity.full_name,
        email=identity.email,
        phone=identity.phone,
        avatar_url=identity.avatar_url,
        avatar_settings=avatar_settings,
        status=identity.status,
        is_active=identity.status == PLATFORM_IDENTITY_STATUS_ACTIVE,
        legacy_user_id=legacy_user_id,
    )


def get_platform_identity_profile(
    platform_identity_id: uuid.UUID,
) -> PlatformIdentityProfileRead:
    with platform_identity_store_session() as db:
        identity = db.get(PlatformIdentity, platform_identity_id)
        if identity is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Platform identity не найден",
            )

        legacy_user_id = resolve_legacy_user_id_for_platform_identity(
            platform_identity_id,
            db,
        )
        avatar_settings = identity.avatar_settings
        if legacy_user_id is not None and avatar_settings is None:
            user = db.get(User, legacy_user_id)
            if user is not None and user.avatar_settings:
                avatar_settings = user.avatar_settings

        return serialize_platform_identity_profile(
            identity,
            legacy_user_id=legacy_user_id,
        ).model_copy(update={"avatar_settings": avatar_settings})
