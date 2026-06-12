"""Ensure canonical tenant system roles exist in the roles table."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_roles.constants import (
    TENANT_ROLE_DESCRIPTIONS,
    TENANT_SYSTEM_ROLES,
)
from app.modules.users.models import Role


def ensure_tenant_system_roles(db: Session) -> dict[str, int]:
    role_ids: dict[str, int] = {}

    for role_name in TENANT_SYSTEM_ROLES:
        role = db.query(Role).filter(Role.name == role_name).one_or_none()
        if role is None:
            role = Role(
                name=role_name,
                description=TENANT_ROLE_DESCRIPTIONS.get(role_name),
            )
            db.add(role)
            db.flush()
        elif not role.description:
            role.description = TENANT_ROLE_DESCRIPTIONS.get(role_name)
            db.add(role)
            db.flush()

        role_ids[role_name] = role.id

    return role_ids


def resolve_tenant_role_id(db: Session, role_name: str) -> int:
    role_ids = ensure_tenant_system_roles(db)
    normalized = str(role_name or "").strip().lower()
    if normalized not in role_ids:
        raise ValueError(f"Unsupported tenant role: {role_name}")
    return role_ids[normalized]
