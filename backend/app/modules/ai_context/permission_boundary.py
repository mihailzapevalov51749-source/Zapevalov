"""ACE PermissionBoundary Builder skeleton (P1-W06). No RBAC, EffectiveScope, or YASII integration."""

from pydantic import BaseModel, Field

PERMISSION_BOUNDARY_SCHEMA_VERSION = "0.1.0"
EMPTY_BOUNDARY_TYPE = "empty"
PLACEHOLDER_BOUNDARY_ID = "boundary-placeholder"


class PermissionBoundaryBuildContext(BaseModel):
    """Technical input placeholder for future permission → boundary pipeline."""

    schemaVersion: str = Field(default=PERMISSION_BOUNDARY_SCHEMA_VERSION)
    identityType: str | None = None
    tenantId: str | None = None
    permissionKeys: list[str] = Field(default_factory=list)
    snapshotId: str | None = None
    boundaryId: str | None = None
    hostContextRef: str | None = None


class PermissionBoundaryResult(BaseModel):
    """Technical output placeholder; not a normative PermissionBoundary handoff."""

    schemaVersion: str = Field(default=PERMISSION_BOUNDARY_SCHEMA_VERSION)
    boundaryType: str = Field(default=EMPTY_BOUNDARY_TYPE)
    boundaryId: str = Field(default=PLACEHOLDER_BOUNDARY_ID)
    isBuilt: bool = False
    grantedPermissionKeys: list[str] = Field(default_factory=list)
    deniedPermissionKeys: list[str] = Field(default_factory=list)


def build_permission_boundary(
    context: PermissionBoundaryBuildContext | None = None,
) -> PermissionBoundaryResult:
    """Stub: builds runtime boundary envelope when boundaryId is supplied by ACE wiring."""
    if context and context.boundaryId:
        return PermissionBoundaryResult(
            boundaryType="runtime",
            boundaryId=context.boundaryId,
            isBuilt=True,
            grantedPermissionKeys=list(context.permissionKeys),
            deniedPermissionKeys=[],
        )
    return PermissionBoundaryResult(
        boundaryType=EMPTY_BOUNDARY_TYPE,
        boundaryId=PLACEHOLDER_BOUNDARY_ID,
        isBuilt=False,
        grantedPermissionKeys=[],
        deniedPermissionKeys=[],
    )
