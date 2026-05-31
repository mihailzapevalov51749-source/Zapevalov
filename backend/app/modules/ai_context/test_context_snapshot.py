from app.modules.ai_context.context_snapshot import (
    EMPTY_SNAPSHOT_TYPE,
    PLACEHOLDER_SNAPSHOT_ID,
    ContextSnapshotBuildContext,
    ContextSnapshotResult,
    build_context_snapshot,
)


def test_context_snapshot_module_imports():
    assert ContextSnapshotBuildContext is not None
    assert ContextSnapshotResult is not None


def test_context_snapshot_dto_creates():
    context = ContextSnapshotBuildContext(
        surfaceId="platform_dev",
        tenantId="tenant-stub",
    )
    assert context.surfaceId == "platform_dev"


def test_build_context_snapshot_exists():
    assert callable(build_context_snapshot)


def test_build_context_snapshot_returns_empty_stub():
    result = build_context_snapshot()
    assert isinstance(result, ContextSnapshotResult)
    assert result.snapshotType == EMPTY_SNAPSHOT_TYPE
    assert result.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert result.isBuilt is False
    assert result.metadata == {}


def test_build_context_snapshot_accepts_optional_context():
    context = ContextSnapshotBuildContext(hostContextRef="host-ref-stub")
    result = build_context_snapshot(context)
    assert result.snapshotType == EMPTY_SNAPSHOT_TYPE
    assert result.isBuilt is False
