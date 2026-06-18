from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.dependencies import (
    require_architecture_navigator_access,
)
from app.modules.platform.architecture_navigator.router import router
from app.modules.platform.architecture_navigator.schemas import (
    ArchitectureComponentCard,
    ArchitectureLatestScanResponse,
    ArchitectureScanResponse,
    ArchitectureTreeCategory,
    ArchitectureTreeNode,
    ArchitectureTreeResponse,
)
from app.modules.platform.shared.dependencies import require_designer_user


def _build_app():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[require_architecture_navigator_access] = lambda: 1
    app.dependency_overrides[require_designer_user] = lambda: SimpleNamespace(id=1)
    return app


def test_architecture_tree_endpoint(monkeypatch):
    app = _build_app()
    client = TestClient(app)
    tree = ArchitectureTreeResponse(
        categories=[
            ArchitectureTreeCategory(
                key="contours",
                title="Контуры",
                children=[
                    ArchitectureTreeNode(
                        id=1,
                        key="control-plane",
                        title="Контур управления платформой",
                        technical_name="Control Plane",
                        component_type="contour",
                        category_key="contours",
                    )
                ],
            )
        ]
    )
    monkeypatch.setattr(service, "get_architecture_tree", lambda *_args, **_kwargs: tree)
    response = client.get("/dev/architecture/tree?tenant_id=1")
    assert response.status_code == 200
    assert response.json()["categories"][0]["key"] == "contours"


def test_architecture_component_endpoint(monkeypatch):
    app = _build_app()
    client = TestClient(app)
    card = ArchitectureComponentCard(
        id=1,
        key="control-plane",
        title="Контур управления платформой",
        technical_name="Control Plane",
        component_type="contour",
        category_key="contours",
        category_label="Контур",
        place_in_architecture={"path": [], "children": []},
        last_scan={"scan_id": None, "scanned_at": None, "scanner_version": None},
    )
    monkeypatch.setattr(service, "get_component_card", lambda *_args, **_kwargs: card)
    for component_key in ("control-plane", "dev-environment", "studio", "platform-modal", "avatar"):
        response = client.get(f"/dev/architecture/component/{component_key}?tenant_id=1")
        assert response.status_code == 200, component_key
        assert response.json()["key"] == "control-plane"


def test_architecture_scan_endpoints(monkeypatch):
    app = _build_app()
    client = TestClient(app)
    scan = ArchitectureScanResponse(
        id=1,
        scanner_version="1.0.0",
        status="completed",
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow(),
        summary={
            "routes": 10,
            "tables": 5,
            "frontend_routes": 3,
            "architecture_documents": 20,
            "cursor_rules": 8,
            "components": 30,
        },
        findings_count=46,
    )
    latest = ArchitectureLatestScanResponse(scan=scan)
    monkeypatch.setattr(service, "execute_architecture_scan", lambda *_args, **_kwargs: scan)
    monkeypatch.setattr(service, "get_latest_scan", lambda *_args, **_kwargs: latest)

    assert client.post("/dev/architecture/scan?tenant_id=1").status_code == 200
    latest_resp = client.get("/dev/architecture/scan/latest?tenant_id=1")
    assert latest_resp.status_code == 200
    assert latest_resp.json()["scan"]["scanner_version"] == "1.0.0"
