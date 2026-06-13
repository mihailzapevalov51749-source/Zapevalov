"""Server-side tenant identity for YASII HTTP entry points."""

from fastapi import HTTPException, status

from app.modules.ai_context.host_context import HostContext


def parse_positive_int(value: object) -> int | None:
    try:
        parsed = int(str(value or "").strip())
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def assert_client_tenant_matches_path(
    client_tenant_id: object,
    tenant_id: int,
    *,
    field_name: str = "tenantId",
) -> None:
    parsed = parse_positive_int(client_tenant_id)
    if parsed is not None and parsed != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{field_name} does not match authenticated tenant",
        )


def apply_server_identity_to_host_context(
    host: HostContext,
    *,
    tenant_id: int,
    user_id: int,
) -> HostContext:
    assert_client_tenant_matches_path(host.tenantId, tenant_id)
    return host.model_copy(
        update={
            "tenantId": str(tenant_id),
            "userId": str(user_id),
        },
    )


def apply_server_identity_to_runtime_payload(
    payload: dict[str, object],
    *,
    tenant_id: int,
    user_id: int,
) -> dict[str, object]:
    next_payload = dict(payload or {})
    assert_client_tenant_matches_path(next_payload.get("tenantId"), tenant_id)
    next_payload["tenantId"] = str(tenant_id)
    next_payload["userId"] = str(user_id)
    return next_payload
