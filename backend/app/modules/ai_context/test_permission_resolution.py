from app.modules.ai_context.permission_resolution import (
    UNRESOLVED_RESOLUTION_TYPE,
    PermissionResolutionContext,
    PermissionResolutionResult,
    resolve_permissions,
)


def test_permission_resolution_module_imports():
    assert PermissionResolutionContext is not None
    assert PermissionResolutionResult is not None


def test_permission_resolution_context_creates():
    context = PermissionResolutionContext(
        identityType="unresolved",
        roleKeys=["placeholder"],
        surfaceId="platform_dev",
    )
    assert context.roleKeys == ["placeholder"]


def test_resolve_permissions_exists():
    assert callable(resolve_permissions)


def test_resolve_permissions_returns_unresolved_stub():
    result = resolve_permissions()
    assert isinstance(result, PermissionResolutionResult)
    assert result.resolutionType == UNRESOLVED_RESOLUTION_TYPE
    assert result.permissionKeys == []
    assert result.deniedPermissionKeys == []
    assert result.isResolved is False


def test_resolve_permissions_accepts_optional_context():
    context = PermissionResolutionContext(tenantId="tenant-stub")
    result = resolve_permissions(context)
    assert result.resolutionType == UNRESOLVED_RESOLUTION_TYPE
    assert result.isResolved is False
