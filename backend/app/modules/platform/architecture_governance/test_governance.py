from __future__ import annotations

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.modules.platform.architecture_governance import service
from app.modules.platform.architecture_governance.dependencies import (
    require_architecture_governance_access,
)
from app.modules.platform.architecture_governance.router import router
from app.modules.platform.architecture_governance.schemas import (
    AdrListResponse,
    ConstitutionResponse,
    DeliveryContourResponse,
    GovernanceOverviewResponse,
    LegacyGovernanceRedirectResponse,
)
from app.modules.platform.shared.dependencies import require_designer_user


def _build_app():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[require_architecture_governance_access] = lambda: 1
    app.dependency_overrides[require_designer_user] = lambda: SimpleNamespace(id=1)
    return app


def test_governance_overview_endpoint(monkeypatch):
    app = _build_app()
    client = TestClient(app)
    payload = GovernanceOverviewResponse(
        constitution_norms_count=12,
        adr_total=5,
        adr_accepted=3,
        adr_in_progress=1,
        adr_archived=1,
        releases_total_count=2,
    )
    monkeypatch.setattr(service, "get_governance_overview", lambda *_args, **_kwargs: payload)
    response = client.get("/dev/architecture-governance/overview?tenant_id=1")
    assert response.status_code == 200
    assert response.json()["constitution_norms_count"] == 12


def test_constitution_projection_endpoint(monkeypatch):
    app = _build_app()
    client = TestClient(app)
    payload = ConstitutionResponse(
        norms_count=12,
        source_document="docs/architecture/YASNOPRO_PLATFORM_STANDARDS.md",
        source_section="§3",
        norms=[],
    )
    monkeypatch.setattr(service, "get_constitution_projection", lambda: payload)
    response = client.get("/dev/architecture-governance/constitution?tenant_id=1")
    assert response.status_code == 200
    assert response.json()["norms_count"] == 12


def test_adr_list_endpoint(monkeypatch):
    app = _build_app()
    client = TestClient(app)
    payload = AdrListResponse(total=1, accepted=1, in_progress=0, archived=0, items=[])
    monkeypatch.setattr(service, "list_adrs", lambda: payload)
    response = client.get("/dev/architecture-governance/adr?tenant_id=1")
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_delivery_contour_endpoint(monkeypatch):
    app = _build_app()
    client = TestClient(app)
    payload = DeliveryContourResponse(
        source_document="docs/architecture/YASNOPRO_ARCHITECTURE_GOVERNANCE.md",
        route=["DEV", "TEMPLATE", "COMPANY"],
        route_label="DEV → TEMPLATE → COMPANY",
        phases=[],
        policies=[],
        links=[],
    )
    monkeypatch.setattr(service, "get_delivery_contour", lambda: payload)
    response = client.get("/dev/architecture-governance/delivery?tenant_id=1")
    assert response.status_code == 200
    assert response.json()["route_label"] == "DEV → TEMPLATE → COMPANY"


def test_legacy_redirect_publication(monkeypatch):
    app = _build_app()
    client = TestClient(app)
    payload = LegacyGovernanceRedirectResponse(
        registry_key="publication",
        section="architecture-governance",
        tab="delivery",
    )
    monkeypatch.setattr(service, "get_legacy_governance_redirect", lambda key: payload if key == "publication" else None)
    response = client.get("/dev/architecture-governance/legacy-redirect/publication?tenant_id=1")
    assert response.status_code == 200
    assert response.json()["tab"] == "delivery"
