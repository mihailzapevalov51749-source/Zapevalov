"""ACE Permission Resolution skeleton (P1-W04). No RBAC, ACL, auth, or DB integration."""

from pydantic import BaseModel, Field

PERMISSION_SCHEMA_VERSION = "0.1.0"
UNRESOLVED_RESOLUTION_TYPE = "unresolved"


class PermissionResolutionContext(BaseModel):
    """Technical input placeholder for future identity → permission pipeline."""

    schemaVersion: str = Field(default=PERMISSION_SCHEMA_VERSION)
    identityType: str | None = None
    userId: str | None = None
    tenantId: str | None = None
    roleKeys: list[str] = Field(default_factory=list)
    surfaceId: str | None = None
    hostContextRef: str | None = None


class PermissionResolutionResult(BaseModel):
    """Technical output placeholder; not a resolved permission boundary input."""

    schemaVersion: str = Field(default=PERMISSION_SCHEMA_VERSION)
    resolutionType: str = Field(default=UNRESOLVED_RESOLUTION_TYPE)
    permissionKeys: list[str] = Field(default_factory=list)
    deniedPermissionKeys: list[str] = Field(default_factory=list)
    isResolved: bool = False


def resolve_permissions(
    context: PermissionResolutionContext | None = None,
) -> PermissionResolutionResult:
    """Stub: marks resolution complete when HostContext identity refs are present."""
    if context and context.userId and context.tenantId:
        return PermissionResolutionResult(
            resolutionType="resolved",
            permissionKeys=[],
            deniedPermissionKeys=[],
            isResolved=True,
        )
    return PermissionResolutionResult(
        resolutionType=UNRESOLVED_RESOLUTION_TYPE,
        permissionKeys=[],
        deniedPermissionKeys=[],
        isResolved=False,
    )
