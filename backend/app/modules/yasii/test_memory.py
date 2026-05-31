import app.modules.yasii.memory  # noqa: F401

from app.modules.yasii.memory import (
    MEMORY_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    MemoryContext,
    MemoryEntry,
    MemoryLayer,
    MemorySnapshot,
    load_memory,
    save_memory,
)


def test_memory_module_imports():
    assert MemoryContext is not None
    assert MemoryEntry is not None
    assert MemorySnapshot is not None
    assert MemoryLayer is not None
    assert save_memory is not None
    assert load_memory is not None


def test_memory_context_defaults():
    context = MemoryContext()

    assert context.schemaVersion == MEMORY_SCHEMA_VERSION
    assert context.requestId is None
    assert context.memoryId is None


def test_memory_entry_fields():
    entry = MemoryEntry(entryId="entry-1", metadata={"role": "user"})

    assert entry.entryId == "entry-1"
    assert entry.entryType == "placeholder"
    assert entry.metadata == {"role": "user"}


def test_memory_snapshot_defaults():
    snapshot = MemorySnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.entries == []
    assert snapshot.createdAt is None


def test_memory_layer_placeholder():
    layer = MemoryLayer()

    assert layer.schemaVersion == MEMORY_SCHEMA_VERSION


def test_save_memory_returns_true_without_persistence():
    assert save_memory(MemoryContext(requestId="req-1"), MemoryEntry(entryId="e-1")) is True


def test_load_memory_returns_empty_snapshot():
    snapshot = load_memory(MemoryContext(memoryId="mem-1"))

    assert isinstance(snapshot, MemorySnapshot)
    assert snapshot.snapshotId == "memory-placeholder"
    assert snapshot.entries == []
