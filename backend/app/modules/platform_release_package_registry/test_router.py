from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_release_package_registry import service
from app.modules.platform_release_package_registry.router import router


def _build_app():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[require_platform_admin] = lambda: SimpleNamespace(id=500)
    return app


def _package(status_value: str = "draft"):
    return SimpleNamespace(
        id=1,
        package_key="PKG-20260616-0001",
        platform_version="1.0.0",
        build_id=101,
        status=status_value,
        package_manifest_json={"build_id": 101},
        module_bom_json={"modules": ["runtime.chat"]},
        release_notes=None,
        created_at=datetime.utcnow(),
        ready_at=None,
        published_at=None,
        deprecated_at=None,
        cancelled_at=None,
        created_by=500,
        cancelled_by=None,
        cancellation_reason=None,
    )


def test_release_package_router_happy_path(monkeypatch):
    app = _build_app()
    client = TestClient(app)

    monkeypatch.setattr(service, "list_release_packages", lambda _db, status_filter=None: [_package("draft")])
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: _package("draft"))
    monkeypatch.setattr(service, "create_release_package", lambda *_args, **_kwargs: _package("draft"))
    monkeypatch.setattr(service, "mark_ready", lambda _db, package_id: _package("ready"))
    monkeypatch.setattr(service, "publish_package", lambda _db, package_id: _package("published"))
    monkeypatch.setattr(service, "cancel_package", lambda *_args, **_kwargs: _package("cancelled"))
    monkeypatch.setattr(service, "deprecate_package", lambda _db, package_id: _package("deprecated"))

    assert client.get("/platform/release-packages").status_code == 200
    assert client.get("/platform/release-packages/1").status_code == 200

    create_resp = client.post(
        "/platform/release-packages",
        json={
            "package_key": "PKG-20260616-0001",
            "build_id": 101,
            "platform_version": "1.0.0",
            "package_manifest_json": {"build_id": 101},
            "module_bom_json": {"modules": ["runtime.chat"]},
            "release_notes": "note",
        },
    )
    assert create_resp.status_code == 201

    assert client.post("/platform/release-packages/1/ready").status_code == 200
    assert client.post("/platform/release-packages/1/publish").status_code == 200
    assert (
        client.post(
            "/platform/release-packages/1/cancel",
            json={"cancellation_reason": "manual"},
        ).status_code
        == 200
    )
    assert client.post("/platform/release-packages/1/deprecate").status_code == 200


def test_release_package_router_forbidden_for_non_admin():
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

    response = client.get("/platform/release-packages")
    assert response.status_code == 403


def test_release_package_router_forbidden_transition(monkeypatch):
    app = _build_app()
    client = TestClient(app)

    def _raise_transition(*_args, **_kwargs):
        raise HTTPException(status_code=400, detail="Переход запрещен")

    monkeypatch.setattr(service, "publish_package", _raise_transition)

    response = client.post("/platform/release-packages/1/publish")
    assert response.status_code == 400


def test_release_package_router_rejects_non_succeeded_build_on_create(monkeypatch):
    app = _build_app()
    client = TestClient(app)

    def _raise_build_guard(*_args, **_kwargs):
        raise HTTPException(
            status_code=400,
            detail="Release package можно создать только из succeeded build",
        )

    monkeypatch.setattr(service, "create_release_package", _raise_build_guard)

    response = client.post(
        "/platform/release-packages",
        json={
            "package_key": "PKG-20260616-0001",
            "build_id": 101,
            "platform_version": "1.0.0",
            "package_manifest_json": {"build_id": 101},
            "module_bom_json": {"modules": ["runtime.chat"]},
        },
    )
    assert response.status_code == 400
    assert "succeeded build" in response.json()["detail"].lower()


def test_release_package_router_rejects_non_succeeded_build_on_ready(monkeypatch):
    app = _build_app()
    client = TestClient(app)

    def _raise_build_guard(*_args, **_kwargs):
        raise HTTPException(
            status_code=400,
            detail="Release package можно создать только из succeeded build",
        )

    monkeypatch.setattr(service, "mark_ready", _raise_build_guard)

    response = client.post("/platform/release-packages/1/ready")
    assert response.status_code == 400
    assert "succeeded build" in response.json()["detail"].lower()

