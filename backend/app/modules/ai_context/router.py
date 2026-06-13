from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.auth.dependencies import get_current_user
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.users.models import User
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
    current_user: User = Depends(get_current_user),
) -> ACEHandoffResponse:
    try:
        trusted_host = apply_server_identity_to_host_context(
            host,
            tenant_id=tenant_id,
            user_id=current_user.id,
        )
        handoff = build_handoff_from_host_context(
            trusted_host,
            tenant_id=tenant_id,
            user_id=current_user.id,
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
