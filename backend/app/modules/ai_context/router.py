from fastapi import APIRouter, HTTPException, status

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


@router.post("/handoff", response_model=ACEHandoffResponse)
def ai_context_handoff(host: HostContext) -> ACEHandoffResponse:
    try:
        handoff = build_handoff_from_host_context(host)
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
