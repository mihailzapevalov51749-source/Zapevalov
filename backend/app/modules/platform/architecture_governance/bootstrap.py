"""Explicit FastAPI registration for Architecture Governance."""

from __future__ import annotations

from fastapi import FastAPI


def register_architecture_governance_routes(app: FastAPI) -> None:
    from app.modules.platform.architecture_governance.router import router as architecture_governance_router

    app.include_router(architecture_governance_router)
