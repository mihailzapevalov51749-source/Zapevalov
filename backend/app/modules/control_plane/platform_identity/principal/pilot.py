"""Control Plane principal read-adoption pilot helpers (WI-04)."""

from __future__ import annotations

from fastapi import Response

from app.modules.control_plane.platform_identity.principal.audit import principal_audit
from app.modules.control_plane.platform_identity.principal.types import Principal

PRINCIPAL_TYPE_HEADER = "X-YasnoPro-Principal-Type"
PRINCIPAL_ID_HEADER = "X-YasnoPro-Principal-Id"
PRINCIPAL_ROLE_HEADER = "X-YasnoPro-Principal-Role"


def apply_principal_pilot_headers(response: Response, principal: Principal) -> None:
    """Attach non-breaking principal audit headers for pilot read endpoints."""
    audit = principal_audit(principal)
    response.headers[PRINCIPAL_TYPE_HEADER] = str(audit.get("actor_principal_type") or "")
    actor_id = audit.get("actor_principal_id")
    if actor_id is not None:
        response.headers[PRINCIPAL_ID_HEADER] = str(actor_id)

    platform_role = audit.get("actor_platform_role")
    role_key = audit.get("actor_role_key")
    role_value = platform_role or role_key
    if role_value:
        response.headers[PRINCIPAL_ROLE_HEADER] = str(role_value)
