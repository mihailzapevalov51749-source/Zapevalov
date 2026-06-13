"""HTTP integration tests for Notifications API user/tenant isolation."""

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
from app.modules.notifications.models import Notification, NotificationRecipient
from app.modules.notifications.service import NotificationService
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
                    name=f"Notifications ISO {label} {_suffix()}",
                    code=f"notifications_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"notifications_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"notifications_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"Notifications User {portal_id}",
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
        object_type_key=f"notifications_iso_{_suffix()}",
        catalog_version=1,
        record_number=record_number,
    )
    db.add(entity)
    db.flush()
    return entity


def _seed_notification_for_user(
    db: Session,
    *,
    recipient: User,
    portal_id: int,
    entity: RuntimeEntity,
    title: str = "Secret tenant notification",
) -> Notification:
    notification = Notification(
        type="comment_mention",
        category="comments",
        priority="normal",
        title=title,
        message="payload leak test",
        entity_type="runtime_entity",
        entity_id=str(entity.id),
        context={
            "tenant_id": portal_id,
            "entity_type": "runtime_entity",
            "entity_id": str(entity.id),
            "published_runtime_ref": {
                "runtime_route": f"/portal/{portal_id}/object-types/{entity.object_type_key}",
            },
        },
        created_by_id=recipient.id,
    )
    db.add(notification)
    db.flush()
    db.add(
        NotificationRecipient(
            notification_id=notification.id,
            user_id=recipient.id,
            is_read=False,
        )
    )
    db.flush()
    return notification


def test_user_cannot_list_another_users_notifications(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9661
    _ensure_portals(db, portal_a, portal_a + 1)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_a)
    entity = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_notification_for_user(
        db,
        recipient=user_b,
        portal_id=portal_a,
        entity=entity,
        title="Only for user B",
    )
    db.commit()

    response = client.get("/notifications", headers=_auth_headers(user_a))
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload == []


def test_foreign_tenant_notification_hidden_from_list(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9663
    portal_b = 9664
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_notification_for_user(
        db,
        recipient=user_b,
        portal_id=portal_a,
        entity=entity_a,
        title="Foreign tenant payload",
    )
    db.commit()

    response = client.get("/notifications", headers=_auth_headers(user_b))
    assert response.status_code == 200, response.text
    assert response.json() == []


def test_own_user_and_tenant_notification_allowed(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9665
    _ensure_portals(db, portal_a, portal_a + 1)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    notification = _seed_notification_for_user(
        db,
        recipient=user_a,
        portal_id=portal_a,
        entity=entity_a,
        title="Allowed notification",
    )
    db.commit()

    response = client.get("/notifications", headers=_auth_headers(user_a))
    assert response.status_code == 200, response.text
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == notification.id
    assert payload[0]["title"] == "Allowed notification"
    assert payload[0]["context"]["tenant_id"] == portal_a


def test_user_cannot_mark_read_another_users_notification(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9667
    _ensure_portals(db, portal_a, portal_a + 1)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_a)
    entity = _seed_runtime_entity(db, portal_id=portal_a)
    notification = _seed_notification_for_user(
        db,
        recipient=user_b,
        portal_id=portal_a,
        entity=entity,
    )
    db.commit()

    response = client.patch(
        f"/notifications/{notification.id}/read",
        headers=_auth_headers(user_a),
    )
    assert response.status_code == 200, response.text

    recipient = (
        db.query(NotificationRecipient)
        .filter(
            NotificationRecipient.notification_id == notification.id,
            NotificationRecipient.user_id == user_b.id,
        )
        .one()
    )
    assert recipient.is_read is False


def test_foreign_tenant_notification_cannot_be_marked_read(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9669
    portal_b = 9670
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    notification = _seed_notification_for_user(
        db,
        recipient=user_b,
        portal_id=portal_a,
        entity=entity_a,
    )
    db.commit()

    response = client.patch(
        f"/notifications/{notification.id}/read",
        headers=_auth_headers(user_b),
    )
    assert response.status_code == 200, response.text

    recipient = (
        db.query(NotificationRecipient)
        .filter(
            NotificationRecipient.notification_id == notification.id,
            NotificationRecipient.user_id == user_b.id,
        )
        .one()
    )
    assert recipient.is_read is False


def test_foreign_tenant_notification_excluded_from_unread_count(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9671
    portal_b = 9672
    _ensure_portals(db, portal_a, portal_b)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    _seed_notification_for_user(
        db,
        recipient=user_b,
        portal_id=portal_a,
        entity=entity_a,
    )
    db.commit()

    response = client.get("/notifications/unread-count", headers=_auth_headers(user_b))
    assert response.status_code == 200, response.text
    assert response.json()["count"] == 0


def test_platform_owner_sees_foreign_tenant_notification_when_assigned(
    client: TestClient,
    db: Session,
) -> None:
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("platform owner is not configured")

    portal_a = 9673
    portal_b = 9674
    _ensure_portals(db, portal_a, portal_b)
    entity_a = _seed_runtime_entity(db, portal_id=portal_a)
    notification = _seed_notification_for_user(
        db,
        recipient=owner,
        portal_id=portal_a,
        entity=entity_a,
        title="Owner assigned foreign tenant notification",
    )
    db.commit()

    response = client.get("/notifications", headers=_auth_headers(owner))
    assert response.status_code == 200, response.text
    ids = [item["id"] for item in response.json()]
    assert notification.id in ids


def test_notification_service_notify_still_creates_recipient_rows(db: Session) -> None:
    portal_a = 9675
    _ensure_portals(db, portal_a, portal_a + 1)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_a)
    entity = _seed_runtime_entity(db, portal_id=portal_a)

    notification = NotificationService.notify(
        db=db,
        type="comment_mention",
        title="Service notify",
        recipients=[user_a.id],
        created_by_id=user_b.id,
        entity_type="runtime_entity",
        entity_id=str(entity.id),
        context={"tenant_id": portal_a},
    )
    db.commit()

    assert notification is not None
    recipient = (
        db.query(NotificationRecipient)
        .filter(
            NotificationRecipient.notification_id == notification.id,
            NotificationRecipient.user_id == user_a.id,
        )
        .one()
    )
    assert recipient.is_read is False
