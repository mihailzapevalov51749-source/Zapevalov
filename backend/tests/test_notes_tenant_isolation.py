"""HTTP integration tests for Notes API tenant isolation."""

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
from app.modules.notes.models import Note
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
                    name=f"Notes ISO {label} {_suffix()}",
                    code=f"notes_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"notes_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"notes_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"Notes User {portal_id}",
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
        object_type_key=f"notes_iso_{_suffix()}",
        catalog_version=1,
        record_number=record_number,
    )
    db.add(entity)
    db.flush()
    return entity


def _seed_note(
    db: Session,
    *,
    entity: RuntimeEntity,
    content: str = "secret note",
) -> Note:
    note = Note(
        entity_type="runtime_entity",
        entity_id=str(entity.id),
        content=content,
        format="html",
    )
    db.add(note)
    db.flush()
    return note


def test_cross_tenant_read_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9551
    portal_b = 9552
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_note(db, entity=entity_a)
    db.commit()

    response = client.get(
        "/notes",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(user_b),
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_create_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9553
    portal_b = 9554
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/notes",
        headers=_auth_headers(user_b),
        json={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
            "content": "<p>intrusion</p>",
            "format": "html",
        },
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_update_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9555
    portal_b = 9556
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_note(db, entity=entity_a, content="original")
    db.commit()

    response = client.post(
        "/notes",
        headers=_auth_headers(user_b),
        json={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
            "content": "<p>hacked</p>",
            "format": "html",
        },
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_delete_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9557
    portal_b = 9558
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_note(db, entity=entity_a)
    db.commit()

    response = client.delete(
        "/notes",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(user_b),
    )

    assert response.status_code == 403, response.text


def test_own_tenant_read_allowed(client: TestClient, db: Session) -> None:
    portal_a = 9559
    _ensure_portals(db, portal_a, 9560)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_note(db, entity=entity_a, content="visible")
    db.commit()

    response = client.get(
        "/notes",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 200, response.text
    assert response.json()["content"] == "visible"


def test_own_tenant_create_allowed(client: TestClient, db: Session) -> None:
    portal_a = 9561
    _ensure_portals(db, portal_a, 9562)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/notes",
        headers=_auth_headers(user_a),
        json={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
            "content": "<p>new note</p>",
            "format": "html",
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["content"] == "<p>new note</p>"


def test_platform_owner_can_read_foreign_tenant_note(
    client: TestClient,
    db: Session,
) -> None:
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("Platform owner is not configured")

    portal_a = 9563
    _ensure_portals(db, portal_a, 9564)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_note(db, entity=entity_a, content="owner-visible")
    db.commit()

    response = client.get(
        "/notes",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(owner),
    )

    assert response.status_code == 200, response.text
    assert response.json()["content"] == "owner-visible"


def test_unknown_entity_id_returns_not_found(client: TestClient, db: Session) -> None:
    portal_a = 9565
    _ensure_portals(db, portal_a, 9566)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/notes",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(uuid.uuid4()),
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 404, response.text


def test_unsupported_entity_type_blocked(client: TestClient, db: Session) -> None:
    portal_a = 9567
    _ensure_portals(db, portal_a, 9568)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/notes",
        params={
            "entity_type": "totally_fake_type",
            "entity_id": "123",
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403, response.text
