"""Resolve company database from Bridge Session JWT for CLIENT runtime."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.db.company_runtime import clear_request_database_name, set_request_database_name
from app.db.runtime_routing_validation import validate_bridge_runtime_routing
from app.db.session import SessionLocal
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    BridgeSessionJWTError,
    decode_bridge_session_token,
)

RUNTIME_ROUTING_DENIED_DETAIL = "Доступ к runtime компании запрещён"


@dataclass(frozen=True, slots=True)
class BridgeRuntimeRoutingDecision:
    kind: Literal["no_token", "not_bridge", "denied", "allowed"]
    database_name: str | None = None


def _extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization") or request.headers.get("Authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def resolve_bridge_runtime_routing(
    token: str,
    *,
    cp_db: Session | None = None,
) -> BridgeRuntimeRoutingDecision:
    try:
        principal = decode_bridge_session_token(token)
    except BridgeSessionJWTError:
        return BridgeRuntimeRoutingDecision(kind="not_bridge")

    owns_session = cp_db is None
    if cp_db is None:
        cp_db = SessionLocal()
    try:
        validation = validate_bridge_runtime_routing(
            cp_db,
            portal_id=int(principal.portal_id),
            jwt_database_name=str(principal.database_name),
        )
    finally:
        if owns_session:
            cp_db.close()

    if not validation.allowed:
        return BridgeRuntimeRoutingDecision(kind="denied")

    return BridgeRuntimeRoutingDecision(
        kind="allowed",
        database_name=validation.database_name,
    )


class CompanyRuntimeDatabaseMiddleware(BaseHTTPMiddleware):
    """Route CLIENT runtime reads/writes to per-company databases via bridge JWT."""

    async def dispatch(self, request: Request, call_next):
        app_env = (
            os.environ.get("YASNOPRO_ENV")
            or os.environ.get("APP_ENV")
            or os.environ.get("ENVIRONMENT")
            or ""
        ).strip().upper()
        if app_env not in {"CLIENT", "DEMO_CLIENT"}:
            return await call_next(request)

        token = _extract_bearer_token(request)
        if not token:
            return await call_next(request)

        decision = resolve_bridge_runtime_routing(token)
        if decision.kind == "denied":
            return JSONResponse(
                status_code=403,
                content={"detail": RUNTIME_ROUTING_DENIED_DETAIL},
            )
        if decision.kind == "allowed":
            set_request_database_name(decision.database_name)
        try:
            return await call_next(request)
        finally:
            clear_request_database_name()
