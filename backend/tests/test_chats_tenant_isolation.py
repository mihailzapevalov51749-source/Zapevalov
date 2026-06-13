"""HTTP integration tests for company-scoped chat tenant isolation."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.chats.models import Chat, ChatParticipant
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
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


def _ensure_platform_settings(db: Session) -> None:
    existing = db.query(PlatformSettings).filter_by(id=PLATFORM_SETTINGS_SINGLETON_ID).first()
    if existing is None:
        db.add(PlatformSettings(id=PLATFORM_SETTINGS_SINGLETON_ID))
        db.flush()


def _ensure_portals(db: Session, portal_a: int, portal_b: int) -> None:
    for portal_id, label in ((portal_a, "A"), (portal_b, "B")):
        existing = db.query(Portal).filter(Portal.id == portal_id).first()
        if existing is None:
            db.add(
                Portal(
                    id=portal_id,
                    name=f"Chat ISO {label} {_suffix()}",
                    code=f"chat_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session, name: str = "user") -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=f"chat_iso_{name}_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(
    db: Session,
    *,
    portal_id: int,
    label: str,
    full_name: str | None = None,
) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"chat_iso_{portal_id}_{label}_{_suffix()}@test.local",
        full_name=full_name or f"Chat User {portal_id} {label}",
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


def _create_group_chat(
    client: TestClient,
    *,
    creator: User,
    tenant_id: int,
    participant_ids: list[int],
    title: str = "Project chat",
) -> tuple[int, dict]:
    response = client.post(
        "/chats",
        headers=_auth_headers(creator),
        json={
            "title": title,
            "type": "group",
            "tenant_id": tenant_id,
            "participant_ids": participant_ids,
        },
    )
    return response.status_code, response.json() if response.content else {}


def test_tenant_user_search_returns_only_own_company_users(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88001
    portal_b = 88002
    _ensure_portals(db, portal_a, portal_b)

    user_a = _create_tenant_user(db, portal_id=portal_a, label="a1", full_name="Генеральный директор")
    _create_tenant_user(db, portal_id=portal_a, label="a2", full_name="Руководитель проекта")
    _create_tenant_user(db, portal_id=portal_b, label="b1", full_name="Foreign User")
    db.commit()

    response = client.get(
        f"/chats/users/search?tenant_id={portal_a}",
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 2
    assert all(item["email"].endswith("@test.local") for item in body)
    assert all("Foreign User" not in (item.get("full_name") or "") for item in body)


def test_tenant_user_cannot_search_foreign_company_users(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88003
    portal_b = 88004
    _ensure_portals(db, portal_a, portal_b)

    user_a = _create_tenant_user(db, portal_id=portal_a, label="a1")
    db.commit()

    response = client.get(
        f"/chats/users/search?tenant_id={portal_b}",
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403


def test_create_group_chat_with_same_tenant_users_allowed(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88005
    _ensure_portals(db, portal_a, portal_a + 1)

    director = _create_tenant_user(db, portal_id=portal_a, label="dir", full_name="Генеральный директор")
    manager = _create_tenant_user(db, portal_id=portal_a, label="mgr", full_name="Руководитель проекта")
    engineer = _create_tenant_user(db, portal_id=portal_a, label="eng", full_name="Инженер проекта")
    db.commit()

    status_code, body = _create_group_chat(
        client,
        creator=director,
        tenant_id=portal_a,
        participant_ids=[manager.id, engineer.id],
        title="Демонстрация ЯсноПро",
    )

    assert status_code == 201
    assert body["tenant_id"] == portal_a
    assert len(body["participants"]) == 3


def test_create_group_chat_with_foreign_tenant_user_blocked(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88006
    portal_b = 88007
    _ensure_portals(db, portal_a, portal_b)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    foreign_user = _create_tenant_user(db, portal_id=portal_b, label="foreign")
    db.commit()

    status_code, _body = _create_group_chat(
        client,
        creator=creator,
        tenant_id=portal_a,
        participant_ids=[foreign_user.id],
    )

    assert status_code == 403


def test_direct_chat_with_same_tenant_user_allowed(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88008
    _ensure_portals(db, portal_a, portal_a + 1)

    user_a = _create_tenant_user(db, portal_id=portal_a, label="a")
    user_b = _create_tenant_user(db, portal_id=portal_a, label="b")
    db.commit()

    response = client.post(
        "/chats/direct",
        headers=_auth_headers(user_a),
        json={"user_id": user_b.id, "tenant_id": portal_a},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "direct"
    assert body["tenant_id"] == portal_a


def test_direct_chat_returns_existing_chat_without_duplicate(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88014
    _ensure_portals(db, portal_a, portal_a + 1)

    user_a = _create_tenant_user(db, portal_id=portal_a, label="a")
    user_b = _create_tenant_user(db, portal_id=portal_a, label="b")
    db.commit()

    first = client.post(
        "/chats/direct",
        headers=_auth_headers(user_a),
        json={"user_id": user_b.id, "tenant_id": portal_a},
    )
    second = client.post(
        "/chats/direct",
        headers=_auth_headers(user_a),
        json={"user_id": user_b.id, "tenant_id": portal_a},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]


def test_direct_chat_with_foreign_tenant_user_blocked(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88009
    portal_b = 88010
    _ensure_portals(db, portal_a, portal_b)

    user_a = _create_tenant_user(db, portal_id=portal_a, label="a")
    user_b = _create_tenant_user(db, portal_id=portal_b, label="b")
    db.commit()

    response = client.post(
        "/chats/direct",
        headers=_auth_headers(user_a),
        json={"user_id": user_b.id, "tenant_id": portal_a},
    )

    assert response.status_code == 403


def test_add_participant_from_same_tenant_allowed(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88011
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    colleague = _create_tenant_user(db, portal_id=portal_a, label="colleague")
    db.commit()

    create_status, create_body = _create_group_chat(
        client,
        creator=creator,
        tenant_id=portal_a,
        participant_ids=[],
    )
    assert create_status == 201
    chat_id = create_body["id"]

    response = client.post(
        f"/chats/{chat_id}/participants",
        headers=_auth_headers(creator),
        json={"user_id": colleague.id, "role": "member"},
    )

    assert response.status_code == 201


def test_add_participant_from_other_tenant_blocked(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88012
    portal_b = 88013
    _ensure_portals(db, portal_a, portal_b)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    foreign_user = _create_tenant_user(db, portal_id=portal_b, label="foreign")
    db.commit()

    create_status, create_body = _create_group_chat(
        client,
        creator=creator,
        tenant_id=portal_a,
        participant_ids=[],
    )
    assert create_status == 201
    chat_id = create_body["id"]

    response = client.post(
        f"/chats/{chat_id}/participants",
        headers=_auth_headers(creator),
        json={"user_id": foreign_user.id, "role": "member"},
    )

    assert response.status_code == 403


def test_non_participant_cannot_read_chat(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88014
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    outsider = _create_tenant_user(db, portal_id=portal_a, label="outsider")
    db.commit()

    create_status, create_body = _create_group_chat(
        client,
        creator=creator,
        tenant_id=portal_a,
        participant_ids=[],
    )
    assert create_status == 201
    chat_id = create_body["id"]

    response = client.get(
        f"/chats/{chat_id}/messages",
        headers=_auth_headers(outsider),
    )

    assert response.status_code == 403


def test_unread_count_updates_after_message_and_read_state(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88015
    _ensure_portals(db, portal_a, portal_a + 1)

    sender = _create_tenant_user(db, portal_id=portal_a, label="sender")
    recipient = _create_tenant_user(db, portal_id=portal_a, label="recipient")
    db.commit()

    create_status, create_body = _create_group_chat(
        client,
        creator=sender,
        tenant_id=portal_a,
        participant_ids=[recipient.id],
        title="Unread flow",
    )
    assert create_status == 201
    chat_id = create_body["id"]

    list_before = client.get("/chats", headers=_auth_headers(recipient))
    assert list_before.status_code == 200
    unread_before = next(item for item in list_before.json() if item["id"] == chat_id)["unread_count"]
    assert unread_before == 0

    message_response = client.post(
        f"/chats/{chat_id}/messages",
        headers=_auth_headers(sender),
        json={"content": "Новое сообщение"},
    )
    assert message_response.status_code == 201
    message_id = message_response.json()["id"]

    list_after_send = client.get("/chats", headers=_auth_headers(recipient))
    assert list_after_send.status_code == 200
    unread_after_send = next(item for item in list_after_send.json() if item["id"] == chat_id)["unread_count"]
    assert unread_after_send == 1

    read_state_response = client.patch(
        f"/chats/{chat_id}/read-state",
        headers=_auth_headers(recipient),
        json={"last_read_message_id": message_id},
    )
    assert read_state_response.status_code == 200

    list_after_read = client.get("/chats", headers=_auth_headers(recipient))
    assert list_after_read.status_code == 200
    unread_after_read = next(item for item in list_after_read.json() if item["id"] == chat_id)["unread_count"]
    assert unread_after_read == 0


def test_chat_list_includes_created_by_id(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88016
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    db.commit()

    create_status, create_body = _create_group_chat(
        client,
        creator=creator,
        tenant_id=portal_a,
        participant_ids=[],
        title="Creator metadata",
    )
    assert create_status == 201
    chat_id = create_body["id"]

    response = client.get("/chats", headers=_auth_headers(creator))
    assert response.status_code == 200

    chat_item = next(item for item in response.json() if item["id"] == chat_id)
    assert chat_item["created_by_id"] == creator.id


def test_non_creator_cannot_update_chat_settings(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88017
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    member = _create_tenant_user(db, portal_id=portal_a, label="member")
    db.commit()

    create_status, create_body = _create_group_chat(
        client,
        creator=creator,
        tenant_id=portal_a,
        participant_ids=[member.id],
        title="Protected settings",
    )
    assert create_status == 201
    chat_id = create_body["id"]

    response = client.patch(
        f"/chats/{chat_id}",
        headers=_auth_headers(member),
        json={"title": "Hacked title"},
    )

    assert response.status_code == 403


def test_non_creator_cannot_delete_chat(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 88018
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    member = _create_tenant_user(db, portal_id=portal_a, label="member")
    db.commit()

    create_status, create_body = _create_group_chat(
        client,
        creator=creator,
        tenant_id=portal_a,
        participant_ids=[member.id],
        title="Protected delete",
    )
    assert create_status == 201
    chat_id = create_body["id"]

    response = client.delete(
        f"/chats/{chat_id}",
        headers=_auth_headers(member),
    )

    assert response.status_code == 403
