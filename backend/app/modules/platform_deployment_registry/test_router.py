from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_deployment_registry import service
from app.modules.platform_deployment_registry.router import router


def _build_app():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[require_platform_admin] = lambda: SimpleNamespace(id=501)
    return app


def _deployment(status_value: str = "planned"):
    return SimpleNamespace(
        id=1,
        deployment_key="DPL-20260616-0001",
        release_package_id=10,
        target_environment_type="template",
        target_environment_id=None,
        target_tenant_id=None,
        status=status_value,
        target_platform_version="1.0.0",
        target_schema_revision="rev-1",
        previous_platform_version=None,
        previous_release_package_id=None,
        deployment_manifest_json={},
        created_at=datetime.utcnow(),
        started_at=None,
        finished_at=None,
        created_by=501,
        failure_reason=None,
    )


def test_deployment_router_happy_path(monkeypatch):
    app = _build_app()
    client = TestClient(app)

    monkeypatch.setattr(service, "list_deployments", lambda *_args, **_kwargs: [_deployment("planned")])
    monkeypatch.setattr(service, "get_deployment", lambda *_args, **_kwargs: _deployment("planned"))
    monkeypatch.setattr(service, "create_deployment", lambda *_args, **_kwargs: _deployment("planned"))
    monkeypatch.setattr(service, "start_deployment", lambda *_args, **_kwargs: _deployment("running"))
    monkeypatch.setattr(service, "mark_succeeded", lambda *_args, **_kwargs: _deployment("succeeded"))
    monkeypatch.setattr(service, "mark_failed", lambda *_args, **_kwargs: _deployment("failed"))
    monkeypatch.setattr(service, "cancel_deployment", lambda *_args, **_kwargs: _deployment("cancelled"))

    assert client.get("/platform/deployments").status_code == 200
    assert client.get("/platform/deployments/1").status_code == 200

    create_resp = client.post(
        "/platform/deployments",
        json={
            "deployment_key": "DPL-20260616-0001",
            "release_package_id": 10,
            "target_environment_type": "template",
            "deployment_manifest_json": {},
        },
    )
    assert create_resp.status_code == 201

    assert client.post("/platform/deployments/1/start").status_code == 200
    assert client.post("/platform/deployments/1/succeed").status_code == 200
    assert (
        client.post("/platform/deployments/1/fail", json={"failure_reason": "error"}).status_code
        == 200
    )
    assert client.post("/platform/deployments/1/cancel").status_code == 200


def test_deployment_router_non_admin_forbidden():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: object()

    def _deny():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для управления платформой",
        )

    app.dependency_overrides[require_platform_admin] = _deny
    client = TestClient(app)
    response = client.get("/platform/deployments")
    assert response.status_code == 403

