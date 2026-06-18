"""Office navigation edit-mode cleanup (P1) — classification and filtering."""

from __future__ import annotations

import re
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.navigation.models import NavigationItem
from app.modules.navigation.navigation_edit_mode_classification import (
    classify_navigation_entity_kind,
    filter_navigation_for_office_edit_mode,
)
from app.modules.navigation.runtime_navigation_reconcile import NAV_TRASH_ARTIFACT_TITLE_RE
from app.modules.navigation.service import get_navigation_tree
from app.modules.pages.models import Page
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.shared.object_type_settings import with_show_in_navigation
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.users.models import Role, User


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


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def _create_user(db: Session, *, role_name: str, tenant_id: int | None = None) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"nav_edit_{role_name}_{_suffix()}@test.local",
        full_name=f"Nav edit test {role_name}",
        hashed_password="hash",
        is_active=True,
        tenant_id=tenant_id,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _create_portal(db: Session) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"Nav edit {suffix}",
        code=f"nav-edit-{suffix}",
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _flatten_tree(nodes, out=None):
    out = out or []
    for node in nodes:
        out.append(node)
        _flatten_tree(getattr(node, "children", None) or [], out)
    return out


def test_classify_duplicate_home_and_artifact(db: Session) -> None:
    portal = _create_portal(db)
    tenant_id = int(portal.id)
    suffix = _suffix()

    canonical_page = Page(portal_id=tenant_id, title="Главная", status="published")
    duplicate_page = Page(portal_id=tenant_id, title="Главная", status="draft")
    trash_page = Page(portal_id=tenant_id, title=f"Trash purge page {suffix[:8]}", status="draft")
    db.add_all([canonical_page, duplicate_page, trash_page])
    db.flush()

    canonical = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title="Главная",
        page_id=canonical_page.id,
        menu_scope="runtime",
        system_key="runtime.office_home",
        is_system=True,
        is_protected=True,
    )
    duplicate = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title="Главная",
        page_id=duplicate_page.id,
        menu_scope="runtime",
        is_visible=False,
    )
    artifact = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title=f"Nav {suffix[:8]}",
        page_id=trash_page.id,
        menu_scope="runtime",
        is_visible=False,
    )
    db.add_all([canonical, duplicate, artifact])
    db.flush()

    from app.modules.navigation.navigation_edit_mode_classification import (
        build_navigation_classification_context,
    )

    context = build_navigation_classification_context(
        db,
        tenant_id,
        [canonical, duplicate, artifact],
    )
    assert classify_navigation_entity_kind(db, canonical, context=context) == "home"
    assert classify_navigation_entity_kind(db, duplicate, context=context) == "duplicate"
    assert classify_navigation_entity_kind(db, artifact, context=context) == "artifact"


def test_classify_legacy_hidden_object(db: Session) -> None:
    portal = _create_portal(db)
    tenant_id = int(portal.id)

    object_type = DesignerObjectType(
        tenant_id=tenant_id,
        key=f"legacy-{ _suffix()}",
        name="План развития",
        settings_json=with_show_in_navigation({}, show_in_navigation=False),
    )
    db.add(object_type)
    db.flush()

    nav = NavigationItem(
        portal_id=tenant_id,
        type="object_type",
        title="Направления",
        object_type_id=object_type.id,
        url=f"/portal/{tenant_id}/object-types/{object_type.key}",
        menu_scope="runtime",
        is_visible=False,
    )
    db.add(nav)
    db.flush()

    from app.modules.navigation.navigation_edit_mode_classification import (
        build_navigation_classification_context,
    )

    context = build_navigation_classification_context(db, tenant_id, [nav])
    assert classify_navigation_entity_kind(db, nav, context=context) == "legacy_hidden"


def test_filter_edit_mode_excludes_junk(db: Session) -> None:
    portal = _create_portal(db)
    tenant_id = int(portal.id)
    suffix = _suffix()

    home_page = Page(portal_id=tenant_id, title="Главная", status="published")
    dup_page = Page(portal_id=tenant_id, title="Главная", status="draft")
    trash_page = Page(portal_id=tenant_id, title=f"Trash purge page {suffix[:8]}", status="draft")
    db.add_all([home_page, dup_page, trash_page])
    db.flush()

    items = [
        NavigationItem(
            portal_id=tenant_id,
            type="page",
            title="Главная",
            page_id=home_page.id,
            menu_scope="runtime",
            system_key="runtime.office_home",
            is_system=True,
            is_protected=True,
        ),
        NavigationItem(
            portal_id=tenant_id,
            type="page",
            title="Главная",
            page_id=dup_page.id,
            menu_scope="runtime",
        ),
        NavigationItem(
            portal_id=tenant_id,
            type="page",
            title=f"Nav {suffix[:8]}",
            page_id=trash_page.id,
            menu_scope="runtime",
        ),
    ]
    for item in items:
        db.add(item)
    db.flush()

    filtered = filter_navigation_for_office_edit_mode(db, tenant_id, items, include_system=False)
    assert len(filtered) == 1
    assert filtered[0].system_key == "runtime.office_home"

    with_system = filter_navigation_for_office_edit_mode(db, tenant_id, items, include_system=True)
    assert len(with_system) == 3


def test_tenant_1_edit_mode_tree_cleanup(db: Session) -> None:
    normal_tree = get_navigation_tree(db, 1, "runtime", for_edit_mode=False)
    edit_tree = get_navigation_tree(db, 1, "runtime", for_edit_mode=True, include_system=False)
    debug_tree = get_navigation_tree(db, 1, "runtime", for_edit_mode=True, include_system=True)

    normal_flat = _flatten_tree(normal_tree)
    edit_flat = _flatten_tree(edit_tree)
    debug_flat = _flatten_tree(debug_tree)

    assert len(normal_flat) == 9
    assert len(debug_flat) >= len(edit_flat)

    home_titles = [n for n in edit_flat if str(n.title).strip() == "Главная"]
    assert len(home_titles) == 1
    assert home_titles[0].system_key == "runtime.office_home"

    nav_artifacts = [
        n for n in edit_flat if NAV_TRASH_ARTIFACT_TITLE_RE.match(str(n.title or "").strip())
    ]
    assert nav_artifacts == []

    edit_display_titles = {
        getattr(n, "display_title", None) or n.title for n in edit_flat
    }
    assert "План развития" not in edit_display_titles
    assert "История" not in edit_display_titles
    assert "Администрирование" not in edit_display_titles
    assert "Настройка системы" not in edit_display_titles

    assert len(edit_flat) <= len(debug_flat)
    assert "Чат" in {n.title for n in edit_flat}


def test_tenant_1_runtime_mode_unchanged(db: Session) -> None:
    tree = get_navigation_tree(db, 1, "runtime", for_edit_mode=False)
    flat = _flatten_tree(tree)
    titles = {n.title for n in flat}
    assert "Главная" in titles
    assert "Мои задачи" in titles
    assert "Календарь" in titles
    assert "Чат" in titles
    assert "Уведомления" in titles
    assert "Документы" in titles
    assert "Администрирование" not in titles
    assert "Настройка системы" not in titles


def test_navigation_tree_api_edit_mode_filter(client: TestClient, db: Session) -> None:
    user = _create_user(db, role_name="superadmin", tenant_id=1)
    db.commit()
    headers = _auth_headers(user)

    normal = client.get(
        "/navigation/portal/1/tree",
        params={"scope": "runtime"},
        headers=headers,
    )
    assert normal.status_code == 200
    normal_items = normal.json()
    assert len(normal_items) >= 1

    edit = client.get(
        "/navigation/portal/1/tree",
        params={"scope": "runtime", "for_edit_mode": "true"},
        headers=headers,
    )
    assert edit.status_code == 200
    edit_flat: list[dict] = []

    def walk(nodes: list[dict]) -> None:
        for node in nodes:
            edit_flat.append(node)
            walk(node.get("children") or [])

    walk(edit.json())
    assert sum(1 for n in edit_flat if n.get("title") == "Главная") == 1
    assert not any(re.match(r"^Nav [0-9a-f]{8}$", str(n.get("title") or ""), re.I) for n in edit_flat)

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
    assert len(debug_flat) >= len(edit_flat)
