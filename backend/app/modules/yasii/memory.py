"""YASII Memory Layer (P1-W12 skeleton + P8-W01 User Memory wiring)."""

from pydantic import BaseModel, Field

from app.modules.yasii.memory_graph import (
    MemoryGraphSnapshot,
    build_memory_graph_snapshot,
    link_memory_nodes as graph_link_memory_nodes,
    load_memory_graph as graph_load_memory_graph,
)
from app.modules.yasii.process_memory import (
    PROCESS_MEMORY_ENTRY_TYPE,
    PROCESS_MEMORY_SCHEMA_VERSION,
    ProcessMemoryLinkRequest,
    ProcessMemoryRuntimeUnavailableError,
    ProcessMemorySaveRequest,
    ProcessMemorySnapshot,
    ProcessDecisionLink,
    build_schema_process_memory_record,
    get_process_memory_repository,
)
from app.modules.yasii.decision_memory_store import (
    DECISION_STATUS_ACTIVE,
    list_decision_records,
)
from app.modules.yasii.tenant_memory_store import (
    TENANT_MEMORY_ENTRY_TYPE,
    TenantMemoryFact,
    delete_tenant_memory_facts,
    list_tenant_memory_facts,
    save_tenant_memory_fact,
)
from app.modules.yasii.user_memory_store import (
    USER_MEMORY_ENTRY_TYPE,
    USER_MEMORY_SCHEMA_VERSION,
    UserMemoryFact,
    delete_user_memory_facts,
    list_user_memory_facts,
    save_user_memory_fact,
)

MEMORY_SCHEMA_VERSION = USER_MEMORY_SCHEMA_VERSION
PLACEHOLDER_SNAPSHOT_ID = "memory-placeholder"
PLACEHOLDER_ENTRY_TYPE = "placeholder"


class MemoryContext(BaseModel):
    """Technical input for memory operations."""

    schemaVersion: str = Field(default=MEMORY_SCHEMA_VERSION)
    requestId: str | None = None
    memoryId: str | None = None
    tenantId: str | None = None
    userId: str | None = None
    sessionId: str | None = None
    processId: str | None = None
    instanceId: str | None = None


class MemoryEntry(BaseModel):
    """Memory entry DTO."""

    schemaVersion: str = Field(default=MEMORY_SCHEMA_VERSION)
    entryId: str
    entryType: str = Field(default=PLACEHOLDER_ENTRY_TYPE)
    text: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


class MemorySnapshot(BaseModel):
    """Grouped memory view."""

    schemaVersion: str = Field(default=MEMORY_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    entries: list[MemoryEntry] = Field(default_factory=list)
    createdAt: str | None = None


class MemoryLayer:
    """Memory subsystem container."""

    schemaVersion: str = MEMORY_SCHEMA_VERSION


def _user_scope(context: MemoryContext | None) -> tuple[str, str] | None:
    if context is None:
        return None
    user_id = str(context.userId or "").strip()
    if not user_id:
        return None
    tenant_id = str(context.tenantId or "").strip() or "default-tenant"
    return tenant_id, user_id


def save_memory(
    context: MemoryContext | None = None,
    entry: MemoryEntry | None = None,
) -> bool:
    """Persist user memory when scope and fact text are provided."""
    scope = _user_scope(context)
    if scope is None or entry is None:
        return True

    if entry.entryType != USER_MEMORY_ENTRY_TYPE:
        return True

    text = str(entry.text or entry.metadata.get("text") or "").strip()
    if not text:
        return False

    tenant_id, user_id = scope
    save_user_memory_fact(tenant_id, user_id, text)
    return True


def load_memory(context: MemoryContext | None = None) -> MemorySnapshot:
    """Load user memory snapshot for scoped context."""
    scope = _user_scope(context)
    if scope is None:
        return MemorySnapshot(snapshotId=PLACEHOLDER_SNAPSHOT_ID, entries=[])

    tenant_id, user_id = scope
    facts = list_user_memory_facts(tenant_id, user_id)
    entries = [
        MemoryEntry(
            entryId=fact.entryId,
            entryType=fact.entryType,
            text=fact.text,
            metadata={"createdAt": fact.createdAt},
        )
        for fact in facts
    ]
    return MemorySnapshot(
        snapshotId=f"user-memory-{tenant_id}-{user_id}",
        entries=entries,
    )


def delete_memory(context: MemoryContext | None = None, query_text: str = "") -> list[UserMemoryFact]:
    """Delete user memory facts matching query text."""
    scope = _user_scope(context)
    if scope is None:
        return []
    tenant_id, user_id = scope
    return delete_user_memory_facts(tenant_id, user_id, query_text)


def _tenant_scope(context: MemoryContext | None) -> str | None:
    if context is None:
        return None
    tenant_id = str(context.tenantId or "").strip()
    return tenant_id or None


def save_tenant_memory(
    context: MemoryContext | None = None,
    entry: MemoryEntry | None = None,
) -> bool:
    """Persist tenant memory when scope and fact text are provided."""
    tenant_id = _tenant_scope(context)
    if tenant_id is None or entry is None:
        return True

    if entry.entryType != TENANT_MEMORY_ENTRY_TYPE:
        return True

    text = str(entry.text or entry.metadata.get("text") or "").strip()
    if not text:
        return False

    save_tenant_memory_fact(tenant_id, text)
    return True


def load_tenant_memory(context: MemoryContext | None = None) -> MemorySnapshot:
    """Load tenant memory snapshot for scoped context."""
    tenant_id = _tenant_scope(context)
    if tenant_id is None:
        return MemorySnapshot(snapshotId=PLACEHOLDER_SNAPSHOT_ID, entries=[])

    facts = list_tenant_memory_facts(tenant_id)
    entries = [
        MemoryEntry(
            entryId=fact.entryId,
            entryType=fact.entryType,
            text=fact.text,
            metadata={"createdAt": fact.createdAt},
        )
        for fact in facts
    ]
    return MemorySnapshot(
        snapshotId=f"tenant-memory-{tenant_id}",
        entries=entries,
    )


def delete_tenant_memory(
    context: MemoryContext | None = None,
    query_text: str = "",
) -> list[TenantMemoryFact]:
    """Delete tenant memory facts matching query text."""
    tenant_id = _tenant_scope(context)
    if tenant_id is None:
        return []
    return delete_tenant_memory_facts(tenant_id, query_text)


def _session_scope(context: MemoryContext | None) -> tuple[str, str, str] | None:
    if context is None:
        return None
    tenant_id = str(context.tenantId or "").strip() or "default-tenant"
    user_id = str(context.userId or "").strip()
    session_id = str(context.sessionId or "").strip()
    if not user_id or not session_id:
        return None
    return tenant_id, user_id, session_id


def load_session_memory_snapshot(context: MemoryContext | None = None) -> MemorySnapshot:
    """Load session memory snapshot for scoped context."""
    scope = _session_scope(context)
    if scope is None:
        return MemorySnapshot(snapshotId=PLACEHOLDER_SNAPSHOT_ID, entries=[])

    from app.modules.yasii.session_memory_store import (
        SESSION_MEMORY_ENTRY_TYPE,
        load_session_memory,
    )

    tenant_id, user_id, session_id = scope
    state = load_session_memory(tenant_id, user_id, session_id)
    entries = [
        MemoryEntry(
            entryId=turn.turnId,
            entryType=SESSION_MEMORY_ENTRY_TYPE,
            text=turn.text,
            metadata={"role": turn.role, "createdAt": turn.createdAt},
        )
        for turn in state.turns
    ]
    return MemorySnapshot(
        snapshotId=f"session-memory-{tenant_id}-{user_id}-{session_id}",
        entries=entries,
    )


DECISION_MEMORY_ENTRY_TYPE = "decision"


def load_decision_memory(context: MemoryContext | None = None) -> MemorySnapshot:
    """Load active decision memory snapshot for tenant scope."""
    tenant_id = _tenant_scope(context)
    if tenant_id is None:
        return MemorySnapshot(snapshotId=PLACEHOLDER_SNAPSHOT_ID, entries=[])

    records = list_decision_records(tenant_id)
    entries = [
        MemoryEntry(
            entryId=record.decisionId,
            entryType=DECISION_MEMORY_ENTRY_TYPE,
            text=record.decisionText,
            metadata={
                "createdAt": record.createdAt,
                "status": record.status,
                "title": record.title,
            },
        )
        for record in records
        if record.status == DECISION_STATUS_ACTIVE
    ]
    return MemorySnapshot(
        snapshotId=f"decision-memory-{tenant_id}",
        entries=entries,
    )


def _process_scope(context: MemoryContext | None) -> tuple[str, str | None, str | None] | None:
    if context is None:
        return None
    tenant_id = str(context.tenantId or "").strip()
    if not tenant_id:
        return None
    process_id = str(context.processId or "").strip() or None
    instance_id = str(context.instanceId or "").strip() or None
    return tenant_id, process_id, instance_id


def load_process_memory(
    context: MemoryContext | None = None,
    *,
    host_payload: dict | None = None,
) -> ProcessMemorySnapshot:
    """Load process memory snapshot (schema-only until Process Runtime exists)."""
    scope = _process_scope(context)
    if scope is None:
        return ProcessMemorySnapshot()

    tenant_id, process_id, instance_id = scope
    repository = get_process_memory_repository()
    snapshot = repository.load_snapshot(
        tenant_id,
        process_id=process_id,
        instance_id=instance_id,
    )

    if host_payload:
        schema_record = build_schema_process_memory_record(tenant_id, host_payload)
        if schema_record is not None:
            snapshot = snapshot.model_copy(
                update={"records": [schema_record]},
            )
    return snapshot


def save_process_memory(
    context: MemoryContext | None = None,
    *,
    request: ProcessMemorySaveRequest | None = None,
) -> bool:
    """Persist process memory when Process Runtime is available."""
    scope = _process_scope(context)
    if scope is None or request is None:
        return False

    tenant_id, _, _ = scope
    if str(request.tenantId or "").strip() != tenant_id:
        return False

    try:
        get_process_memory_repository().save_record(request)
    except ProcessMemoryRuntimeUnavailableError:
        return False
    return True


def link_process_decision(
    context: MemoryContext | None = None,
    *,
    request: ProcessMemoryLinkRequest | None = None,
) -> ProcessDecisionLink | None:
    """Link Decision Memory to Process Memory when Process Runtime is available."""
    scope = _process_scope(context)
    if scope is None or request is None:
        return None

    tenant_id, _, _ = scope
    if str(request.tenantId or "").strip() != tenant_id:
        return None

    try:
        return get_process_memory_repository().link_decision(request)
    except ProcessMemoryRuntimeUnavailableError:
        return None


def load_process_memory_snapshot(
    context: MemoryContext | None = None,
    *,
    host_payload: dict | None = None,
) -> MemorySnapshot:
    """Expose process memory through generic MemorySnapshot entries."""
    scope = _process_scope(context)
    if scope is None:
        return MemorySnapshot(snapshotId=PLACEHOLDER_SNAPSHOT_ID, entries=[])

    tenant_id, _, _ = scope
    process_snapshot = load_process_memory(context, host_payload=host_payload)
    entries = [
        MemoryEntry(
            entryId=record.recordId,
            entryType=PROCESS_MEMORY_ENTRY_TYPE,
            text=record.definition.processName if record.definition else None,
            metadata={
                "schemaVersion": PROCESS_MEMORY_SCHEMA_VERSION,
                "processId": record.definition.processId if record.definition else "",
                "instanceId": record.instance.instanceId if record.instance else "",
                "runtimeAvailable": str(process_snapshot.runtimeAvailable).lower(),
            },
        )
        for record in process_snapshot.records
    ]
    return MemorySnapshot(
        snapshotId=process_snapshot.snapshotId,
        entries=entries,
    )


def load_memory_graph(context: MemoryContext | None = None) -> MemoryGraphSnapshot:
    """Load tenant memory graph snapshot."""
    tenant_id = _tenant_scope(context)
    if tenant_id is None:
        return MemoryGraphSnapshot()
    return graph_load_memory_graph(tenant_id)


def link_memory_nodes(
    context: MemoryContext | None = None,
    *,
    source_node_id: str,
    target_node_id: str,
    relation_type: str,
) -> bool:
    """Create a link between memory graph nodes."""
    tenant_id = _tenant_scope(context)
    if tenant_id is None:
        return False
    graph_link_memory_nodes(
        tenant_id,
        source_node_id=source_node_id,
        target_node_id=target_node_id,
        relation_type=relation_type,
    )
    return True


def build_memory_snapshot(
    context: MemoryContext | None = None,
    *,
    host_payload: dict | None = None,
) -> dict[str, object]:
    """Aggregate all memory layer snapshots including the memory graph."""
    tenant_id = _tenant_scope(context)
    graph_snapshot = build_memory_graph_snapshot(tenant_id) if tenant_id else MemoryGraphSnapshot()
    return {
        "user": load_memory(context),
        "tenant": load_tenant_memory(context),
        "session": load_session_memory_snapshot(context),
        "decision": load_decision_memory(context),
        "process": load_process_memory(context, host_payload=host_payload),
        "graph": graph_snapshot,
    }
