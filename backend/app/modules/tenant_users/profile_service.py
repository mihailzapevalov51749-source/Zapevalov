"""Tenant-scoped user profile helpers."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_users.models import TenantUserProfile
from app.modules.users.models import User


PROFILE_FIELDS = (
    "display_name",
    "phone",
    "position",
    "department",
    "city",
    "manager",
    "mentor",
    "avatar_url",
    "avatar_settings",
)


def _payload_to_profile_fields(payload: dict) -> dict:
    display_name = payload.get("display_name") or payload.get("full_name")
    return {
        "display_name": display_name,
        "phone": payload.get("phone"),
        "position": payload.get("position"),
        "department": payload.get("department"),
        "city": payload.get("city"),
        "manager": payload.get("manager"),
        "mentor": payload.get("mentor"),
        "avatar_url": payload.get("avatar_url"),
        "avatar_settings": payload.get("avatar_settings"),
    }


def get_tenant_user_profile(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> TenantUserProfile | None:
    return (
        db.query(TenantUserProfile)
        .filter(TenantUserProfile.tenant_id == tenant_id)
        .filter(TenantUserProfile.user_id == user_id)
        .one_or_none()
    )


def ensure_tenant_user_profile(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    payload: dict | None = None,
) -> TenantUserProfile:
    profile = get_tenant_user_profile(db, tenant_id=tenant_id, user_id=user.id)
    fields = _payload_to_profile_fields(payload or {})

    if profile is None:
        profile = TenantUserProfile(
            tenant_id=tenant_id,
            user_id=user.id,
            **{key: fields.get(key) for key in PROFILE_FIELDS},
        )
        db.add(profile)
        db.flush()
        return profile

    for key in PROFILE_FIELDS:
        if key in (payload or {}) or (key == "display_name" and "full_name" in (payload or {})):
            setattr(profile, key, fields.get(key))

    db.add(profile)
    db.flush()
    return profile


def update_tenant_user_profile(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    payload: dict,
) -> TenantUserProfile:
    profile = ensure_tenant_user_profile(
        db,
        tenant_id=tenant_id,
        user=db.query(User).filter(User.id == user_id).one(),
        payload=payload,
    )
    db.add(profile)
    return profile


def profile_to_public_dict(profile: TenantUserProfile | None) -> dict:
    if profile is None:
        return {
            "display_name": None,
            "full_name": None,
            "phone": None,
            "position": None,
            "department": None,
            "city": None,
            "manager": None,
            "mentor": None,
            "avatar_url": None,
            "avatar_settings": None,
        }

    return {
        "display_name": profile.display_name,
        "full_name": profile.display_name,
        "phone": profile.phone,
        "position": profile.position,
        "department": profile.department,
        "city": profile.city,
        "manager": profile.manager,
        "mentor": profile.mentor,
        "avatar_url": profile.avatar_url,
        "avatar_settings": profile.avatar_settings,
    }
