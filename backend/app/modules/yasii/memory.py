"""YASII Memory Layer skeleton (P1-W12). DTO + stub only — no persistence or retrieval."""

from pydantic import BaseModel, Field

MEMORY_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "memory-placeholder"
PLACEHOLDER_ENTRY_TYPE = "placeholder"


class MemoryContext(BaseModel):
    """Technical input placeholder for future memory operations."""

    schemaVersion: str = Field(default=MEMORY_SCHEMA_VERSION)
    requestId: str | None = None
    memoryId: str | None = None


class MemoryEntry(BaseModel):
    """Technical memory entry placeholder."""

    schemaVersion: str = Field(default=MEMORY_SCHEMA_VERSION)
    entryId: str
    entryType: str = Field(default=PLACEHOLDER_ENTRY_TYPE)
    metadata: dict[str, str] = Field(default_factory=dict)


class MemorySnapshot(BaseModel):
    """Technical grouped memory view."""

    schemaVersion: str = Field(default=MEMORY_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    entries: list[MemoryEntry] = Field(default_factory=list)
    createdAt: str | None = None


class MemoryLayer:
    """Placeholder container for future memory subsystem wiring."""

    schemaVersion: str = MEMORY_SCHEMA_VERSION


def save_memory(
    context: MemoryContext | None = None,
    entry: MemoryEntry | None = None,
) -> bool:
    """Stub: pretends to save without storing anything."""
    _ = context
    _ = entry
    return True


def load_memory(context: MemoryContext | None = None) -> MemorySnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return MemorySnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        entries=[],
    )
