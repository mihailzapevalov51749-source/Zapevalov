"""Legacy Office administration nav items must not appear in runtime menu."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.navigation.models import NavigationItem
from app.modules.navigation.navigation_edit_mode_classification import (
    build_navigation_classification_context,
    classify_navigation_entity_kind,
)
from app.modules.navigation.service import get_navigation_tree
from app.modules.auth.security import create_access_token
from app.modules.users.models import Role, User
import pytest
import uuid


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


def _flatten_tree(nodes, out=None):
    out = out or []
    for node in nodes:
        out.append(node)
        _flatten_tree(getattr(node, "children", None) or [], out)
    return out


def _collect_titles(tree) -> set[str]:
    return {str(n.title).strip() for n in _flatten_tree(tree)}


def test_nav_48_49_classified_as_administration(db: Session) -> None:
    items = (
        db.query(NavigationItem)
        .filter(NavigationItem.id.in_([48, 49]), NavigationItem.deleted_at.is_(None))
        .all()
    )
    assert len(items) == 2
    context = build_navigation_classification_context(db, 1, items)
    kinds = {classify_navigation_entity_kind(db, item, context=context) for item in items}
    assert kinds == {"administration"}


def test_runtime_tree_excludes_legacy_admin(db: Session) -> None:
    tree = get_navigation_tree(db, 1, "runtime", for_edit_mode=False)
    titles = _collect_titles(tree)
    assert "Администрирование" not in titles
    assert "Настройка системы" not in titles


def test_edit_mode_tree_excludes_legacy_admin(db: Session) -> None:
    tree = get_navigation_tree(db, 1, "runtime", for_edit_mode=True, include_system=False)
    titles = _collect_titles(tree)
    assert "Администрирование" not in titles
    assert "Настройка системы" not in titles


def test_include_system_shows_legacy_admin(db: Session) -> None:
    tree = get_navigation_tree(db, 1, "runtime", for_edit_mode=True, include_system=True)
    titles = _collect_titles(tree)
    assert "Администрирование" in titles
    assert "Настройка системы" in titles


def test_runtime_tree_api_excludes_legacy_admin(client: TestClient, db: Session) -> None:
    role = db.query(Role).filter(Role.name == "superadmin").first()
    if role is None:
        role = Role(name="superadmin", description="test")
        db.add(role)
        db.flush()
    user = User(
        email=f"legacy_admin_nav_{uuid.uuid4().hex[:8]}@test.local",
        full_name="Legacy admin nav test",
        hashed_password="hash",
        is_active=True,
        tenant_id=1,
        role_id=role.id,
    )
    db.add(user)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    for params in (
        {"scope": "runtime"},
        {"scope": "runtime", "for_edit_mode": "true"},
    ):
        response = client.get("/navigation/portal/1/tree", params=params, headers=headers)
        assert response.status_code == 200
        flat: list[dict] = []

        def walk(nodes: list[dict]) -> None:
            for node in nodes:
                flat.append(node)
                walk(node.get("children") or [])

        walk(response.json())
        titles = {str(n.get("title") or "").strip() for n in flat}
        assert "Администрирование" not in titles
        assert "Настройка системы" not in titles

    debug = client.get(
        "/navigation/portal/1/tree",
        params={"scope": "runtime", "for_edit_mode": "true", "include_system": "true"},
        headers=headers,
    )
    assert debug.status_code == 200
    debug_flat: list[dict] = []

    def walk_debug(nodes: list[dict]) -> None:
        for node in nodes:
            debug_flat.append(node)
            walk_debug(node.get("children") or [])

    walk_debug(debug.json())
    debug_titles = {str(n.get("title") or "").strip() for n in debug_flat}
    assert "Администрирование" in debug_titles
    assert "Настройка системы" in debug_titles


def test_studio_administration_route_registered(client: TestClient, db: Session) -> None:
    role = db.query(Role).filter(Role.name == "superadmin").first()
    if role is None:
        role = Role(name="superadmin", description="test")
        db.add(role)
        db.flush()
    user = User(
        email=f"studio_admin_route_{uuid.uuid4().hex[:8]}@test.local",
        full_name="Studio admin route test",
        hashed_password="hash",
        is_active=True,
        tenant_id=1,
        role_id=role.id,
    )
    db.add(user)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    response = client.get(
        "/designer/tenants/1/object-types",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code in {200, 403}
    # Studio designer API remains reachable; administration UI is under /designer/tenant/{id}/administration (frontend route).
