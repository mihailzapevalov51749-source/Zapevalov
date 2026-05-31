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
