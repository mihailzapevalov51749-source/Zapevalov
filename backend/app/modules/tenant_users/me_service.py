"""Tenant-scoped current user profile (me) service."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.owner_service import get_platform_owner
from app.modules.tenant_users.constants import (
    ACTIVE_MEMBERSHIP_STATUSES,
    MEMBERSHIP_STATUS_ACTIVE,
)
from app.modules.tenant_users.identity_resolution import (
    IDENTITY_CONTEXT_PLATFORM_SERVICE,
    IDENTITY_CONTEXT_TENANT_MEMBER,
    PLATFORM_ADMIN_ROLE_LABEL,
    PLATFORM_ADMIN_SERVICE_DESCRIPTION,
    PLATFORM_OWNER_ROLE_LABEL,
    PLATFORM_OWNER_SERVICE_DESCRIPTION,
    has_platform_service_access,
    resolve_identity_context,
)
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.tenant_users.membership_service import get_tenant_membership
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.tenant_users.profile_service import (
    get_tenant_user_profile,
    profile_to_public_dict,
    update_tenant_user_profile,
)
from app.modules.users.bootstrap_owner_service import user_is_platform_owner
from app.modules.users.models import Role, User

TENANT_ME_PATCH_FIELDS = frozenset(
    {
        "display_name",
        "full_name",
        "phone",
        "position",
        "department",
        "city",
        "manager",
        "mentor",
        "avatar_url",
        "avatar_settings",
    }
)

PLATFORM_SERVICE_PATCH_FIELDS = frozenset(
    {
        "phone",
        "avatar_url",
        "avatar_settings",
    }
)


def _assert_tenant_access(db: Session, *, tenant_id: int, user: User) -> None:
    if user_is_platform_owner(db, user):
        return

    if user_has_tenant_access(db, user, tenant_id):
        return

    if has_platform_service_access(db, user):
        return

    raise HTTPException(
        status_code=403,
        detail="Нет доступа к компании",
    )


def _get_active_membership(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> TenantUserMembership | None:
    membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user_id)
    if membership is None or membership.membership_status not in ACTIVE_MEMBERSHIP_STATUSES:
        return None
    return membership


def serialize_tenant_me_user(
    db: Session,
    *,
    user: User,
    membership: TenantUserMembership,
    profile: TenantUserProfile | None,
) -> dict:
    profile_data = profile_to_public_dict(profile)
    role = db.query(Role).filter(Role.name == membership.role_key).one_or_none()

    return {
        "id": user.id,
        "email": user.email,
        "tenant_id": membership.tenant_id,
        **profile_data,
        "is_active": membership.membership_status == MEMBERSHIP_STATUS_ACTIVE,
        "membership_status": membership.membership_status,
        "role_id": role.id if role else user.role_id,
        "role": membership.role_key,
        "role_description": role.description if role else None,
        "is_company_owner": bool(getattr(user, "is_company_owner", False)),
        "identity_context": IDENTITY_CONTEXT_TENANT_MEMBER,
        "is_platform_owner": user_is_platform_owner(db, user),
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def serialize_platform_service_me_user(
    db: Session,
    *,
    user: User,
    tenant_id: int,
) -> dict:
    is_owner = user_is_platform_owner(db, user)

    if is_owner:
        row = (
            db.query(PlatformSettings)
            .filter(PlatformSettings.id == PLATFORM_SETTINGS_SINGLETON_ID)
            .one_or_none()
        )
        owner_profile = get_platform_owner(db, row) if row is not None else None
        full_name = owner_profile.full_name if owner_profile else user.full_name
        phone = owner_profile.phone if owner_profile else user.phone
        position = owner_profile.position if owner_profile else user.position
        avatar_url = owner_profile.avatar_url if owner_profile else user.avatar_url
        avatar_settings = (
            owner_profile.avatar_settings if owner_profile else user.avatar_settings
        )
        role_label = PLATFORM_OWNER_ROLE_LABEL
        role_description = PLATFORM_OWNER_SERVICE_DESCRIPTION
    else:
        full_name = user.full_name
        phone = user.phone
        position = user.position
        avatar_url = user.avatar_url
        avatar_settings = user.avatar_settings
        role_label = PLATFORM_ADMIN_ROLE_LABEL
        role_description = PLATFORM_ADMIN_SERVICE_DESCRIPTION

    return {
        "id": user.id,
        "email": user.email,
        "tenant_id": tenant_id,
        "display_name": full_name,
        "full_name": full_name,
        "phone": phone,
        "position": position,
        "department": None,
        "city": None,
        "manager": None,
        "mentor": None,
        "avatar_url": avatar_url,
        "avatar_settings": avatar_settings,
        "is_active": bool(user.is_active),
        "membership_status": None,
        "role_id": user.role_id,
        "role": role_label,
        "role_description": role_description,
        "is_company_owner": False,
        "identity_context": IDENTITY_CONTEXT_PLATFORM_SERVICE,
        "is_platform_owner": is_owner,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def get_tenant_me_user(
    db: Session,
    *,
    tenant_id: int,
    user: User,
) -> dict:
    _assert_tenant_access(db, tenant_id=tenant_id, user=user)

    membership = _get_active_membership(db, tenant_id=tenant_id, user_id=user.id)
    if membership is not None:
        profile = get_tenant_user_profile(db, tenant_id=tenant_id, user_id=user.id)
        return serialize_tenant_me_user(
            db,
            user=user,
            membership=membership,
            profile=profile,
        )

    if has_platform_service_access(db, user):
        return serialize_platform_service_me_user(db, user=user, tenant_id=tenant_id)

    raise HTTPException(
        status_code=403,
        detail="Нет доступа к компании",
    )


def _update_platform_service_profile(
    db: Session,
    *,
    user: User,
    payload: dict,
) -> User:
    for field, value in payload.items():
        if field in PLATFORM_SERVICE_PATCH_FIELDS:
            setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_tenant_me_user(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    payload: dict,
) -> dict:
    _assert_tenant_access(db, tenant_id=tenant_id, user=user)

    membership = _get_active_membership(db, tenant_id=tenant_id, user_id=user.id)
    if membership is not None:
        update_payload = {
            key: value for key, value in payload.items() if key in TENANT_ME_PATCH_FIELDS
        }
        if not update_payload:
            raise HTTPException(status_code=400, detail="Нет полей для обновления")

        profile = update_tenant_user_profile(
            db,
            tenant_id=tenant_id,
            user_id=user.id,
            payload=update_payload,
        )
        db.commit()
        db.refresh(profile)

        return serialize_tenant_me_user(
            db,
            user=user,
            membership=membership,
            profile=profile,
        )

    if has_platform_service_access(db, user):
        update_payload = {
            key: value for key, value in payload.items() if key in PLATFORM_SERVICE_PATCH_FIELDS
        }
        if not update_payload:
            raise HTTPException(status_code=400, detail="Нет полей для обновления")

        user = _update_platform_service_profile(db, user=user, payload=update_payload)
        return serialize_platform_service_me_user(db, user=user, tenant_id=tenant_id)

    raise HTTPException(
        status_code=403,
        detail="Нет доступа к компании",
    )


def resolve_tenant_me_identity_context(
    db: Session,
    *,
    tenant_id: int,
    user: User,
) -> str:
    membership = _get_active_membership(db, tenant_id=tenant_id, user_id=user.id)
    return resolve_identity_context(
        db,
        user=user,
        has_active_membership=membership is not None,
    )
