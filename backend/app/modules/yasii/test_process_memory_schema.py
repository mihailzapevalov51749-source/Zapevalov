import pytest

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.memory import (
    MemoryContext,
    link_process_decision,
    load_process_memory,
    load_process_memory_snapshot,
    save_process_memory,
)
from app.modules.yasii.process_memory import (
    PROCESS_DECISION_LINK_IMPLEMENTS,
    PROCESS_MEMORY_SCHEMA_VERSION,
    ProcessDecisionLink,
    ProcessDefinitionSnapshot,
    ProcessInstanceSnapshot,
    ProcessMemoryLinkRequest,
    ProcessMemoryRecord,
    ProcessMemoryRuntimeUnavailableError,
    ProcessMemorySaveRequest,
    ProcessMemorySnapshot,
    ProcessStepSnapshot,
    SchemaOnlyProcessMemoryRepository,
    build_schema_process_memory_record,
    get_process_memory_repository,
    set_process_memory_repository,
)
from app.modules.yasii.runtime_demo_service import run_demo_pipeline


def test_process_memory_schema_models_exist():
    definition = ProcessDefinitionSnapshot(
        processId="wf-1",
        processName="Согласование",
        processVersion="2",
        processOwner="owner-1",
    )
    step = ProcessStepSnapshot(stepId="s1", stepName="Review", stepType="userTask")
    instance = ProcessInstanceSnapshot(
        instanceId="inst-1",
        processId="wf-1",
        status="active",
        steps=[step],
    )
    record = ProcessMemoryRecord(
        recordId="rec-1",
        tenantId="tenant-1",
        definition=definition,
        instance=instance,
    )

    assert record.definition.processName == "Согласование"
    assert record.instance.steps[0].stepName == "Review"


def test_schema_only_repository_is_empty_and_blocks_persistence():
    repo = SchemaOnlyProcessMemoryRepository()
    snapshot = repo.load_snapshot("tenant-1", process_id="wf-1")

    assert snapshot.records == []
    assert snapshot.runtimeAvailable is False
    assert snapshot.schemaVersion == PROCESS_MEMORY_SCHEMA_VERSION

    with pytest.raises(ProcessMemoryRuntimeUnavailableError):
        repo.save_record(
            ProcessMemorySaveRequest(
                tenantId="tenant-1",
                definition=ProcessDefinitionSnapshot(processId="wf-1", processName="Test"),
            ),
        )

    with pytest.raises(ProcessMemoryRuntimeUnavailableError):
        repo.link_decision(
            ProcessMemoryLinkRequest(
                tenantId="tenant-1",
                decisionId="dec-1",
                processId="wf-1",
                linkType=PROCESS_DECISION_LINK_IMPLEMENTS,
            ),
        )


def test_memory_layer_hooks_return_schema_only_results():
    context = MemoryContext(tenantId="tenant-1", processId="wf-42", instanceId="inst-9")
    snapshot = load_process_memory(context)

    assert isinstance(snapshot, ProcessMemorySnapshot)
    assert snapshot.runtimeAvailable is False
    assert save_process_memory(
        context,
        request=ProcessMemorySaveRequest(
            tenantId="tenant-1",
            definition=ProcessDefinitionSnapshot(processId="wf-42", processName="Demo"),
        ),
    ) is False
    assert link_process_decision(
        context,
        request=ProcessMemoryLinkRequest(
            tenantId="tenant-1",
            decisionId="dec-1",
            processId="wf-42",
        ),
    ) is None


def test_build_schema_record_from_host_payload_without_persistence():
    payload = {
        "tenantId": "tenant-1",
        "processId": "wf-42",
        "processName": "Согласование документации",
        "processMetadata": {"processVersion": "3", "processOwner": "Иванов"},
        "instanceId": "inst-7",
        "activeStepId": "review",
        "activeStepName": "Проверка",
        "processStatus": "active",
    }
    record = build_schema_process_memory_record("tenant-1", payload)

    assert record is not None
    assert record.definition.processId == "wf-42"
    assert record.instance.instanceId == "inst-7"
    assert record.instance.steps[0].stepId == "review"

    context = MemoryContext(tenantId="tenant-1", processId="wf-42", instanceId="inst-7")
    loaded = load_process_memory(context, host_payload=payload)
    assert len(loaded.records) == 1
    assert loaded.runtimeAvailable is False


def test_load_process_memory_snapshot_maps_to_memory_entries():
    context = MemoryContext(tenantId="tenant-1", processId="wf-1")
    payload = {"processId": "wf-1", "processName": "Demo process"}
    snapshot = load_process_memory_snapshot(context, host_payload=payload)

    assert snapshot.snapshotId.startswith("process-memory-schema")
    assert len(snapshot.entries) == 1
    assert snapshot.entries[0].entryType == "process"
    assert snapshot.entries[0].metadata.get("processId") == "wf-1"


def test_runtime_process_memory_hook_without_fake_runtime():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="process-schema-001",
            payload={
                "tenantId": "tenant-1",
                "userId": "user-1",
                "hostSurface": "process",
                "processId": "wf-42",
                "processName": "Согласование",
                "text": "Какой процесс открыт?",
            },
        ),
    )

    trace = response.payload.get("trace", [])
    assert "process_memory_loaded" in trace
    assert "Какой процесс" in response.payload.get("message", "") or response.payload.get("message")


def test_no_bpmn_runtime_modules_in_yasii_package():
    from pathlib import Path

    yasii_root = Path(__file__).resolve().parent
    forbidden_tokens = (
        "bpmn_engine",
        "workflow_runtime",
        "process_runtime_engine",
        "mock_bpmn",
        "fake_process_instance",
    )
    for path in yasii_root.glob("*.py"):
        if path.name == "test_process_memory_schema.py":
            continue
        text = path.read_text(encoding="utf-8").casefold()
        for token in forbidden_tokens:
            assert token not in text, f"forbidden token {token} in {path.name}"


def test_default_repository_is_schema_only():
    assert isinstance(get_process_memory_repository(), SchemaOnlyProcessMemoryRepository)
    set_process_memory_repository(None)
    assert isinstance(get_process_memory_repository(), SchemaOnlyProcessMemoryRepository)
