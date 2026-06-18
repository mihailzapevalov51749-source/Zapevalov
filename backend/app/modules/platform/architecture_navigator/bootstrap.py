"""Explicit FastAPI registration for Architecture Navigator."""

from __future__ import annotations

from fastapi import FastAPI


def register_architecture_navigator_routes(app: FastAPI) -> None:
    """Register DEV Architecture Navigator API under /dev/architecture."""
    from app.modules.platform.architecture_navigator.router import router as architecture_navigator_router

    app.include_router(architecture_navigator_router)
