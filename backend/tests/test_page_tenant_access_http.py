"""HTTP integration tests for legacy pages/sections/blocks tenant isolation."""

from __future__ import annotations

import uuid

import app.modules.portals.models  # noqa: F401

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.blocks.models import Block
from app.modules.pages.models import Page
from app.modules.portals.models import Portal
from app.modules.sections.models import Section


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _ensure_portals(db: Session, portal_a: int, portal_b: int) -> None:
    for portal_id, label in ((portal_a, "A"), (portal_b, "B")):
        existing = db.query(Portal).filter(Portal.id == portal_id).first()
        if existing is None:
            db.add(
                Portal(
                    id=portal_id,
                    name=f"Tenant {label} {_suffix()}",
                    code=f"tenant_access_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _create_page_bundle(db: Session, *, portal_id: int) -> tuple[Page, Section, Block]:
    page = Page(portal_id=portal_id, title=f"Page {portal_id} {_suffix()}", status="published")
    db.add(page)
    db.flush()

    section = Section(page_id=page.id, title="Section", sort_order=0)
    db.add(section)
    db.flush()

    block = Block(section_id=section.id, type="text", title="Block", sort_order=0)
    db.add(block)
    db.flush()

    return page, section, block


def test_get_own_tenant_page_returns_200(client: TestClient, db: Session) -> None:
    portal_a = 901
    portal_b = 902
    _ensure_portals(db, portal_a, portal_b)
    page_a, _, _ = _create_page_bundle(db, portal_id=portal_a)
    db.commit()

    response = client.get(f"/pages/{page_a.id}", params={"portal_id": portal_a})

    assert response.status_code == 200
    assert response.json()["id"] == page_a.id
    assert response.json()["portal_id"] == portal_a


def test_get_foreign_tenant_page_returns_403(client: TestClient, db: Session) -> None:
    portal_a = 903
    portal_b = 904
    _ensure_portals(db, portal_a, portal_b)
    page_a, _, _ = _create_page_bundle(db, portal_id=portal_a)
    db.commit()

    response = client.get(f"/pages/{page_a.id}", params={"portal_id": portal_b})

    assert response.status_code == 403


def test_get_page_full_foreign_tenant_returns_403(client: TestClient, db: Session) -> None:
    portal_a = 905
    portal_b = 906
    _ensure_portals(db, portal_a, portal_b)
    page_a, _, _ = _create_page_bundle(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        f"/pages/{page_a.id}/full",
        params={"portal_id": portal_b, "office_access": True},
    )

    assert response.status_code == 403


def test_update_foreign_tenant_page_returns_403(client: TestClient, db: Session) -> None:
    portal_a = 907
    portal_b = 908
    _ensure_portals(db, portal_a, portal_b)
    page_a, _, _ = _create_page_bundle(db, portal_id=portal_a)
    db.commit()

    response = client.put(
        f"/pages/{page_a.id}",
        params={"portal_id": portal_b},
        json={"title": "Hacked"},
    )

    assert response.status_code == 403


def test_get_foreign_tenant_section_returns_403(client: TestClient, db: Session) -> None:
    portal_a = 909
    portal_b = 910
    _ensure_portals(db, portal_a, portal_b)
    _, section_a, _ = _create_page_bundle(db, portal_id=portal_a)
    db.commit()

    response = client.get(f"/sections/{section_a.id}", params={"portal_id": portal_b})

    assert response.status_code == 403


def test_get_foreign_tenant_block_returns_403(client: TestClient, db: Session) -> None:
    portal_a = 911
    portal_b = 912
    _ensure_portals(db, portal_a, portal_b)
    _, _, block_a = _create_page_bundle(db, portal_id=portal_a)
    db.commit()

    response = client.get(f"/blocks/{block_a.id}", params={"portal_id": portal_b})

    assert response.status_code == 403


def test_get_page_with_portal_referer_returns_200(client: TestClient, db: Session) -> None:
    portal_a = 915
    portal_b = 916
    _ensure_portals(db, portal_a, portal_b)
    page_a, _, _ = _create_page_bundle(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        f"/pages/{page_a.id}",
        headers={"referer": f"http://localhost/portal/{portal_a}/page/{page_a.id}"},
    )

    assert response.status_code == 200
    assert response.json()["portal_id"] == portal_a


def test_missing_portal_context_returns_403(client: TestClient, db: Session) -> None:
    portal_a = 913
    portal_b = 914
    _ensure_portals(db, portal_a, portal_b)
    page_a, _, _ = _create_page_bundle(db, portal_id=portal_a)
    db.commit()

    response = client.get(f"/pages/{page_a.id}")

    assert response.status_code == 403
