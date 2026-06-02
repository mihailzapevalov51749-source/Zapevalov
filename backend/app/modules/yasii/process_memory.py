"""Process Memory schema and storage contract (P8-W05 — schema only, no Process Runtime)."""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from uuid import uuid4

from pydantic import BaseModel, Field

PROCESS_MEMORY_SCHEMA_VERSION = "0.1.0"
PROCESS_MEMORY_ENTRY_TYPE = "process"
PROCESS_MEMORY_SNAPSHOT_PREFIX = "process-memory-schema"

PROCESS_INSTANCE_STATUS_DRAFT = "draft"
PROCESS_INSTANCE_STATUS_ACTIVE = "active"
PROCESS_INSTANCE_STATUS_COMPLETED = "completed"
PROCESS_INSTANCE_STATUS_CANCELLED = "cancelled"

PROCESS_STEP_STATUS_PENDING = "pending"
PROCESS_STEP_STATUS_ACTIVE = "active"
PROCESS_STEP_STATUS_COMPLETED = "completed"
PROCESS_STEP_STATUS_SKIPPED = "skipped"

PROCESS_DECISION_LINK_INFLUENCES = "influences"
PROCESS_DECISION_LINK_IMPLEMENTS = "implements"


class ProcessMemoryRuntimeUnavailableError(RuntimeError):
    """Raised when persistence is requested before Process Runtime exists."""


class ProcessDefinitionSnapshot(BaseModel):
    """Future-ready process definition snapshot."""

    processId: str
    processName: str
    processVersion: str = ""
    processOwner: str | None = None


class ProcessStepSnapshot(BaseModel):
    """Future-ready process step snapshot."""

    stepId: str
    stepName: str
    stepType: str = ""
    status: str = Field(default=PROCESS_STEP_STATUS_PENDING)


class ProcessInstanceSnapshot(BaseModel):
    """Future-ready process instance snapshot."""

    instanceId: str
    processId: str
    startedAt: str | None = None
    completedAt: str | None = None
    status: str = Field(default=PROCESS_INSTANCE_STATUS_DRAFT)
    steps: list[ProcessStepSnapshot] = Field(default_factory=list)


class ProcessDecisionLink(BaseModel):
    """Link between Decision Memory and Process Memory."""

    linkId: str
    decisionId: str
    processId: str
    instanceId: str | None = None
    linkType: str = Field(default=PROCESS_DECISION_LINK_INFLUENCES)
    note: str | None = None


class ProcessMemoryRecord(BaseModel):
    """Aggregated process memory record for a tenant scope."""

    recordId: str
    tenantId: str
    definition: ProcessDefinitionSnapshot | None = None
    instance: ProcessInstanceSnapshot | None = None
    decisionLinks: list[ProcessDecisionLink] = Field(default_factory=list)


class ProcessMemorySnapshot(BaseModel):
    """Grouped process memory view returned by the Memory Layer."""

    schemaVersion: str = Field(default=PROCESS_MEMORY_SCHEMA_VERSION)
    snapshotId: str = Field(default=f"{PROCESS_MEMORY_SNAPSHOT_PREFIX}-placeholder")
    records: list[ProcessMemoryRecord] = Field(default_factory=list)
    runtimeAvailable: bool = False


class ProcessMemorySaveRequest(BaseModel):
    """DTO for future process memory persistence."""

    tenantId: str
    definition: ProcessDefinitionSnapshot | None = None
    instance: ProcessInstanceSnapshot | None = None


class ProcessMemoryLinkRequest(BaseModel):
    """DTO for linking a decision record to a process scope."""

    tenantId: str
    decisionId: str
    processId: str
    instanceId: str | None = None
    linkType: str = Field(default=PROCESS_DECISION_LINK_INFLUENCES)
    note: str | None = None


@runtime_checkable
class ProcessMemoryStorageContract(Protocol):
    """Storage contract for Process Memory — implemented when Process Runtime ships."""

    def load_snapshot(
        self,
        tenant_id: str,
        *,
        process_id: str | None = None,
        instance_id: str | None = None,
    ) -> ProcessMemorySnapshot: ...

    def save_record(self, request: ProcessMemorySaveRequest) -> ProcessMemoryRecord: ...

    def link_decision(self, request: ProcessMemoryLinkRequest) -> ProcessDecisionLink: ...


class SchemaOnlyProcessMemoryRepository:
    """Empty schema-only repository until BPMN / Workflow / Process Runtime exists."""

    def load_snapshot(
        self,
        tenant_id: str,
        *,
        process_id: str | None = None,
        instance_id: str | None = None,
    ) -> ProcessMemorySnapshot:
        scope = str(tenant_id or "").strip() or "default-tenant"
        suffix = process_id or "schema"
        if instance_id:
            suffix = f"{suffix}-{instance_id}"
        return ProcessMemorySnapshot(
            snapshotId=f"{PROCESS_MEMORY_SNAPSHOT_PREFIX}-{scope}-{suffix}",
            records=[],
            runtimeAvailable=False,
        )

    def save_record(self, request: ProcessMemorySaveRequest) -> ProcessMemoryRecord:
        raise ProcessMemoryRuntimeUnavailableError(
            "Process Memory persistence is schema-only until Process Runtime is available.",
        )

    def link_decision(self, request: ProcessMemoryLinkRequest) -> ProcessDecisionLink:
        raise ProcessMemoryRuntimeUnavailableError(
            "Process Memory decision links are schema-only until Process Runtime is available.",
        )


_DEFAULT_REPOSITORY: ProcessMemoryStorageContract = SchemaOnlyProcessMemoryRepository()


def get_process_memory_repository() -> ProcessMemoryStorageContract:
    return _DEFAULT_REPOSITORY


def set_process_memory_repository(repository: ProcessMemoryStorageContract | None) -> None:
    global _DEFAULT_REPOSITORY
    if repository is None:
        _DEFAULT_REPOSITORY = SchemaOnlyProcessMemoryRepository()
        return
    _DEFAULT_REPOSITORY = repository


def definition_from_host_payload(payload: dict) -> ProcessDefinitionSnapshot | None:
    """Map HostContext process fields to a definition snapshot (read-only, not persisted)."""
    process_id = str(payload.get("processId") or "").strip()
    if not process_id:
        metadata = payload.get("processMetadata")
        if isinstance(metadata, dict):
            process_id = str(metadata.get("processId") or "").strip()
    if not process_id:
        return None

    process_name = str(payload.get("processName") or "").strip()
    metadata = payload.get("processMetadata")
    if isinstance(metadata, dict):
        if not process_name:
            process_name = str(metadata.get("processName") or "").strip()
        process_version = str(metadata.get("processVersion") or "").strip()
        process_owner = str(metadata.get("processOwner") or "").strip() or None
    else:
        process_version = ""
        process_owner = None

    return ProcessDefinitionSnapshot(
        processId=process_id,
        processName=process_name or process_id,
        processVersion=process_version,
        processOwner=process_owner,
    )


def instance_from_host_payload(payload: dict) -> ProcessInstanceSnapshot | None:
    """Map HostContext instance fields when a real instance id is present."""
    instance_id = str(payload.get("instanceId") or payload.get("processInstanceId") or "").strip()
    definition = definition_from_host_payload(payload)
    if not instance_id or definition is None:
        return None

    step_id = str(payload.get("activeStepId") or "").strip()
    step_name = str(payload.get("activeStepName") or "").strip()
    steps: list[ProcessStepSnapshot] = []
    if step_id or step_name:
        steps.append(
            ProcessStepSnapshot(
                stepId=step_id or "active-step",
                stepName=step_name or step_id or "active-step",
                stepType=str(payload.get("processType") or "").strip(),
                status=PROCESS_STEP_STATUS_ACTIVE,
            ),
        )

    return ProcessInstanceSnapshot(
        instanceId=instance_id,
        processId=definition.processId,
        status=str(payload.get("processStatus") or "").strip() or PROCESS_INSTANCE_STATUS_ACTIVE,
        steps=steps,
    )


def build_schema_process_memory_record(
    tenant_id: str,
    payload: dict,
) -> ProcessMemoryRecord | None:
    """Build an in-memory schema record from HostContext without persisting."""
    definition = definition_from_host_payload(payload)
    instance = instance_from_host_payload(payload)
    if definition is None and instance is None:
        return None

    return ProcessMemoryRecord(
        recordId=f"proc-schema-{uuid4().hex[:12]}",
        tenantId=str(tenant_id or "").strip() or "default-tenant",
        definition=definition,
        instance=instance,
        decisionLinks=[],
    )
