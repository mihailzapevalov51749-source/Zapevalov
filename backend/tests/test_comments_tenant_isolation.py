"""HTTP integration tests for Comments API tenant isolation."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.comments.models import Comment
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.shared.enums import FieldType
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
                    name=f"Comments ISO {label} {_suffix()}",
                    code=f"comments_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"comments_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"comments_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"Comments User {portal_id}",
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


def _seed_runtime_entity(
    db: Session,
    *,
    portal_id: int,
) -> RuntimeEntity:
    record_number = int(uuid.uuid4().int % 900_000_000) + 100_000
    entity = RuntimeEntity(
        tenant_id=portal_id,
        object_type_key=f"comments_iso_{_suffix()}",
        catalog_version=1,
        record_number=record_number,
    )
    db.add(entity)
    db.flush()
    return entity


def _seed_comment(
    db: Session,
    *,
    entity: RuntimeEntity,
    author: User,
    body: str = "secret comment",
) -> Comment:
    comment = Comment(
        entity_type="runtime_entity",
        entity_id=str(entity.id),
        body=body,
        author_user_id=author.id,
    )
    db.add(comment)
    db.flush()
    return comment


def test_cross_tenant_read_blocked(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9531
    portal_b = 9532
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_comment(db, entity=entity_a, author=user_a)
    db.commit()

    response = client.get(
        "/comments",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(user_b),
    )

    assert response.status_code == 403, response.text


def test_cross_tenant_create_blocked(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9533
    portal_b = 9534
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/comments",
        headers=_auth_headers(user_b),
        json={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
            "body": "intrusion",
        },
    )

    assert response.status_code == 403, response.text


def test_own_tenant_read_allowed(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9535
    portal_b = 9536
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_comment(db, entity=entity_a, author=user_a, body="visible")
    db.commit()

    response = client.get(
        "/comments",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["body"] == "visible"


def test_own_tenant_create_allowed(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9537
    portal_b = 9538
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/comments",
        headers=_auth_headers(user_a),
        json={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
            "body": "new comment",
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["body"] == "new comment"


def test_platform_owner_can_read_foreign_tenant_comments(
    client: TestClient,
    db: Session,
) -> None:
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("Platform owner is not configured")

    portal_a = 9539
    portal_b = 9540
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_comment(db, entity=entity_a, author=user_a, body="owner-visible")
    db.commit()

    response = client.get(
        "/comments",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(entity_a.id),
        },
        headers=_auth_headers(owner),
    )

    assert response.status_code == 200, response.text
    assert response.json()["total"] == 1


def test_unknown_entity_id_returns_not_found(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9541
    _ensure_portals(db, portal_a, 9542)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/comments",
        params={
            "entity_type": "runtime_entity",
            "entity_id": str(uuid.uuid4()),
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 404, response.text


def test_unsupported_entity_type_blocked(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9543
    _ensure_portals(db, portal_a, 9544)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/comments",
        params={
            "entity_type": "totally_fake_type",
            "entity_id": "123",
        },
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403, response.text


def test_file_comment_respects_runtime_entity_tenant(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9545
    portal_b = 9546
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)

    stored_name = f"{uuid.uuid4().hex}.pdf"
    db.add(
        RuntimeEntityValue(
            tenant_id=portal_a,
            entity_id=entity_a.id,
            field_key="attachments",
            field_type=FieldType.FILE.value,
            value_json=[
                {
                    "file_id": stored_name,
                    "file_name": "report.pdf",
                    "file_url": f"/files/documents/{stored_name}",
                }
            ],
        )
    )
    _seed_comment(
        db,
        entity=entity_a,
        author=user_a,
        body="ignored",
    )
    db.add(
        Comment(
            entity_type="file",
            entity_id=stored_name,
            file_id=stored_name,
            body="file thread",
            author_user_id=user_a.id,
        )
    )
    db.commit()

    allowed = client.get(
        "/comments",
        params={
            "entity_type": "file",
            "entity_id": stored_name,
        },
        headers=_auth_headers(user_a),
    )
    denied = client.get(
        "/comments",
        params={
            "entity_type": "file",
            "entity_id": stored_name,
        },
        headers=_auth_headers(user_b),
    )

    assert allowed.status_code == 200, allowed.text
    assert allowed.json()["total"] == 1
    assert denied.status_code == 403, denied.text


def _system_comment_payload(entity: RuntimeEntity) -> dict:
    return {
        "entity_type": "runtime_entity",
        "entity_id": str(entity.id),
        "system_event_key": "comments_iso_test_event",
        "system_payload": {"source": "test"},
    }


def test_cross_tenant_system_comment_blocked(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9547
    portal_b = 9548
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/comments/system",
        headers=_auth_headers(user_b),
        json=_system_comment_payload(entity_a),
    )

    assert response.status_code == 403, response.text


def test_own_tenant_system_comment_allowed(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9549
    _ensure_portals(db, portal_a, 9550)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/comments/system",
        headers=_auth_headers(user_a),
        json=_system_comment_payload(entity_a),
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["kind"] == "system"
    assert payload["system_event_key"] == "comments_iso_test_event"


def test_platform_owner_can_create_system_comment_in_foreign_tenant(
    client: TestClient,
    db: Session,
) -> None:
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("Platform owner is not configured")

    portal_a = 9551
    _ensure_portals(db, portal_a, 9552)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/comments/system",
        headers=_auth_headers(owner),
        json=_system_comment_payload(entity_a),
    )

    assert response.status_code == 200, response.text
    assert response.json()["kind"] == "system"


def test_unknown_entity_system_comment_returns_not_found(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9553
    _ensure_portals(db, portal_a, 9554)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/comments/system",
        headers=_auth_headers(user_a),
        json={
            "entity_type": "runtime_entity",
            "entity_id": str(uuid.uuid4()),
            "system_event_key": "comments_iso_test_event",
            "system_payload": {},
        },
    )

    assert response.status_code == 404, response.text


def test_unsupported_entity_type_system_comment_blocked(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9555
    _ensure_portals(db, portal_a, 9556)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        "/comments/system",
        headers=_auth_headers(user_a),
        json={
            "entity_type": "totally_fake_type",
            "entity_id": "123",
            "system_event_key": "comments_iso_test_event",
            "system_payload": {},
        },
    )

    assert response.status_code == 403, response.text
