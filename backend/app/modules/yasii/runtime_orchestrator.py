"""YASII Runtime Orchestrator (P1-W11 skeleton, P4-W08 wiring, P7-W01 embedded handoff)."""

from pydantic import BaseModel, Field

from app.modules.ai_context.handoff import HandoffNotFoundError, validate_handoff
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest, YASIIRequest, YASIIResponse
from app.modules.yasii.effective_scope import EffectiveScopeBuildContext, derive_effective_scope
from app.modules.yasii.runtime_demo_service import run_demo_pipeline

RUNTIME_ORCHESTRATOR_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_ORCHESTRATION_TYPE = "placeholder"
PLACEHOLDER_ORCHESTRATION_ID = "runtime-orchestrator-placeholder"
PLACEHOLDER_ORCHESTRATION_STATUS = "not-executed"
RUNTIME_PIPELINE_WIRED_STATUS = "pipeline-wired"
RUNTIME_PIPELINE_WIRED_TYPE = "runtime-demo"


class RuntimeOrchestratorContext(BaseModel):
    """Technical input contract for legacy orchestrator metadata."""

    schemaVersion: str = Field(default=RUNTIME_ORCHESTRATOR_SCHEMA_VERSION)
    requestId: str | None = None
    scopeId: str | None = None
    requestType: str | None = None


class RuntimeOrchestratorResult(BaseModel):
    """Technical output contract for legacy orchestrator skeleton calls."""

    schemaVersion: str = Field(default=RUNTIME_ORCHESTRATOR_SCHEMA_VERSION)
    orchestrationType: str = Field(default=PLACEHOLDER_ORCHESTRATION_TYPE)
    orchestrationId: str = Field(default=PLACEHOLDER_ORCHESTRATION_ID)
    status: str = Field(default=PLACEHOLDER_ORCHESTRATION_STATUS)
    metadata: dict[str, str] = Field(default_factory=dict)


class RuntimeOrchestrator:
    """Runtime entry point; wires normative requests into the demo pipeline."""

    def orchestrate_runtime_request(self, request: YASIIRequest) -> YASIIResponse:
        return orchestrate_runtime_request(request)

    def orchestrate_embedded_request(
        self,
        request: YASIIEmbeddedQueryRequest,
    ) -> YASIIResponse:
        return orchestrate_embedded_request(request)

    def orchestrate_request(
        self,
        context: RuntimeOrchestratorContext | None = None,
    ) -> RuntimeOrchestratorResult:
        """Legacy skeleton helper retained for P1-W11 contract compatibility."""
        _ = context
        return RuntimeOrchestratorResult(
            orchestrationType=PLACEHOLDER_ORCHESTRATION_TYPE,
            orchestrationId=PLACEHOLDER_ORCHESTRATION_ID,
            status=PLACEHOLDER_ORCHESTRATION_STATUS,
            metadata={},
        )


def orchestrate_runtime_request(request: YASIIRequest) -> YASIIResponse:
    """Official runtime entry: delegate to wired demo pipeline (P4-W08)."""
    return run_demo_pipeline(request)


def orchestrate_embedded_request(request: YASIIEmbeddedQueryRequest) -> YASIIResponse:
    """Embedded runtime entry: ACE handoff → EffectiveScope → demo pipeline (P7-W01)."""
    handoff_id = str(request.handoffId or "").strip()
    if not handoff_id:
        raise HandoffNotFoundError("")

    handoff = validate_handoff(handoff_id)
    scope = derive_effective_scope(
        EffectiveScopeBuildContext(
            requestId=handoff.handoffId,
            tenantId=handoff.tenantId,
            snapshotId=handoff.snapshotId,
            boundaryId=handoff.boundaryId,
        ),
    )

    query_text = str(request.queryText or "").strip()
    runtime_request = YASIIRequest(
        requestId=f"embedded-{handoff.handoffId}",
        surfaceId=handoff.hostSurface,
        payload={
            "text": query_text,
            "handoffId": handoff.handoffId,
            "embedded": True,
            "hostSurface": handoff.hostSurface,
            "snapshotId": handoff.snapshotId,
            "boundaryId": handoff.boundaryId,
            "scopeId": scope.scopeId,
            "roleIds": handoff.roleIds,
            "dashboardId": handoff.dashboardId,
            "selectedScope": handoff.selectedScope,
            "widgetId": handoff.widgetId,
            "dashboardMetadata": dict(handoff.metadata or {}),
        },
    )
    return run_demo_pipeline(runtime_request)


def orchestrate_request(
    context: RuntimeOrchestratorContext | None = None,
) -> RuntimeOrchestratorResult:
    """Module-level legacy skeleton helper for P1-W11."""
    return RuntimeOrchestrator().orchestrate_request(context)
