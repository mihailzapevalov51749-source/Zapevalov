import app.modules.yasii.effective_scope  # noqa: F401

from app.modules.yasii.effective_scope import (
    EFFECTIVE_SCOPE_SCHEMA_VERSION,
    EMPTY_SCOPE_TYPE,
    PLACEHOLDER_SCOPE_ID,
    EffectiveScope,
    EffectiveScopeBuildContext,
    derive_effective_scope,
)


def test_effective_scope_module_imports():
    assert EffectiveScope is not None
    assert derive_effective_scope is not None


def test_effective_scope_build_context_defaults():
    context = EffectiveScopeBuildContext()

    assert context.schemaVersion == EFFECTIVE_SCOPE_SCHEMA_VERSION
    assert context.requestId is None
    assert context.identityType is None
    assert context.tenantId is None
    assert context.snapshotId is None
    assert context.boundaryId is None


def test_effective_scope_build_context_optional_fields():
    context = EffectiveScopeBuildContext(
        requestId="req-1",
        identityType="user",
        tenantId="tenant-a",
        snapshotId="snap-1",
        boundaryId="boundary-1",
    )

    assert context.requestId == "req-1"
    assert context.identityType == "user"
    assert context.tenantId == "tenant-a"
    assert context.snapshotId == "snap-1"
    assert context.boundaryId == "boundary-1"


def test_derive_effective_scope_returns_placeholder():
    scope = derive_effective_scope(EffectiveScopeBuildContext(requestId="req-2"))

    assert scope.schemaVersion == EFFECTIVE_SCOPE_SCHEMA_VERSION
    assert scope.scopeType == EMPTY_SCOPE_TYPE
    assert scope.scopeId == PLACEHOLDER_SCOPE_ID
    assert scope.isDerived is False
    assert scope.metadata == {}


def test_derive_effective_scope_without_context():
    scope = derive_effective_scope()

    assert scope.scopeType == "empty"
    assert scope.scopeId == "effective-scope-placeholder"
    assert scope.isDerived is False
