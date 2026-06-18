"""Session Bridge client runtime endpoints (WI-07)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
    build_bridge_principal,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    create_bridge_session_token,
)
from app.modules.control_plane.platform_identity.session_bridge.dependencies import (
    get_current_bridge_principal,
)
from app.modules.control_plane.platform_identity.session_bridge.response_builders import (
    build_bridge_exchange_response,
    build_bridge_me_response,
)
from app.modules.control_plane.platform_identity.session_bridge.schemas import (
    BridgeExchangeRequest,
    BridgeExchangeResponse,
    BridgeMeResponse,
)
from app.modules.control_plane.platform_identity.session_bridge.validator import (
    validate_bridge_ticket,
)

router = APIRouter(prefix="/auth/session-bridge", tags=["Auth — Session Bridge"])


@router.post("/exchange", response_model=BridgeExchangeResponse)
def exchange_bridge_ticket(payload: BridgeExchangeRequest) -> BridgeExchangeResponse:
    result = validate_bridge_ticket(payload.bridge_ticket)
    if not result.is_valid or result.claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.status or "Недействительный bridge ticket",
        )

    principal = build_bridge_principal(result.claims)
    access_token = create_bridge_session_token(principal)
    return build_bridge_exchange_response(principal, access_token)


@router.get("/me", response_model=BridgeMeResponse)
def get_bridge_session_me(
    principal: BridgePrincipal = Depends(get_current_bridge_principal),
) -> BridgeMeResponse:
    return build_bridge_me_response(principal)
