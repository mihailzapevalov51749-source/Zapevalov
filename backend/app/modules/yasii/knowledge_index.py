"""YASII Knowledge Index skeleton (P2-W04). DTO + stub only — no search or retrieval."""

from pydantic import BaseModel, Field

KNOWLEDGE_INDEX_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "knowledge-index-placeholder"
PLACEHOLDER_TIER = "REFERENCE"


class KnowledgeIndexContext(BaseModel):
    """Technical input placeholder for index build operations."""

    schemaVersion: str = Field(default=KNOWLEDGE_INDEX_SCHEMA_VERSION)
    indexId: str | None = None


class KnowledgeIndexRecord(BaseModel):
    """Technical index record linking entry, source, and tier."""

    schemaVersion: str = Field(default=KNOWLEDGE_INDEX_SCHEMA_VERSION)
    entryId: str
    sourceId: str | None = None
    tier: str = Field(default=PLACEHOLDER_TIER)
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeIndexSnapshot(BaseModel):
    """Technical grouped view of indexed knowledge records."""

    schemaVersion: str = Field(default=KNOWLEDGE_INDEX_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    records: list[KnowledgeIndexRecord] = Field(default_factory=list)
    createdAt: str | None = None


class KnowledgeIndex:
    """Placeholder service container for future knowledge index wiring."""

    schemaVersion: str = KNOWLEDGE_INDEX_SCHEMA_VERSION


def build_index(
    context: KnowledgeIndexContext | None = None,
    records: list[KnowledgeIndexRecord] | None = None,
) -> bool:
    """Stub: pretends to build an index without storing anything."""
    _ = context
    _ = records
    return True


def get_index_snapshot(
    context: KnowledgeIndexContext | None = None,
) -> KnowledgeIndexSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return KnowledgeIndexSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        records=[],
    )
