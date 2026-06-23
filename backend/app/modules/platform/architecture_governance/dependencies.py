"""FastAPI dependencies for Architecture Governance (DEV-only)."""

from app.modules.platform.architecture_navigator.dependencies import (
    require_architecture_navigator_access as require_architecture_governance_access,
)

__all__ = ["require_architecture_governance_access"]
