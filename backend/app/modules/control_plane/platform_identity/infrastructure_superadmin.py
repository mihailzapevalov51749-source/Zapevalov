"""Infrastructure Superadmin resolution for Platform Owner in DEV/TEMPLATE (WI-18)."""

from __future__ import annotations

from app.core.environment_guard import ENVIRONMENT_MATRIX
from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER

INFRASTRUCTURE_ENVIRONMENT_KEYS = frozenset({"DEV", "TEMPLATE"})


def resolve_infrastructure_environment_key(
    *,
    environment_key: str | None = None,
    portal_id: int | None = None,
    database_name: str | None = None,
) -> str | None:
    """Resolve canonical infrastructure environment key (DEV or TEMPLATE)."""
    normalized_environment_key = str(environment_key or "").strip().upper()
    if normalized_environment_key in INFRASTRUCTURE_ENVIRONMENT_KEYS:
        return normalized_environment_key

    if portal_id is not None:
        portal_value = int(portal_id)
        for key in INFRASTRUCTURE_ENVIRONMENT_KEYS:
            expectation = ENVIRONMENT_MATRIX.get(key)
            if expectation is not None and expectation.portal_id == portal_value:
                return key

    normalized_database_name = str(database_name or "").strip().lower()
    if normalized_database_name:
        for key in INFRASTRUCTURE_ENVIRONMENT_KEYS:
            expectation = ENVIRONMENT_MATRIX.get(key)
            if (
                expectation is not None
                and expectation.database == normalized_database_name
            ):
                return key

    return None


def is_infrastructure_environment(
    *,
    environment_key: str | None = None,
    portal_id: int | None = None,
    database_name: str | None = None,
) -> bool:
    return (
        resolve_infrastructure_environment_key(
            environment_key=environment_key,
            portal_id=portal_id,
            database_name=database_name,
        )
        is not None
    )


def is_platform_owner_role(platform_role: str | None) -> bool:
    return str(platform_role or "").strip() == PLATFORM_ROLE_OWNER


def is_infrastructure_superadmin(
    *,
    platform_role: str | None,
    environment_key: str | None = None,
    portal_id: int | None = None,
    database_name: str | None = None,
) -> bool:
    if not is_platform_owner_role(platform_role):
        return False

    return is_infrastructure_environment(
        environment_key=environment_key,
        portal_id=portal_id,
        database_name=database_name,
    )
