"""YASII Knowledge Registry skeleton (P2-W01). DTO + stub only — no retrieval or storage."""

from pydantic import BaseModel, Field

KNOWLEDGE_REGISTRY_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "knowledge-registry-placeholder"
PLACEHOLDER_SOURCE_TYPE = "placeholder"
PLACEHOLDER_ENTRY_TYPE = "placeholder"


class KnowledgeRegistryContext(BaseModel):
    """Technical input placeholder for registry operations."""

    schemaVersion: str = Field(default=KNOWLEDGE_REGISTRY_SCHEMA_VERSION)
    registryId: str | None = None


class KnowledgeSource(BaseModel):
    """Technical knowledge source descriptor."""

    schemaVersion: str = Field(default=KNOWLEDGE_REGISTRY_SCHEMA_VERSION)
    sourceId: str
    sourceType: str = Field(default=PLACEHOLDER_SOURCE_TYPE)
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeEntry(BaseModel):
    """Technical knowledge entry placeholder."""

    schemaVersion: str = Field(default=KNOWLEDGE_REGISTRY_SCHEMA_VERSION)
    entryId: str
    entryType: str = Field(default=PLACEHOLDER_ENTRY_TYPE)
    sourceId: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeSnapshot(BaseModel):
    """Technical grouped knowledge view."""

    schemaVersion: str = Field(default=KNOWLEDGE_REGISTRY_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    entries: list[KnowledgeEntry] = Field(default_factory=list)
    createdAt: str | None = None


class KnowledgeRegistry:
    """Placeholder service container for future knowledge registry wiring."""

    schemaVersion: str = KNOWLEDGE_REGISTRY_SCHEMA_VERSION


def register_knowledge(
    context: KnowledgeRegistryContext | None = None,
    entry: KnowledgeEntry | None = None,
    source: KnowledgeSource | None = None,
) -> bool:
    """Stub: pretends to register knowledge without persisting anything."""
    _ = context
    _ = entry
    _ = source
    return True


def get_knowledge_snapshot(
    context: KnowledgeRegistryContext | None = None,
) -> KnowledgeSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return KnowledgeSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        entries=[],
    )
