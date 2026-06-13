from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.ai_context.router import router as ai_context_router
from app.modules.auth.dependencies import get_current_user
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.yasii.router import router as yasii_router

TEST_TENANT_ID = 1
TEST_USER_ID = 42

app = FastAPI()
app.include_router(ai_context_router)
app.include_router(yasii_router)
client = TestClient(app)


class _FakeUser:
    id = TEST_USER_ID
    tenant_id = TEST_TENANT_ID
    is_platform_owner = False


def _override_get_current_user():
    return _FakeUser()


def _override_require_tenant_membership(tenant_id: int):
    if tenant_id != TEST_TENANT_ID:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return tenant_id


app.dependency_overrides[get_current_user] = _override_get_current_user
app.dependency_overrides[require_tenant_membership] = _override_require_tenant_membership


def _host_payload(*, dashboard_id: str = "platform_dev", tenant_id: str = "1") -> dict:
    return {
        "hostSurface": "dashboard",
        "tenantId": tenant_id,
        "userId": "user-1",
        "sessionId": "session-1",
        "timestamp": "2026-05-31T12:00:00Z",
        "dashboardId": dashboard_id,
        "selectedScope": "yasii-phase-7",
        "widgetId": "embedded-ai-track",
    }


def setup_function():
    clear_handoff_registry()


def test_ai_context_handoff_endpoint_returns_handoff():
    response = client.post(
        f"/ai-context/tenants/{TEST_TENANT_ID}/handoff",
        json=_host_payload(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["handoffId"].startswith("handoff-")
    assert body["snapshotId"].startswith("snapshot-")
    assert body["boundaryId"].startswith("boundary-")
    assert body["roleIds"] == ["yasii-developer"]
    assert body["warnings"] == []


def test_ai_context_handoff_rejects_missing_mandatory_fields():
    payload = _host_payload()
    payload["hostSurface"] = ""

    response = client.post(
        f"/ai-context/tenants/{TEST_TENANT_ID}/handoff",
        json=payload,
    )

    assert response.status_code == 400


def test_ai_context_handoff_rejects_foreign_tenant_in_body():
    response = client.post(
        f"/ai-context/tenants/{TEST_TENANT_ID}/handoff",
        json=_host_payload(tenant_id="99"),
    )

    assert response.status_code == 403


def test_embedded_query_requires_handoff_id():
    response = client.post(
        f"/yasii/tenants/{TEST_TENANT_ID}/embedded/query",
        json={"handoffId": "", "queryText": "Что происходит?"},
    )

    assert response.status_code == 400


def test_embedded_query_rejects_unknown_handoff():
    response = client.post(
        f"/yasii/tenants/{TEST_TENANT_ID}/embedded/query",
        json={"handoffId": "missing-handoff", "queryText": "Что происходит?"},
    )

    assert response.status_code == 403


def test_embedded_query_runs_after_handoff():
    handoff_response = client.post(
        f"/ai-context/tenants/{TEST_TENANT_ID}/handoff",
        json=_host_payload(),
    )
    handoff_id = handoff_response.json()["handoffId"]

    response = client.post(
        f"/yasii/tenants/{TEST_TENANT_ID}/embedded/query",
        json={"handoffId": handoff_id, "queryText": "Что происходит?"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["requestId"] == f"embedded-{handoff_id}"
    assert body["payload"]["embedded"] is True
    assert body["payload"]["handoffId"] == handoff_id
    assert "audit_recorded" in body["payload"]["trace"]


def test_embedded_query_rejects_handoff_for_foreign_tenant_path():
    handoff_response = client.post(
        f"/ai-context/tenants/{TEST_TENANT_ID}/handoff",
        json=_host_payload(),
    )
    handoff_id = handoff_response.json()["handoffId"]

    response = client.post(
        "/yasii/tenants/99/embedded/query",
        json={"handoffId": handoff_id, "queryText": "Что происходит?"},
    )

    assert response.status_code == 403


def test_host_context_to_embedded_query_integration_chain():
    handoff_response = client.post(
        f"/ai-context/tenants/{TEST_TENANT_ID}/handoff",
        json=_host_payload(dashboard_id="owner"),
    )
    assert handoff_response.status_code == 200
    handoff_body = handoff_response.json()
    assert handoff_body["roleIds"] == ["yasii-owner-assistant"]

    query_response = client.post(
        f"/yasii/tenants/{TEST_TENANT_ID}/embedded/query",
        json={
            "handoffId": handoff_body["handoffId"],
            "queryText": "Какой статус Phase 7?",
        },
    )

    assert query_response.status_code == 200
    query_body = query_response.json()
    assert query_body["payload"]["roleIds"] == ["yasii-owner-assistant"]
    assert query_body["payload"]["snapshotId"] == handoff_body["snapshotId"]
    assert query_body["payload"]["boundaryId"] == handoff_body["boundaryId"]
