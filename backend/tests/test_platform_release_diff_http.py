"""HTTP contract tests for compare-dev-template (WI-RELEASE-DIFF-002)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.users.models import Role, User


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def _create_user(db: Session, *, role_name: str = "admin") -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"release_diff_http_{_suffix()}@test.local",
        full_name="Release Diff HTTP Tester",
        hashed_password="hash",
        is_active=True,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def test_compare_dev_template_post_is_registered_not_405(client: TestClient):
    response = client.post("/platform/releases/compare-dev-template")
    assert response.status_code != 405, response.text
    assert response.status_code == 401


def test_compare_dev_template_options_declares_post(client: TestClient):
    response = client.options("/platform/releases/compare-dev-template")
    assert response.status_code == 405
    assert response.headers.get("allow") == "POST"


def test_compare_dev_template_post_returns_diff_payload(client: TestClient, db: Session):
    user = _create_user(db)
    db.commit()

    response = client.post(
        "/platform/releases/compare-dev-template",
        headers=_auth_headers(user),
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert "changed_files" in body
    assert "changed_elements" in body
    assert "has_changes" in body
    assert "dev_matches_template" in body
    assert isinstance(body.get("elements"), list)
