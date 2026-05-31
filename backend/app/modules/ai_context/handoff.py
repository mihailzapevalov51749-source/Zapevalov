"""ACE handoff DTO and in-memory registry (P7-W01 runtime slice)."""

from pydantic import BaseModel, Field

from .host_context import HostContext

HANDOFF_SCHEMA_VERSION = "0.1.0"

_HANDOFF_REGISTRY: dict[str, "ACEHandoff"] = {}


class ACEHandoff(BaseModel):
    """Immutable ACE envelope handed to YASII Runtime Entry."""

    schemaVersion: str = Field(default=HANDOFF_SCHEMA_VERSION)
    handoffId: str
    snapshotId: str
    boundaryId: str
    roleIds: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    hostSurface: str | None = None
    dashboardId: str | None = None
    selectedScope: str | None = None
    widgetId: str | None = None
    tenantId: str | None = None
    userId: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


def register_handoff(handoff: ACEHandoff) -> None:
    _HANDOFF_REGISTRY[handoff.handoffId] = handoff


def get_handoff(handoff_id: str) -> ACEHandoff | None:
    normalized = str(handoff_id or "").strip()
    if not normalized:
        return None
    return _HANDOFF_REGISTRY.get(normalized)


def clear_handoff_registry() -> None:
    """Test helper — reset in-memory handoff store."""
    _HANDOFF_REGISTRY.clear()


def validate_handoff(handoff_id: str) -> ACEHandoff:
    """Fail-closed lookup for embedded YASII entry."""
    handoff = get_handoff(handoff_id)
    if handoff is None:
        raise HandoffNotFoundError(handoff_id)
    return handoff


class HandoffNotFoundError(LookupError):
    """Raised when embedded query references an unknown handoff."""

    def __init__(self, handoff_id: str) -> None:
        self.handoff_id = handoff_id
        super().__init__(f"handoff not found: {handoff_id}")


def role_ids_for_host(host: HostContext) -> list[str]:
    dashboard_id = str(host.dashboardId or "").strip().lower()
    if dashboard_id == "owner":
        return ["yasii-owner-assistant"]
    return ["yasii-developer"]
