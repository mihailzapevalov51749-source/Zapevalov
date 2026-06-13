from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.ai_context.handoff import HandoffNotFoundError
from app.modules.ai_context.handoff_access import HandoffAccessDeniedError
from app.modules.auth.dependencies import get_current_user
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.users.models import User
from app.modules.yasii.constants import YASII_DEMO_ENABLED
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest, YASIIRequest, YASIIResponse
from app.modules.yasii.runtime_orchestrator import (
    orchestrate_embedded_request,
    orchestrate_runtime_request,
)
from app.modules.yasii.schemas import YasiiHealthResponse
from app.modules.yasii.service import get_yasii_health

router = APIRouter(
    prefix="/yasii",
    tags=["YASII"],
)


@router.get("/health", response_model=YasiiHealthResponse)
def yasii_health():
    return YasiiHealthResponse(**get_yasii_health())


@router.post("/tenants/{tenant_id}/query", response_model=YASIIResponse)
def yasii_query(
    request: YASIIRequest,
    tenant_id: int = Depends(require_tenant_membership),
    current_user: User = Depends(get_current_user),
) -> YASIIResponse:
    if not YASII_DEMO_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="YASII demo pipeline is disabled",
        )
    return orchestrate_runtime_request(
        request,
        tenant_id=tenant_id,
        user_id=current_user.id,
    )


@router.post("/tenants/{tenant_id}/embedded/query", response_model=YASIIResponse)
def yasii_embedded_query(
    request: YASIIEmbeddedQueryRequest,
    tenant_id: int = Depends(require_tenant_membership),
    current_user: User = Depends(get_current_user),
) -> YASIIResponse:
    if not YASII_DEMO_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="YASII demo pipeline is disabled",
        )

    handoff_id = str(request.handoffId or "").strip()
    if not handoff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="handoffId is required",
        )

    try:
        return orchestrate_embedded_request(
            request,
            tenant_id=tenant_id,
            user_id=current_user.id,
        )
    except HandoffNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="handoff not found",
        ) from exc
    except HandoffAccessDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="handoff access denied",
        ) from exc
