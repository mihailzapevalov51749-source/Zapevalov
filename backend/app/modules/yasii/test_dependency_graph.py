import app.modules.yasii.dependency_graph  # noqa: F401

from app.modules.yasii.dependency_graph import (
    DEPENDENCY_GRAPH_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    DependencyGraphContext,
    DependencyGraphRegistry,
    DependencyGraphSnapshot,
    DependencyRelation,
    DependencyType,
    get_dependency_snapshot,
    register_dependency,
)


def test_dependency_graph_module_imports():
    assert DependencyGraphRegistry is not None
    assert register_dependency is not None
    assert get_dependency_snapshot is not None


def test_dependency_type_values():
    assert DependencyType.DEPENDS_ON.value == "DEPENDS_ON"
    assert DependencyType.BLOCKS.value == "BLOCKS"
    assert DependencyType.REQUIRES.value == "REQUIRES"
    assert DependencyType.PRECEDES.value == "PRECEDES"


def test_dependency_graph_context_defaults():
    context = DependencyGraphContext()

    assert context.schemaVersion == DEPENDENCY_GRAPH_SCHEMA_VERSION
    assert context.dependencyId is None


def test_dependency_relation_fields():
    relation = DependencyRelation(
        relationId="rel-1",
        sourceNodeId="node-a",
        targetNodeId="node-b",
        dependencyType=DependencyType.BLOCKS.value,
        metadata={"scope": "phase-3"},
    )

    assert relation.relationId == "rel-1"
    assert relation.sourceNodeId == "node-a"
    assert relation.targetNodeId == "node-b"
    assert relation.dependencyType == "BLOCKS"
    assert relation.metadata == {"scope": "phase-3"}


def test_dependency_graph_snapshot_defaults():
    snapshot = DependencyGraphSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.relations == []
    assert snapshot.createdAt is None


def test_register_dependency_returns_true():
    assert (
        register_dependency(
            DependencyGraphContext(dependencyId="dep-ctx-1"),
            DependencyRelation(
                relationId="rel-1",
                sourceNodeId="node-a",
                targetNodeId="node-b",
                dependencyType=DependencyType.REQUIRES.value,
            ),
        )
        is True
    )


def test_get_dependency_snapshot_returns_empty_placeholder():
    snapshot = get_dependency_snapshot(DependencyGraphContext(dependencyId="dep-ctx-1"))

    assert isinstance(snapshot, DependencyGraphSnapshot)
    assert snapshot.snapshotId == "dependency-graph-placeholder"
    assert snapshot.relations == []
