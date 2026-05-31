from unittest.mock import patch

from app.modules.yasii.contracts import YASIIRequest, YASIIResponse
from app.modules.yasii.pipeline_trace import DEMO_PIPELINE_TRACE
from app.modules.yasii.runtime_orchestrator import (
    RuntimeOrchestrator,
    orchestrate_runtime_request,
)


def test_orchestrate_runtime_request_delegates_to_demo_pipeline():
    request = YASIIRequest(requestId="wire-001", payload={"text": "demo"})

    with patch(
        "app.modules.yasii.runtime_orchestrator.run_demo_pipeline",
        return_value=YASIIResponse(
            requestId="wire-001",
            status="ok",
            payload={"demo": True, "message": "from-mock", "trace": ["mocked"]},
        ),
    ) as mocked:
        response = orchestrate_runtime_request(request)

    mocked.assert_called_once_with(request)
    assert response.requestId == "wire-001"
    assert response.payload["message"] == "from-mock"


def test_runtime_orchestrator_class_delegates_to_demo_pipeline():
    request = YASIIRequest(requestId="wire-002", payload={})

    with patch(
        "app.modules.yasii.runtime_orchestrator.run_demo_pipeline",
        return_value=YASIIResponse(requestId="wire-002", status="ok", payload={"demo": True}),
    ) as mocked:
        response = RuntimeOrchestrator().orchestrate_runtime_request(request)

    mocked.assert_called_once_with(request)
    assert response.status == "ok"


def test_orchestrate_runtime_request_returns_full_pipeline_trace():
    response = orchestrate_runtime_request(
        YASIIRequest(requestId="wire-003", payload={}),
    )

    assert response.status == "ok"
    assert response.payload["demo"] is True
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)
