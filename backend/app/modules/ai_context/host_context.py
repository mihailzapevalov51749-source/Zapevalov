"""HostContext DTO — normative Host Surface → ACE intake (P7-W01)."""

from pydantic import BaseModel, Field

from app.modules.ai_context.user_identity import UserIdentity

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
    objectTypeId: str | None = None
    objectTypeName: str | None = None
    objectId: str | None = None
    objectTitle: str | None = None
    activeTab: str | None = None
    registryId: str | None = None
    registryName: str | None = None
    viewId: str | None = None
    viewName: str | None = None
    selectedCount: str | None = None
    activeFilters: str | None = None
    activeSorts: str | None = None
    searchQuery: str | None = None
    designerArea: str | None = None
    designerEntityType: str | None = None
    designerEntityId: str | None = None
    designerEntityName: str | None = None
    selectedNodeId: str | None = None
    selectedNodeName: str | None = None
    documentId: str | None = None
    documentName: str | None = None
    documentType: str | None = None
    documentLibraryId: str | None = None
    documentLibraryName: str | None = None
    processId: str | None = None
    processName: str | None = None
    processType: str | None = None
    processStatus: str | None = None
    activeStepId: str | None = None
    activeStepName: str | None = None
    userIdentity: UserIdentity | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


def validate_host_context(host: HostContext) -> list[str]:
    """Return validation warnings; empty list means mandatory fields are present."""
    warnings: list[str] = []
    for field_name in ("hostSurface", "tenantId", "userId", "sessionId", "timestamp"):
        if not str(getattr(host, field_name, "") or "").strip():
            warnings.append(f"missing_required:{field_name}")
    return warnings
