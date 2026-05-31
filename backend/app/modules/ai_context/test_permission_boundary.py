from app.modules.ai_context.permission_boundary import (
    EMPTY_BOUNDARY_TYPE,
    PLACEHOLDER_BOUNDARY_ID,
    PermissionBoundaryBuildContext,
    PermissionBoundaryResult,
    build_permission_boundary,
)


def test_permission_boundary_module_imports():
    assert PermissionBoundaryBuildContext is not None
    assert PermissionBoundaryResult is not None


def test_permission_boundary_dto_creates():
    context = PermissionBoundaryBuildContext(
        tenantId="tenant-stub",
        permissionKeys=["read"],
        snapshotId="snapshot-placeholder",
    )
    assert context.permissionKeys == ["read"]


def test_build_permission_boundary_exists():
    assert callable(build_permission_boundary)


def test_build_permission_boundary_returns_empty_stub():
    result = build_permission_boundary()
    assert isinstance(result, PermissionBoundaryResult)
    assert result.boundaryType == EMPTY_BOUNDARY_TYPE
    assert result.boundaryId == PLACEHOLDER_BOUNDARY_ID
    assert result.isBuilt is False
    assert result.grantedPermissionKeys == []
    assert result.deniedPermissionKeys == []


def test_build_permission_boundary_accepts_optional_context():
    context = PermissionBoundaryBuildContext(hostContextRef="host-ref-stub")
    result = build_permission_boundary(context)
    assert result.boundaryType == EMPTY_BOUNDARY_TYPE
    assert result.isBuilt is False
