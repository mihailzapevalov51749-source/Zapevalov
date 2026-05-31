"""ACE HostContext → handoff runtime wiring (P7-W01)."""

from uuid import uuid4

from .context_snapshot import ContextSnapshotBuildContext, build_context_snapshot
from .handoff import ACEHandoff, register_handoff, role_ids_for_host
from .host_context import HostContext, validate_host_context
from .identity import IdentityContext, resolve_identity
from .permission_boundary import PermissionBoundaryBuildContext, build_permission_boundary
from .permission_resolution import PermissionResolutionContext, resolve_permissions


class HostContextValidationError(ValueError):
    """Mandatory HostContext fields are missing."""


def build_handoff_from_host_context(host: HostContext) -> ACEHandoff:
    """Run minimal ACE pipeline: identity → permission → boundary → snapshot → handoff."""
    warnings = validate_host_context(host)
    if warnings:
        raise HostContextValidationError("; ".join(warnings))

    host_ref = f"host-{uuid4().hex[:12]}"
    snapshot_id = f"snapshot-{uuid4().hex[:12]}"
    boundary_id = f"boundary-{uuid4().hex[:12]}"
    handoff_id = f"handoff-{uuid4().hex[:12]}"

    identity = resolve_identity(
        IdentityContext(
            surfaceId=host.hostSurface,
            hostContextRef=host_ref,
            userId=host.userId,
            tenantId=host.tenantId,
        ),
    )

    resolve_permissions(
        PermissionResolutionContext(
            identityType=identity.identityType,
            userId=identity.userId,
            tenantId=identity.tenantId,
            roleKeys=list(identity.roleKeys),
            surfaceId=host.hostSurface,
            hostContextRef=host_ref,
        ),
    )

    build_permission_boundary(
        PermissionBoundaryBuildContext(
            identityType=identity.identityType,
            tenantId=identity.tenantId,
            snapshotId=snapshot_id,
            boundaryId=boundary_id,
            hostContextRef=host_ref,
        ),
    )

    build_context_snapshot(
        ContextSnapshotBuildContext(
            surfaceId=host.hostSurface,
            hostContextRef=host_ref,
            identityType=identity.identityType,
            tenantId=identity.tenantId,
            snapshotId=snapshot_id,
            boundaryId=boundary_id,
            dashboardId=host.dashboardId,
            selectedScope=host.selectedScope,
            widgetId=host.widgetId,
            metadata=dict(host.metadata or {}),
        ),
    )

    handoff = ACEHandoff(
        handoffId=handoff_id,
        snapshotId=snapshot_id,
        boundaryId=boundary_id,
        roleIds=role_ids_for_host(host),
        warnings=warnings,
        hostSurface=host.hostSurface,
        dashboardId=host.dashboardId,
        selectedScope=host.selectedScope,
        widgetId=host.widgetId,
        tenantId=host.tenantId,
        userId=host.userId,
        metadata=dict(host.metadata or {}),
    )
    register_handoff(handoff)
    return handoff
