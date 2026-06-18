"""HTTP integration tests for company-scoped calendar tenant isolation."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.calendar.models import CalendarEvent
from app.modules.chats.models import Chat
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.notifications.models import Notification, NotificationRecipient
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
                    name=f"Calendar ISO {label} {_suffix()}",
                    code=f"calendar_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session, name: str = "user") -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=f"calendar_iso_{name}_{_suffix()}", description="test")
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
        email=f"calendar_iso_{portal_id}_{label}_{_suffix()}@test.local",
        full_name=full_name or f"Calendar User {portal_id} {label}",
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


def _event_payload(*, participant_ids: list[int]) -> dict:
    start = datetime.utcnow() + timedelta(days=1)
    end = start + timedelta(hours=1)
    return {
        "title": "Демонстрация платформы ЯсноПро",
        "description": "Корпоративное событие",
        "event_type": "video_meeting",
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
        "participant_ids": participant_ids,
        "create_event_chat": True,
        "create_video_meeting": True,
    }


def test_tenant_user_can_create_calendar_event(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 89001
    _ensure_portals(db, portal_a, portal_a + 1)

    director = _create_tenant_user(db, portal_id=portal_a, label="dir", full_name="Генеральный директор")
    manager = _create_tenant_user(db, portal_id=portal_a, label="mgr", full_name="Руководитель проекта")
    engineer = _create_tenant_user(db, portal_id=portal_a, label="eng", full_name="Инженер проекта")
    db.commit()

    response = client.post(
        f"/tenants/{portal_a}/calendar/events",
        headers=_auth_headers(director),
        json=_event_payload(participant_ids=[manager.id, engineer.id]),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["tenant_id"] == portal_a
    assert body["title"] == "Демонстрация платформы ЯсноПро"
    assert body["chat_id"] is not None
    assert len(body["participants"]) == 3


def test_tenant_user_sees_only_own_tenant_events(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 89002
    portal_b = 89003
    _ensure_portals(db, portal_a, portal_b)

    user_a = _create_tenant_user(db, portal_id=portal_a, label="a")
    user_b = _create_tenant_user(db, portal_id=portal_b, label="b")
    db.commit()

    create_a = client.post(
        f"/tenants/{portal_a}/calendar/events",
        headers=_auth_headers(user_a),
        json=_event_payload(participant_ids=[]),
    )
    create_b = client.post(
        f"/tenants/{portal_b}/calendar/events",
        headers=_auth_headers(user_b),
        json=_event_payload(participant_ids=[]),
    )
    assert create_a.status_code == 201
    assert create_b.status_code == 201

    list_a = client.get(
        f"/tenants/{portal_a}/calendar/events",
        headers=_auth_headers(user_a),
    )
    assert list_a.status_code == 200
    ids_a = {item["id"] for item in list_a.json()}
    assert create_a.json()["id"] in ids_a
    assert create_b.json()["id"] not in ids_a


def test_foreign_tenant_event_blocked(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 89004
    portal_b = 89005
    _ensure_portals(db, portal_a, portal_b)

    user_a = _create_tenant_user(db, portal_id=portal_a, label="a")
    user_b = _create_tenant_user(db, portal_id=portal_b, label="b")
    db.commit()

    response = client.post(
        f"/tenants/{portal_b}/calendar/events",
        headers=_auth_headers(user_a),
        json=_event_payload(participant_ids=[user_b.id]),
    )

    assert response.status_code == 403


def test_participant_receives_notification(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 89006
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    participant = _create_tenant_user(db, portal_id=portal_a, label="participant")
    db.commit()

    response = client.post(
        f"/tenants/{portal_a}/calendar/events",
        headers=_auth_headers(creator),
        json=_event_payload(participant_ids=[participant.id]),
    )
    assert response.status_code == 201
    event_id = response.json()["id"]

    notifications = (
        db.query(Notification)
        .join(NotificationRecipient)
        .filter(NotificationRecipient.user_id == participant.id)
        .all()
    )
    assert any(
        notification.type == "calendar_invite"
        and notification.context.get("event_id") == event_id
        for notification in notifications
    )


def test_event_can_create_linked_chat(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 89007
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    db.commit()

    response = client.post(
        f"/tenants/{portal_a}/calendar/events",
        headers=_auth_headers(creator),
        json=_event_payload(participant_ids=[]),
    )
    assert response.status_code == 201
    chat_id = response.json()["chat_id"]
    assert chat_id is not None
    assert db.query(Chat).filter(Chat.id == chat_id).first() is not None


def test_event_participant_can_respond_accepted(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 89008
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    participant = _create_tenant_user(db, portal_id=portal_a, label="participant")
    db.commit()

    created = client.post(
        f"/tenants/{portal_a}/calendar/events",
        headers=_auth_headers(creator),
        json=_event_payload(participant_ids=[participant.id]),
    )
    event_id = created.json()["id"]

    response = client.post(
        f"/tenants/{portal_a}/calendar/events/{event_id}/respond",
        headers=_auth_headers(participant),
        json={"status": "accepted"},
    )
    assert response.status_code == 200
    body = response.json()
    participant_row = next(item for item in body["participants"] if item["user_id"] == participant.id)
    assert participant_row["status"] == "accepted"


def test_non_participant_same_tenant_can_see_event(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 89009
    _ensure_portals(db, portal_a, portal_a + 1)

    creator = _create_tenant_user(db, portal_id=portal_a, label="creator")
    colleague = _create_tenant_user(db, portal_id=portal_a, label="colleague")
    db.commit()

    created = client.post(
        f"/tenants/{portal_a}/calendar/events",
        headers=_auth_headers(creator),
        json=_event_payload(participant_ids=[]),
    )
    event_id = created.json()["id"]

    response = client.get(
        f"/tenants/{portal_a}/calendar/events/{event_id}",
        headers=_auth_headers(colleague),
    )
    assert response.status_code == 200


def test_foreign_tenant_cannot_access_event_by_direct_id(db: Session, client: TestClient) -> None:
    _ensure_platform_settings(db)
    portal_a = 89010
    portal_b = 89011
    _ensure_portals(db, portal_a, portal_b)

    user_a = _create_tenant_user(db, portal_id=portal_a, label="a")
    user_b = _create_tenant_user(db, portal_id=portal_b, label="b")
    db.commit()

    created = client.post(
        f"/tenants/{portal_a}/calendar/events",
        headers=_auth_headers(user_a),
        json=_event_payload(participant_ids=[]),
    )
    event_id = created.json()["id"]

    response = client.get(
        f"/tenants/{portal_b}/calendar/events/{event_id}",
        headers=_auth_headers(user_b),
    )
    assert response.status_code in {403, 404}

    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).one()
    assert event.tenant_id == portal_a
