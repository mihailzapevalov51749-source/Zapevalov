"""HTTP integration tests for workspace tabs tenant isolation."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.platform.workspace_tabs.models import UserWorkspaceTab
from app.modules.portals.models import Portal
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


def _ensure_portals(db: Session, portal_a: int, portal_b: int) -> None:
    for portal_id, label in ((portal_a, "A"), (portal_b, "B")):
        existing = db.query(Portal).filter(Portal.id == portal_id).first()
        if existing is None:
            db.add(
                Portal(
                    id=portal_id,
                    name=f"Workspace Tabs ISO {label} {_suffix()}",
                    code=f"ws_tabs_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"ws_tabs_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"ws_tabs_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"Workspace Tabs User {portal_id}",
        hashed_password="hash",
        is_active=True,
        tenant_id=portal_id,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _resolve_platform_owner(db: Session) -> User | None:
    row = db.query(PlatformSettings).filter_by(id=PLATFORM_SETTINGS_SINGLETON_ID).first()
    if row is None or row.platform_owner_user_id is None:
        return None
    return db.query(User).filter(User.id == row.platform_owner_user_id).first()


def _create_tab_payload(*, portal_id: int, route_suffix: str = "page/1") -> dict:
    route = f"/portal/{portal_id}/object-types/tasks/{route_suffix}"
    return {
        "title": f"Tab {portal_id}",
        "route": route,
        "module_key": "office",
        "page_type": "object_plan",
        "tenant_id": portal_id,
        "is_pinned": True,
    }


def test_workspace_tabs_list_requires_auth(client: TestClient, db: Session) -> None:
    portal_a = 9401
    _ensure_portals(db, portal_a, 9402)
    db.commit()

    response = client.get("/workspace-tabs", params={"tenant_id": portal_a})
    assert response.status_code == 401, response.text


def test_workspace_tabs_list_own_tenant_returns_200(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9403
    portal_b = 9404
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/workspace-tabs",
        params={"tenant_id": portal_a},
        headers=_auth_headers(user),
    )

    assert response.status_code == 200, response.text


def test_workspace_tabs_list_foreign_tenant_returns_403(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9405
    portal_b = 9406
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/workspace-tabs",
        params={"tenant_id": portal_b},
        headers=_auth_headers(user),
    )

    assert response.status_code == 403, response.text


def test_workspace_tabs_create_own_tenant_returns_201(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9407
    portal_b = 9408
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/workspace-tabs",
        headers=_auth_headers(user),
        json=_create_tab_payload(portal_id=portal_a, route_suffix="plan"),
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["tenant_id"] == portal_a


def test_workspace_tabs_create_foreign_tenant_returns_403(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9409
    portal_b = 9410
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/workspace-tabs",
        headers=_auth_headers(user),
        json=_create_tab_payload(portal_id=portal_b, route_suffix="plan"),
    )

    assert response.status_code == 403, response.text


def test_workspace_tabs_create_route_tenant_mismatch_returns_422(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9411
    portal_b = 9412
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    payload = _create_tab_payload(portal_id=portal_a, route_suffix="plan")
    payload["tenant_id"] = portal_b

    response = client.post(
        "/workspace-tabs",
        headers=_auth_headers(user),
        json=payload,
    )

    assert response.status_code == 422, response.text


def test_workspace_tabs_patch_foreign_tenant_tab_returns_403(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9413
    portal_b = 9414
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    db.flush()

    tab = UserWorkspaceTab(
        user_id=user_a.id,
        tenant_id=portal_b,
        title="Foreign tab",
        route=f"/portal/{portal_b}/page/1",
        module_key="office",
        page_type="portal_page",
        context_json={},
        is_pinned=True,
        is_minimized=False,
        sort_order=100,
    )
    db.add(tab)
    db.commit()
    db.refresh(tab)

    response = client.patch(
        f"/workspace-tabs/{tab.id}",
        headers=_auth_headers(user_a),
        json={"title": "Hacked"},
    )

    assert response.status_code == 403, response.text


def test_workspace_tabs_delete_foreign_tenant_tab_returns_403(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9415
    portal_b = 9416
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.flush()

    tab = UserWorkspaceTab(
        user_id=user_a.id,
        tenant_id=portal_b,
        title="Foreign tab",
        route=f"/portal/{portal_b}/page/2",
        module_key="office",
        page_type="portal_page",
        context_json={},
        is_pinned=True,
        is_minimized=False,
        sort_order=100,
    )
    db.add(tab)
    db.commit()
    db.refresh(tab)

    response = client.delete(
        f"/workspace-tabs/{tab.id}",
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403, response.text


def test_workspace_tabs_open_foreign_tenant_tab_returns_403(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9417
    portal_b = 9418
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.flush()

    tab = UserWorkspaceTab(
        user_id=user_a.id,
        tenant_id=portal_b,
        title="Foreign tab",
        route=f"/portal/{portal_b}/page/3",
        module_key="office",
        page_type="portal_page",
        context_json={},
        is_pinned=True,
        is_minimized=False,
        sort_order=100,
    )
    db.add(tab)
    db.commit()
    db.refresh(tab)

    response = client.post(
        f"/workspace-tabs/{tab.id}/open",
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403, response.text


def test_workspace_tabs_reorder_foreign_tenant_tab_returns_403(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9419
    portal_b = 9420
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.flush()

    tab = UserWorkspaceTab(
        user_id=user_a.id,
        tenant_id=portal_b,
        title="Foreign tab",
        route=f"/portal/{portal_b}/page/4",
        module_key="office",
        page_type="portal_page",
        context_json={},
        is_pinned=True,
        is_minimized=False,
        sort_order=100,
    )
    db.add(tab)
    db.commit()
    db.refresh(tab)

    response = client.post(
        "/workspace-tabs/reorder",
        headers=_auth_headers(user_a),
        json={"items": [{"id": str(tab.id), "sort_order": 1}]},
    )

    assert response.status_code == 403, response.text


def test_workspace_tabs_platform_owner_can_list_foreign_tenant(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9421
    portal_b = 9422
    _ensure_portals(db, portal_a, portal_b)
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("Platform owner is not configured in test database")
    db.commit()

    response = client.get(
        "/workspace-tabs",
        params={"tenant_id": portal_b},
        headers=_auth_headers(owner),
    )

    assert response.status_code == 200, response.text


def test_workspace_tabs_deleted_tab_returns_404(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9423
    portal_b = 9424
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.flush()

    tab = UserWorkspaceTab(
        user_id=user.id,
        tenant_id=portal_a,
        title="Deleted tab",
        route=f"/portal/{portal_a}/page/5",
        module_key="office",
        page_type="portal_page",
        context_json={},
        is_pinned=True,
        is_minimized=False,
        sort_order=100,
    )
    db.add(tab)
    db.flush()
    tab_id = tab.id
    db.delete(tab)
    db.commit()

    response = client.patch(
        f"/workspace-tabs/{tab_id}",
        headers=_auth_headers(user),
        json={"title": "Gone"},
    )

    assert response.status_code == 404, response.text


def test_workspace_tabs_list_hides_foreign_tenant_tabs_without_filter(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9425
    portal_b = 9426
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.flush()

    own_tab = UserWorkspaceTab(
        user_id=user_a.id,
        tenant_id=portal_a,
        title="Own tab",
        route=f"/portal/{portal_a}/page/6",
        module_key="office",
        page_type="portal_page",
        context_json={},
        is_pinned=True,
        is_minimized=False,
        sort_order=100,
    )
    foreign_tab = UserWorkspaceTab(
        user_id=user_a.id,
        tenant_id=portal_b,
        title="Foreign tab",
        route=f"/portal/{portal_b}/page/7",
        module_key="office",
        page_type="portal_page",
        context_json={},
        is_pinned=True,
        is_minimized=False,
        sort_order=200,
    )
    db.add_all([own_tab, foreign_tab])
    db.commit()

    response = client.get("/workspace-tabs", headers=_auth_headers(user_a))
    assert response.status_code == 200, response.text

    tenant_ids = {item.get("tenant_id") for item in response.json()}
    assert portal_b not in tenant_ids
    assert portal_a in tenant_ids
