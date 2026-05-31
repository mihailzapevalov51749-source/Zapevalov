"""HostContext DTO — normative Host Surface → ACE intake (P7-W01)."""

from pydantic import BaseModel, Field

HOST_CONTEXT_SCHEMA_VERSION = "0.1.0"
DASHBOARD_HOST_SURFACE = "dashboard"


class HostContext(BaseModel):
    """Minimal HostContext contract for dashboard ACE intake."""

    schemaVersion: str = Field(default=HOST_CONTEXT_SCHEMA_VERSION)
    hostSurface: str
    tenantId: str
    userId: str
    sessionId: str
    timestamp: str
    dashboardId: str | None = None
    selectedScope: str | None = None
    widgetId: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


def validate_host_context(host: HostContext) -> list[str]:
    """Return validation warnings; empty list means mandatory fields are present."""
    warnings: list[str] = []
    for field_name in ("hostSurface", "tenantId", "userId", "sessionId", "timestamp"):
        if not str(getattr(host, field_name, "") or "").strip():
            warnings.append(f"missing_required:{field_name}")
    return warnings
