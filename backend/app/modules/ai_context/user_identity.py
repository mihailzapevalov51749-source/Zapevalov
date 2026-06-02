"""Platform user identity DTO for HostContext / ACE (YASII-IDENTITY-001)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class UserIdentity(BaseModel):
    """Read-only profile of the authenticated platform user (not User Memory)."""

    userId: str
    displayName: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None
    position: str | None = None
    department: str | None = None
    roles: list[str] = Field(default_factory=list)
    avatarUrl: str | None = None


def _split_full_name(full_name: str | None) -> tuple[str | None, str | None]:
    text = str(full_name or "").strip()
    if not text:
        return None, None
    parts = text.split()
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def user_identity_from_mapping(data: dict | None) -> UserIdentity | None:
    """Normalize frontend or API user profile mapping into UserIdentity."""
    if not isinstance(data, dict):
        return None

    user_id = str(data.get("userId") or data.get("id") or data.get("user_id") or "").strip()
    if not user_id:
        return None

    first_name = str(data.get("firstName") or data.get("first_name") or "").strip() or None
    last_name = str(data.get("lastName") or data.get("last_name") or "").strip() or None
    full_name = str(data.get("displayName") or data.get("full_name") or data.get("fullName") or "").strip()

    if not first_name and not last_name and full_name:
        first_name, last_name = _split_full_name(full_name)

    display_name = full_name or " ".join(part for part in (first_name, last_name) if part).strip() or None

    roles: list[str] = []
    raw_roles = data.get("roles")
    if isinstance(raw_roles, list):
        roles = [str(role).strip() for role in raw_roles if str(role).strip()]
    role_name = str(data.get("role") or data.get("role_name") or data.get("roleName") or "").strip()
    if role_name and role_name not in roles:
        roles.insert(0, role_name)

    return UserIdentity(
        userId=user_id,
        displayName=display_name,
        firstName=first_name,
        lastName=last_name,
        email=str(data.get("email") or "").strip() or None,
        position=str(data.get("position") or "").strip() or None,
        department=str(data.get("department") or "").strip() or None,
        roles=roles,
        avatarUrl=str(data.get("avatarUrl") or data.get("avatar_url") or "").strip() or None,
    )
