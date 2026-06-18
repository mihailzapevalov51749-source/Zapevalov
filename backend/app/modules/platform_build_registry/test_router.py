from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_build_registry import service
from app.modules.platform_build_registry.router import router


def _build_app():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[require_platform_admin] = lambda: SimpleNamespace(id=501)
    return app


def _build(status_value: str = "pending"):
    return SimpleNamespace(
        id=1,
        build_key="BLD-20260616-0001",
        commit_sha="a" * 40,
        status=status_value,
        backend_digest=None,
        frontend_digest=None,
        schema_revision="rev-1",
        build_manifest_json={"schema_revision": "rev-1"},
        created_at=datetime.utcnow(),
        started_at=None,
        finished_at=None,
        created_by=501,
        failure_reason=None,
    )


def test_build_router_happy_path(monkeypatch):
    app = _build_app()
    client = TestClient(app)

    monkeypatch.setattr(service, "list_builds", lambda *_args, **_kwargs: [_build("pending")])
    monkeypatch.setattr(service, "get_build", lambda *_args, **_kwargs: _build("pending"))
    monkeypatch.setattr(service, "create_build", lambda *_args, **_kwargs: _build("pending"))
    monkeypatch.setattr(service, "start_build", lambda *_args, **_kwargs: _build("running"))
    monkeypatch.setattr(service, "mark_succeeded", lambda *_args, **_kwargs: _build("succeeded"))
    monkeypatch.setattr(service, "mark_failed", lambda *_args, **_kwargs: _build("failed"))
    monkeypatch.setattr(service, "cancel_build", lambda *_args, **_kwargs: _build("cancelled"))

    assert client.get("/platform/builds").status_code == 200
    assert client.get("/platform/builds/1").status_code == 200

    create_resp = client.post(
        "/platform/builds",
        json={
            "build_key": "BLD-20260616-0001",
            "commit_sha": "a" * 40,
            "build_manifest_json": {"schema_revision": "rev-1"},
        },
    )
    assert create_resp.status_code == 201

    assert client.post("/platform/builds/1/start").status_code == 200
    assert client.post("/platform/builds/1/succeed").status_code == 200
    assert client.post("/platform/builds/1/fail", json={"failure_reason": "error"}).status_code == 200
    assert client.post("/platform/builds/1/cancel").status_code == 200


def test_build_router_non_admin_forbidden():
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
    response = client.get("/platform/builds")
    assert response.status_code == 403
