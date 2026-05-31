import app.modules.yasii.runtime_orchestrator  # noqa: F401

from app.modules.yasii.runtime_orchestrator import (
    PLACEHOLDER_ORCHESTRATION_ID,
    PLACEHOLDER_ORCHESTRATION_STATUS,
    PLACEHOLDER_ORCHESTRATION_TYPE,
    RUNTIME_ORCHESTRATOR_SCHEMA_VERSION,
    RuntimeOrchestrator,
    RuntimeOrchestratorContext,
    RuntimeOrchestratorResult,
    orchestrate_request,
)


def test_runtime_orchestrator_module_imports():
    assert RuntimeOrchestrator is not None
    assert orchestrate_request is not None


def test_runtime_orchestrator_context_defaults():
    context = RuntimeOrchestratorContext()

    assert context.schemaVersion == RUNTIME_ORCHESTRATOR_SCHEMA_VERSION
    assert context.requestId is None
    assert context.scopeId is None
    assert context.requestType is None


def test_runtime_orchestrator_result_defaults():
    result = RuntimeOrchestratorResult()

    assert result.schemaVersion == RUNTIME_ORCHESTRATOR_SCHEMA_VERSION
    assert result.orchestrationType == PLACEHOLDER_ORCHESTRATION_TYPE
    assert result.orchestrationId == PLACEHOLDER_ORCHESTRATION_ID
    assert result.status == PLACEHOLDER_ORCHESTRATION_STATUS
    assert result.metadata == {}


def test_runtime_orchestrator_class_orchestrate_request_stub():
    orchestrator = RuntimeOrchestrator()
    result = orchestrator.orchestrate_request(
        RuntimeOrchestratorContext(requestId="req-1", scopeId="scope-1", requestType="analysis")
    )

    assert result.orchestrationType == "placeholder"
    assert result.orchestrationId == "runtime-orchestrator-placeholder"
    assert result.status == "not-executed"
    assert result.metadata == {}


def test_module_level_orchestrate_request_stub():
    result = orchestrate_request()

    assert result.orchestrationType == "placeholder"
    assert result.orchestrationId == "runtime-orchestrator-placeholder"
    assert result.status == "not-executed"
