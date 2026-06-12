"""Tests for public tenant login branding endpoint."""

from __future__ import annotations

import uuid

import app.modules.portals.models  # noqa: F401

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.tenant_login_branding import resolve_tenant_login_display_name
from app.modules.portals.models import Portal


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _create_portal(db: Session, *, name: str) -> Portal:
    portal = Portal(name=name, code=f"login-brand-{uuid.uuid4().hex[:8]}")
    db.add(portal)
    db.commit()
    db.refresh(portal)
    return portal


def test_resolve_tenant_login_display_name_returns_portal_name(db: Session):
    portal = _create_portal(db, name="ЯсноПро")

    assert resolve_tenant_login_display_name(db, portal.id) == "ЯсноПро"


def test_resolve_tenant_login_display_name_returns_none_for_missing_portal(db: Session):
    assert resolve_tenant_login_display_name(db, 9_999_999) is None


def test_tenant_login_branding_http_returns_display_name(db: Session):
    portal = _create_portal(db, name="Демо Компания")
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get(f"/auth/tenant-login-branding?tenantId={portal.id}")

    assert response.status_code == 200
    assert response.json() == {"display_name": "Демо Компания"}


def test_tenant_login_branding_http_returns_404_for_unknown_tenant():
    client = TestClient(app, raise_server_exceptions=False)

    response = client.get("/auth/tenant-login-branding?tenantId=9999999")

    assert response.status_code == 404
