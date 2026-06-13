"""Caller-bound handoff validation for tenant isolation."""

from .handoff import ACEHandoff, HandoffNotFoundError, get_handoff


class HandoffAccessDeniedError(PermissionError):
    """Handoff exists but does not belong to the authenticated caller."""

    def __init__(self, handoff_id: str, reason: str) -> None:
        self.handoff_id = handoff_id
        self.reason = reason
        super().__init__(f"handoff access denied: {handoff_id} ({reason})")


def validate_handoff_for_caller(
    handoff_id: str,
    *,
    tenant_id: int,
    user_id: int,
) -> ACEHandoff:
    handoff = get_handoff(handoff_id)
    if handoff is None:
        raise HandoffNotFoundError(handoff_id)

    expected_tenant = str(tenant_id).strip()
    expected_user = str(user_id).strip()
    actual_tenant = str(handoff.tenantId or "").strip()
    actual_user = str(handoff.userId or "").strip()

    if actual_tenant != expected_tenant:
        raise HandoffAccessDeniedError(handoff_id, "tenant_mismatch")

    if actual_user != expected_user:
        raise HandoffAccessDeniedError(handoff_id, "user_mismatch")

    return handoff
