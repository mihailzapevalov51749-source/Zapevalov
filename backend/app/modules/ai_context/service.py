from .constants import (
    ARCHITECTURE_VERSION,
    MODULE_NAME,
    MODULE_VERSION,
    PHASE,
)


def get_ai_context_health() -> dict:
    return {
        "module": MODULE_NAME,
        "status": "ok",
        "phase": PHASE,
        "version": MODULE_VERSION,
        "architectureVersion": ARCHITECTURE_VERSION,
    }
