"""Principal audit and debug helpers (backend-only)."""

from __future__ import annotations

from typing import Any

from app.modules.control_plane.platform_identity.principal.contract import PrincipalContract
from app.modules.control_plane.platform_identity.principal.types import (
    BridgePrincipal,
    PlatformPrincipal,
    Principal,
    SystemPrincipal,
    TenantPrincipal,
)


def who_am_i(principal: Principal) -> dict[str, Any]:
    """Compact principal summary for diagnostics."""
    if isinstance(principal, PlatformPrincipal):
        return {
            "kind": principal.principal_type,
            "platform_identity_id": str(principal.platform_identity_id),
            "platform_role": principal.platform_role,
            "email": principal.email,
        }
    if isinstance(principal, TenantPrincipal):
        return {
            "kind": principal.principal_type,
            "user_id": principal.user_id,
            "tenant_id": principal.tenant_id,
            "role_key": principal.role_key,
        }
    if isinstance(principal, SystemPrincipal):
        return {
            "kind": principal.principal_type,
            "system_actor": principal.system_actor,
        }
    if isinstance(principal, BridgePrincipal):
        return {
            "kind": principal.principal_type,
            "platform_identity_id": str(principal.platform_identity_id),
            "platform_role": principal.platform_role,
            "portal_id": principal.portal_id,
            "database_name": principal.database_name,
            "tenant_code": principal.tenant_code,
            "ticket_id": str(principal.ticket_id),
        }
    return {"kind": getattr(principal, "principal_type", "unknown")}


def principal_debug(principal: Principal) -> dict[str, Any]:
    """Extended principal payload for engineering diagnostics."""
    payload = principal.to_contract_dict()
    payload["who_am_i"] = who_am_i(principal)
    payload["contract_ok"] = isinstance(principal, PrincipalContract)
    return payload


def principal_audit(principal: Principal) -> dict[str, Any]:
    """Audit-safe principal snapshot (technical keys only, no secrets)."""
    contract = principal.to_contract_dict()
    return {
        "actor_principal_type": contract.get("principal_type"),
        "actor_principal_id": _audit_principal_id(principal),
        "actor_platform_role": contract.get("platform_role"),
        "actor_role_key": contract.get("role_key"),
        "actor_tenant_id": contract.get("tenant_id"),
        "contract": contract,
    }


def _audit_principal_id(principal: Principal) -> str | int | None:
    if isinstance(principal, PlatformPrincipal):
        return str(principal.platform_identity_id)
    if isinstance(principal, TenantPrincipal):
        return principal.user_id
    if isinstance(principal, SystemPrincipal):
        return principal.system_actor
    if isinstance(principal, BridgePrincipal):
        return str(principal.platform_identity_id)
    return None
