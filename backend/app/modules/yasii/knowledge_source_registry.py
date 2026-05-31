"""YASII Knowledge Source Registry skeleton (P2-W02). DTO + stub only — no indexing or retrieval."""

from pydantic import BaseModel, Field

KNOWLEDGE_SOURCE_REGISTRY_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "knowledge-source-registry-placeholder"
PLACEHOLDER_SOURCE_TYPE = "placeholder"


class KnowledgeSourceRegistryContext(BaseModel):
    """Technical input placeholder for source registry operations."""

    schemaVersion: str = Field(default=KNOWLEDGE_SOURCE_REGISTRY_SCHEMA_VERSION)
    registryId: str | None = None


class KnowledgeSourceRecord(BaseModel):
    """Technical record describing where knowledge originates."""

    schemaVersion: str = Field(default=KNOWLEDGE_SOURCE_REGISTRY_SCHEMA_VERSION)
    sourceId: str
    sourceType: str = Field(default=PLACEHOLDER_SOURCE_TYPE)
    sourceName: str = ""
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeSourceSnapshot(BaseModel):
    """Technical grouped view of registered knowledge sources."""

    schemaVersion: str = Field(default=KNOWLEDGE_SOURCE_REGISTRY_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    sources: list[KnowledgeSourceRecord] = Field(default_factory=list)
    createdAt: str | None = None


class KnowledgeSourceRegistry:
    """Placeholder service container for future source catalog wiring."""

    schemaVersion: str = KNOWLEDGE_SOURCE_REGISTRY_SCHEMA_VERSION


def register_source(
    context: KnowledgeSourceRegistryContext | None = None,
    source: KnowledgeSourceRecord | None = None,
) -> bool:
    """Stub: pretends to register a source without persisting anything."""
    _ = context
    _ = source
    return True


def get_sources_snapshot(
    context: KnowledgeSourceRegistryContext | None = None,
) -> KnowledgeSourceSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return KnowledgeSourceSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        sources=[],
    )
