"""YASII Dependency Graph skeleton (P3-W03). DTO + stub only — no resolution or traversal."""

from enum import Enum

from pydantic import BaseModel, Field

DEPENDENCY_GRAPH_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "dependency-graph-placeholder"
PLACEHOLDER_DEPENDENCY_TYPE = "DEPENDS_ON"


class DependencyGraphContext(BaseModel):
    """Technical input placeholder for dependency graph operations."""

    schemaVersion: str = Field(default=DEPENDENCY_GRAPH_SCHEMA_VERSION)
    dependencyId: str | None = None


class DependencyType(str, Enum):
    DEPENDS_ON = "DEPENDS_ON"
    BLOCKS = "BLOCKS"
    REQUIRES = "REQUIRES"
    INFLUENCES = "INFLUENCES"
    ENABLES = "ENABLES"
    PRECEDES = "PRECEDES"
    FOLLOWS = "FOLLOWS"


class DependencyRelation(BaseModel):
    """Technical dependency relation between graph nodes."""

    schemaVersion: str = Field(default=DEPENDENCY_GRAPH_SCHEMA_VERSION)
    relationId: str
    sourceNodeId: str
    targetNodeId: str
    dependencyType: str = Field(default=PLACEHOLDER_DEPENDENCY_TYPE)
    metadata: dict[str, str] = Field(default_factory=dict)


class DependencyGraphSnapshot(BaseModel):
    """Technical grouped view of dependency relations."""

    schemaVersion: str = Field(default=DEPENDENCY_GRAPH_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    relations: list[DependencyRelation] = Field(default_factory=list)
    createdAt: str | None = None


class DependencyGraphRegistry:
    """Placeholder service container for future dependency graph wiring."""

    schemaVersion: str = DEPENDENCY_GRAPH_SCHEMA_VERSION


def register_dependency(
    context: DependencyGraphContext | None = None,
    relation: DependencyRelation | None = None,
) -> bool:
    """Stub: pretends to register a dependency without persisting anything."""
    _ = context
    _ = relation
    return True


def get_dependency_snapshot(
    context: DependencyGraphContext | None = None,
) -> DependencyGraphSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return DependencyGraphSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        relations=[],
    )
