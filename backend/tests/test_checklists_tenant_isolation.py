"""HTTP integration tests for Checklists API tenant isolation."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.checklists.models import ChecklistItem
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.platform.runtime.entities.models import RuntimeEntity
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
                    name=f"Checklists ISO {label} {_suffix()}",
                    code=f"checklists_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"checklists_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"checklists_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"Checklists User {portal_id}",
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


def _seed_runtime_entity(db: Session, *, portal_id: int) -> RuntimeEntity:
    record_number = int(uuid.uuid4().int % 900_000_000) + 100_000
    entity = RuntimeEntity(
        tenant_id=portal_id,
        object_type_key=f"checklists_iso_{_suffix()}",
        catalog_version=1,
        record_number=record_number,
    )
    db.add(entity)
    db.flush()
    return entity


def _seed_checklist_item(
    db: Session,
    *,
    entity: RuntimeEntity,
    title: str = "secret item",
    position: int = 1,
) -> ChecklistItem:
    item = ChecklistItem(
        entity_type="runtime_entity",
        entity_id=str(entity.id),
        title=title,
        position=position,
    )
    db.add(item)
    db.flush()
    return item


def test_cross_tenant_read_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9751
    portal_b = 9752
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_checklist_item(db, entity=entity_a, title="secret")
    db.commit()

    response = client.get(
        "/checklists/",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(user_b),
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_create_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9753
    portal_b = 9754
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/checklists/items",
        headers=_auth_headers(user_b),
        json={
            "entity": {
                "type": "runtime_entity",
                "id": str(entity_a.id),
            },
            "title": "intrusion",
        },
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_update_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9755
    portal_b = 9756
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    item = _seed_checklist_item(db, entity=entity_a, title="original")
    db.commit()

    response = client.patch(
        f"/checklists/items/{item.id}",
        headers=_auth_headers(user_b),
        json={"title": "hacked"},
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_delete_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9757
    portal_b = 9758
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    item = _seed_checklist_item(db, entity=entity_a)
    db.commit()

    response = client.delete(
        f"/checklists/items/{item.id}",
        headers=_auth_headers(user_b),
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_item_toggle_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9759
    portal_b = 9760
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    item = _seed_checklist_item(db, entity=entity_a)
    db.commit()

    response = client.patch(
        f"/checklists/items/{item.id}",
        headers=_auth_headers(user_b),
        json={"is_completed": True},
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_reorder_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9761
    portal_b = 9762
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    item = _seed_checklist_item(db, entity=entity_a, position=1)
    db.commit()

    response = client.post(
        "/checklists/reorder",
        headers=_auth_headers(user_b),
        json={"ordered_ids": [item.id]},
    )

    assert response.status_code == 403, response.text


def test_own_tenant_read_allowed(client: TestClient, db: Session) -> None:
    portal_a = 9763
    _ensure_portals(db, portal_a, 9764)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_checklist_item(db, entity=entity_a, title="visible")
    db.commit()

    response = client.get(
        "/checklists/",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 200, response.text
    assert response.json()["items"][0]["title"] == "visible"


def test_own_tenant_create_allowed(client: TestClient, db: Session) -> None:
    portal_a = 9765
    _ensure_portals(db, portal_a, 9766)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/checklists/items",
        headers=_auth_headers(user_a),
        json={
            "entity": {
                "type": "runtime_entity",
                "id": str(entity_a.id),
            },
            "title": "new item",
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["title"] == "new item"


def test_platform_owner_can_read_foreign_tenant_checklist(
    client: TestClient,
    db: Session,
) -> None:
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("Platform owner is not configured")

    portal_a = 9767
    _ensure_portals(db, portal_a, 9768)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_checklist_item(db, entity=entity_a, title="owner-visible")
    db.commit()

    response = client.get(
        "/checklists/",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(owner),
    )

    assert response.status_code == 200, response.text
    assert response.json()["items"][0]["title"] == "owner-visible"


def test_unknown_entity_id_returns_not_found(client: TestClient, db: Session) -> None:
    portal_a = 9769
    _ensure_portals(db, portal_a, 9770)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/checklists/",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(uuid.uuid4()),
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 404, response.text


def test_unsupported_entity_type_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9771
    _ensure_portals(db, portal_a, 9772)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/checklists/",
        params={
            "entity_type": "totally_fake_type",
            "entity_id": "123",
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403, response.text
