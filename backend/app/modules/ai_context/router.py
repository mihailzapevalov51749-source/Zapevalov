from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_actor,
    resolve_runtime_actor_user_id,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.yasii.tenant_context import apply_server_identity_to_host_context

from .handoff_service import HostContextValidationError, build_handoff_from_host_context
from .host_context import HostContext
from .schemas import ACEHandoffResponse, AiContextHealthResponse
from .service import get_ai_context_health

router = APIRouter(
    prefix="/ai-context",
    tags=["AI Context"],
)


@router.get("/health", response_model=AiContextHealthResponse)
def ai_context_health():
    return AiContextHealthResponse(**get_ai_context_health())


@router.post("/tenants/{tenant_id}/handoff", response_model=ACEHandoffResponse)
def ai_context_handoff(
    host: HostContext,
    tenant_id: int = Depends(require_tenant_membership),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
) -> ACEHandoffResponse:
    actor_user_id = resolve_runtime_actor_user_id(current_actor)
    try:
        trusted_host = apply_server_identity_to_host_context(
            host,
            tenant_id=tenant_id,
            user_id=actor_user_id,
        )
        handoff = build_handoff_from_host_context(
            trusted_host,
            tenant_id=tenant_id,
            user_id=actor_user_id,
        )
    except HostContextValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return ACEHandoffResponse(
        handoffId=handoff.handoffId,
        snapshotId=handoff.snapshotId,
        boundaryId=handoff.boundaryId,
        roleIds=handoff.roleIds,
        warnings=handoff.warnings,
    )
