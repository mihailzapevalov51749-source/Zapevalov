from unittest.mock import patch

from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from app.modules.auth.dependencies import get_current_user
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.yasii.contracts import YASIIResponse
from app.modules.yasii.router import router

TEST_TENANT_ID = 1
TEST_USER_ID = 42

app = FastAPI()
app.include_router(router)
client = TestClient(app)


class _FakeUser:
    id = TEST_USER_ID
    tenant_id = TEST_TENANT_ID
    is_platform_owner = False


def _override_get_current_user():
    return _FakeUser()


def _override_require_tenant_membership(tenant_id: int):
    if tenant_id != TEST_TENANT_ID:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return tenant_id


app.dependency_overrides[get_current_user] = _override_get_current_user
app.dependency_overrides[require_tenant_membership] = _override_require_tenant_membership


def test_yasii_health_unchanged():
    response = client.get("/yasii/health")

    assert response.status_code == 200
    body = response.json()
    assert body["module"] == "yasii"
    assert body["status"] == "ok"


def test_yasii_query_demo_pipeline():
    response = client.post(
        f"/yasii/tenants/{TEST_TENANT_ID}/query",
        json={
            "requestId": "demo-001",
            "payload": {"text": "Что ты умеешь?"},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["requestId"] == "demo-001"
    assert "intent_resolved" in body["payload"]["trace"]
    assert "audit_recorded" in body["payload"]["trace"]
    assert body["payload"]["trace"][-1] == "audit_recorded"


def test_yasii_query_requires_request_id():
    response = client.post(
        f"/yasii/tenants/{TEST_TENANT_ID}/query",
        json={"payload": {}},
    )

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
            f"/yasii/tenants/{TEST_TENANT_ID}/query",
            json={"requestId": "demo-001", "payload": {"text": "Что ты умеешь?"}},
        )

    assert response.status_code == 200
    mocked.assert_called_once()
    assert response.json()["payload"]["message"] == "via-orchestrator"


def test_router_does_not_import_demo_pipeline_directly():
    import app.modules.yasii.router as yasii_router

    assert "run_demo_pipeline" not in yasii_router.__dict__
