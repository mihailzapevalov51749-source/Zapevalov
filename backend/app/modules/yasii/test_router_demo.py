from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.yasii.contracts import YASIIResponse
from app.modules.yasii.router import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_yasii_health_unchanged():
    response = client.get("/yasii/health")

    assert response.status_code == 200
    body = response.json()
    assert body["module"] == "yasii"
    assert body["status"] == "ok"


def test_yasii_query_demo_pipeline():
    response = client.post(
        "/yasii/query",
        json={
            "requestId": "demo-001",
            "payload": {"text": "Что ты умеешь?"},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["requestId"] == "demo-001"
    assert body["payload"]["demo"] is True
    assert body["payload"]["message"] == "YASII runtime pipeline is available"
    assert "intent_resolved" in body["payload"]["trace"]
    assert "audit_recorded" in body["payload"]["trace"]
    assert body["payload"]["trace"][-1] == "audit_recorded"


def test_yasii_query_requires_request_id():
    response = client.post("/yasii/query", json={"payload": {}})

    assert response.status_code == 422


def test_yasii_query_routes_through_orchestrator():
    with patch(
        "app.modules.yasii.router.orchestrate_runtime_request",
        return_value=YASIIResponse(
            requestId="demo-001",
            status="ok",
            payload={"demo": True, "message": "via-orchestrator", "trace": []},
        ),
    ) as mocked:
        response = client.post(
            "/yasii/query",
            json={"requestId": "demo-001", "payload": {"text": "Что ты умеешь?"}},
        )

    assert response.status_code == 200
    mocked.assert_called_once()
    assert response.json()["payload"]["message"] == "via-orchestrator"


def test_router_does_not_import_demo_pipeline_directly():
    import app.modules.yasii.router as yasii_router

    assert "run_demo_pipeline" not in yasii_router.__dict__
