from app.modules.ai_context.identity import (
    UNRESOLVED_IDENTITY_TYPE,
    IdentityContext,
    IdentityResolutionResult,
    resolve_identity,
)


def test_identity_module_imports():
    assert IdentityContext is not None
    assert IdentityResolutionResult is not None


def test_resolve_identity_exists():
    assert callable(resolve_identity)


def test_resolve_identity_returns_unresolved_stub():
    result = resolve_identity()
    assert isinstance(result, IdentityResolutionResult)
    assert result.identityType == UNRESOLVED_IDENTITY_TYPE
    assert result.userId is None
    assert result.tenantId is None
    assert result.roleKeys == ()


def test_resolve_identity_accepts_optional_context():
    context = IdentityContext(surfaceId="platform_dev")
    result = resolve_identity(context)
    assert result.identityType == UNRESOLVED_IDENTITY_TYPE
