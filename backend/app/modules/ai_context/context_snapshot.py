"""ACE ContextSnapshot Builder skeleton (P1-W05). No HostContext, DB, or YASII integration."""

from pydantic import BaseModel, Field

CONTEXT_SNAPSHOT_SCHEMA_VERSION = "0.1.0"
EMPTY_SNAPSHOT_TYPE = "empty"
PLACEHOLDER_SNAPSHOT_ID = "snapshot-placeholder"


class ContextSnapshotBuildContext(BaseModel):
    """Technical input placeholder for future HostContext → snapshot pipeline."""

    schemaVersion: str = Field(default=CONTEXT_SNAPSHOT_SCHEMA_VERSION)
    surfaceId: str | None = None
    hostContextRef: str | None = None
    identityType: str | None = None
    tenantId: str | None = None
    snapshotId: str | None = None
    boundaryId: str | None = None
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
    metadata: dict[str, str] = Field(default_factory=dict)


class ContextSnapshotResult(BaseModel):
    """Technical output placeholder; not a normative ContextSnapshot."""

    schemaVersion: str = Field(default=CONTEXT_SNAPSHOT_SCHEMA_VERSION)
    snapshotType: str = Field(default=EMPTY_SNAPSHOT_TYPE)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    isBuilt: bool = False
    metadata: dict[str, str] = Field(default_factory=dict)


def build_context_snapshot(
    context: ContextSnapshotBuildContext | None = None,
) -> ContextSnapshotResult:
    """Stub: builds runtime snapshot envelope when snapshotId is supplied by ACE wiring."""
    if context and context.snapshotId:
        metadata: dict[str, str] = {}
        if context.surfaceId:
            metadata["hostSurface"] = context.surfaceId
        if context.dashboardId:
            metadata["dashboardId"] = context.dashboardId
        if context.selectedScope:
            metadata["selectedScope"] = context.selectedScope
        if context.widgetId:
            metadata["widgetId"] = context.widgetId
        if context.objectTypeId:
            metadata["objectTypeId"] = context.objectTypeId
        if context.objectTypeName:
            metadata["objectTypeName"] = context.objectTypeName
        if context.objectId:
            metadata["objectId"] = context.objectId
        if context.objectTitle:
            metadata["objectTitle"] = context.objectTitle
        if context.activeTab:
            metadata["activeTab"] = context.activeTab
        if context.registryId:
            metadata["registryId"] = context.registryId
        if context.registryName:
            metadata["registryName"] = context.registryName
        if context.viewId:
            metadata["viewId"] = context.viewId
        if context.viewName:
            metadata["viewName"] = context.viewName
        if context.selectedCount:
            metadata["selectedCount"] = context.selectedCount
        if context.activeFilters:
            metadata["activeFilters"] = context.activeFilters
        if context.activeSorts:
            metadata["activeSorts"] = context.activeSorts
        if context.searchQuery:
            metadata["searchQuery"] = context.searchQuery
        if context.boundaryId:
            metadata["permissionBoundaryRef"] = context.boundaryId
        for key, value in (context.metadata or {}).items():
            normalized_key = str(key).strip()
            normalized_value = str(value).strip()
            if normalized_key and normalized_value:
                metadata[normalized_key] = normalized_value
        return ContextSnapshotResult(
            snapshotType="runtime",
            snapshotId=context.snapshotId,
            isBuilt=True,
            metadata=metadata,
        )
    return ContextSnapshotResult(
        snapshotType=EMPTY_SNAPSHOT_TYPE,
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        isBuilt=False,
        metadata={},
    )
