"""Pages Registry classification and default filter (P1 cleanup)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.pages.page_registry_classification import (
    build_page_registry_classification_context,
    classify_page_entity_kind,
)
from app.modules.platform.designer.pages.service import list_page_registry
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.platform.designer.workspaces.models import DesignerWorkspace
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
        email=f"pages_registry_{role_name}_{_suffix()}@test.local",
        full_name=f"Pages Registry Test {role_name}",
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


def _create_page(
    db: Session,
    *,
    tenant_id: int,
    title: str,
    status: str = "published",
) -> Page:
    page = Page(portal_id=tenant_id, title=title, status=status)
    db.add(page)
    db.flush()
    return page


def _create_portal(db: Session) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"Pages registry {suffix}",
        code=f"pages-registry-{suffix}",
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _attach_nav(
    db: Session,
    *,
    tenant_id: int,
    page: Page,
    title: str,
    nav_type: str = "page",
    system_key: str | None = None,
    menu_scope: str = "runtime",
) -> NavigationItem:
    nav = NavigationItem(
        portal_id=tenant_id,
        type=nav_type,
        title=title,
        page_id=page.id,
        menu_scope=menu_scope,
        system_key=system_key,
        is_system=bool(system_key),
        is_protected=bool(system_key),
    )
    db.add(nav)
    db.flush()
    return nav


def test_classify_home_page(db: Session) -> None:
    portal = _create_portal(db)
    tenant_id = int(portal.id)
    page = _create_page(db, tenant_id=tenant_id, title="Главная", status="published")
    _attach_nav(
        db,
        tenant_id=tenant_id,
        page=page,
        title="Главная",
    )
    context = build_page_registry_classification_context(db, tenant_id)
    assert classify_page_entity_kind(db, tenant_id, page, context=context) == "home_page"


def test_classify_runtime_modules(db: Session) -> None:
    portal = _create_portal(db)
    tenant_id = int(portal.id)

    chat = _create_page(db, tenant_id=tenant_id, title="Чат")
    _attach_nav(db, tenant_id=tenant_id, page=chat, title="Чат")
    calendar = _create_page(db, tenant_id=tenant_id, title="Календарь")
    _attach_nav(db, tenant_id=tenant_id, page=calendar, title="Календарь")
    notifications = _create_page(db, tenant_id=tenant_id, title="Уведомления")
    _attach_nav(db, tenant_id=tenant_id, page=notifications, title="Уведомления")

    context = build_page_registry_classification_context(db, tenant_id)

    assert classify_page_entity_kind(db, tenant_id, chat, context=context) == "module"
    assert classify_page_entity_kind(db, tenant_id, calendar, context=context) == "module"
    assert (
        classify_page_entity_kind(db, tenant_id, notifications, context=context) == "module"
    )


def test_classify_library_workspace_admin_draft_orphan(db: Session) -> None:
    portal = _create_portal(db)
    tenant_id = int(portal.id)
    suffix = _suffix()

    library_page = _create_page(db, tenant_id=tenant_id, title=f"Library {suffix}")
    _attach_nav(
        db,
        tenant_id=tenant_id,
        page=library_page,
        title=f"Library {suffix}",
        nav_type="document_library",
    )

    workspace_page = _create_page(db, tenant_id=tenant_id, title=f"Workspace {suffix}")
    workspace = DesignerWorkspace(
        tenant_id=tenant_id,
        title=f"WS {suffix}",
        slug=f"ws-{suffix}",
        home_page_id=workspace_page.id,
        status="active",
    )
    db.add(workspace)
    db.flush()

    admin_page = _create_page(db, tenant_id=tenant_id, title="Администрирование")
    _attach_nav(db, tenant_id=tenant_id, page=admin_page, title="Администрирование")

    draft_page = _create_page(
        db,
        tenant_id=tenant_id,
        title=f"Draft {suffix}",
        status="draft",
    )
    orphan_page = _create_page(
        db,
        tenant_id=tenant_id,
        title=f"Orphan {suffix}",
        status="published",
    )
    user_page = _create_page(
        db,
        tenant_id=tenant_id,
        title=f"User page {suffix}",
        status="published",
    )
    _attach_nav(
        db,
        tenant_id=tenant_id,
        page=user_page,
        title=f"User page {suffix}",
    )

    context = build_page_registry_classification_context(db, tenant_id)

    assert (
        classify_page_entity_kind(db, tenant_id, library_page, context=context) == "library"
    )
    assert (
        classify_page_entity_kind(db, tenant_id, workspace_page, context=context)
        == "workspace"
    )
    assert (
        classify_page_entity_kind(db, tenant_id, admin_page, context=context)
        == "tenant_administration"
    )
    assert classify_page_entity_kind(db, tenant_id, draft_page, context=context) == "draft"
    assert classify_page_entity_kind(db, tenant_id, orphan_page, context=context) == "orphan"
    assert classify_page_entity_kind(db, tenant_id, user_page, context=context) == "user_page"


def test_list_page_registry_default_filter(db: Session) -> None:
    portal = _create_portal(db)
    tenant_id = int(portal.id)
    suffix = _suffix()

    user_page = _create_page(
        db,
        tenant_id=tenant_id,
        title=f"Visible {suffix}",
        status="published",
    )
    _attach_nav(db, tenant_id=tenant_id, page=user_page, title=f"Visible {suffix}")

    module_page = _create_page(db, tenant_id=tenant_id, title=f"Chat {suffix}")
    _attach_nav(
        db,
        tenant_id=tenant_id,
        page=module_page,
        title="Чат",
    )

    response = list_page_registry(db, tenant_id, include_system=False)
    returned_ids = {item.id for item in response.items}

    assert user_page.id in returned_ids
    assert module_page.id not in returned_ids
    assert response.total_pages == len(returned_ids)
    assert response.hidden_system_count >= 1
    assert all(item.entity_kind in {"home_page", "user_page"} for item in response.items)


def test_list_page_registry_include_system(db: Session) -> None:
    portal = _create_portal(db)
    tenant_id = int(portal.id)
    suffix = _suffix()

    module_page = _create_page(db, tenant_id=tenant_id, title=f"Notify {suffix}")
    _attach_nav(
        db,
        tenant_id=tenant_id,
        page=module_page,
        title="Уведомления",
    )

    response = list_page_registry(db, tenant_id, include_system=True)
    kinds = {item.entity_kind for item in response.items}

    assert module_page.id in {item.id for item in response.items}
    assert "module" in kinds
    assert len(response.items) >= response.total_pages


@pytest.mark.parametrize("tenant_id", [1, 2, 21])
def test_demo_tenants_default_registry_excludes_system(
    db: Session,
    tenant_id: int,
) -> None:
    response = list_page_registry(db, tenant_id, include_system=False)

    assert response.hidden_system_count >= 0
    assert response.total_pages == len(response.items)
    assert all(item.entity_kind in {"home_page", "user_page"} for item in response.items)

    titles = {item.title for item in response.items}
    assert "Чат" not in titles
    assert "Календарь" not in titles
    assert "Уведомления" not in titles
    assert "Администрирование" not in titles
    assert "Настройка системы" not in titles


def test_registry_api_default_and_debug_mode(db: Session, client: TestClient) -> None:
    user = _create_user(db, role_name="superadmin", tenant_id=1)
    db.commit()
    headers = _auth_headers(user)

    default_response = client.get(
        "/designer/tenants/1/pages/registry",
        headers=headers,
    )
    assert default_response.status_code == 200
    default_payload = default_response.json()
    assert "total_pages" in default_payload
    assert "hidden_system_count" in default_payload
    assert all(
        item["entity_kind"] in {"home_page", "user_page"}
        for item in default_payload["items"]
    )

    debug_response = client.get(
        "/designer/tenants/1/pages/registry",
        params={"include_system": "true"},
        headers=headers,
    )
    assert debug_response.status_code == 200
    debug_payload = debug_response.json()
    assert len(debug_payload["items"]) >= len(default_payload["items"])

    debug_kinds = {item["entity_kind"] for item in debug_payload["items"]}
    system_kinds = {"module", "library", "workspace", "tenant_administration", "draft", "orphan"}
    if debug_payload["hidden_system_count"] > 0:
        assert debug_kinds & system_kinds
