import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.auth.security import hash_password
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.owner_service import upsert_platform_owner
from app.modules.control_plane.platform_profile.schemas import PlatformOwnerUpsert
from app.modules.control_plane.platform_profile.service import get_or_create_platform_settings
from app.modules.control_plane.platform_users.constants import (
    PLATFORM_ROLE_OWNER,
    PLATFORM_STATUS_ACTIVE,
)
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.control_plane.platform_users.registry_service import (
    get_platform_user_by_user_id,
    list_platform_users,
    sync_platform_owner_to_registry,
    upsert_platform_user,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.models import Portal
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import Role, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            PlatformSettings.__table__,
            PlatformUser.__table__,
            PlatformEventJournalEntry.__table__,
            Portal.__table__,
            TenantUserMembership.__table__,
            User.__table__,
            Role.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add(Role(id=4, name="superadmin", description="Platform Owner"))
    session.commit()
    try:
        yield session
    finally:
        session.close()


def _assign_owner_settings(db_session, *, user_id: int) -> PlatformSettings:
    row = get_or_create_platform_settings(db_session)
    row.platform_owner_user_id = user_id
    row.platform_owner_full_name = "Михаил Запевалов"
    row.platform_owner_email = "zmn8@ya.ru"
    db_session.commit()
    return row


def test_owner_assigned_but_platform_user_missing_appears_in_list(db_session):
    db_session.add(Portal(id=1, name="DEV", tenant_type="DEV"))
    owner_user = User(
        email="zmn8@ya.ru",
        full_name="Михаил Запевалов",
        hashed_password=hash_password("password123"),
        is_active=True,
        role_id=4,
        tenant_id=1,
    )
    db_session.add(owner_user)
    db_session.commit()

    _assign_owner_settings(db_session, user_id=owner_user.id)
    assert get_platform_user_by_user_id(db_session, owner_user.id) is None

    users = list_platform_users(db_session, sync_owner=True)
    db_session.commit()

    assert len(users) == 1
    assert users[0]["id"] == owner_user.id
    assert users[0]["platform_role"] == PLATFORM_ROLE_OWNER
    assert users[0]["platform_status"] == PLATFORM_STATUS_ACTIVE
    assert users[0]["is_platform_owner"] is True


def test_assign_owner_creates_platform_user(db_session):
    row = get_or_create_platform_settings(db_session)

    owner = upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Platform Owner",
            email="owner@yasno.ru",
            phone="+79991112233",
            password="secret123",
            password_confirm="secret123",
        ),
    )
    db_session.commit()

    registry_row = get_platform_user_by_user_id(db_session, owner.user_id)
    assert registry_row is not None
    assert registry_row.platform_role == PLATFORM_ROLE_OWNER
    assert registry_row.status == PLATFORM_STATUS_ACTIVE


def test_assign_same_owner_twice_creates_single_platform_user_record(db_session):
    row = get_or_create_platform_settings(db_session)
    payload = PlatformOwnerUpsert(
        full_name="Platform Owner",
        email="owner@yasno.ru",
        password="secret123",
        password_confirm="secret123",
    )

    upsert_platform_owner(db_session, row, payload)
    db_session.commit()

    first_count = db_session.query(PlatformUser).count()
    assert first_count == 1

    upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Platform Owner Updated",
            email="owner@yasno.ru",
        ),
    )
    db_session.commit()

    assert db_session.query(PlatformUser).count() == 1
    registry_row = get_platform_user_by_user_id(db_session, row.platform_owner_user_id)
    assert registry_row is not None
    assert registry_row.platform_role == PLATFORM_ROLE_OWNER


def test_sync_platform_owner_to_registry_is_idempotent(db_session):
    owner_user = User(
        email="zmn8@ya.ru",
        full_name="Михаил Запевалов",
        hashed_password=hash_password("password123"),
        is_active=True,
        role_id=4,
        tenant_id=1,
    )
    db_session.add(owner_user)
    db_session.commit()

    settings_row = _assign_owner_settings(db_session, user_id=owner_user.id)

    sync_platform_owner_to_registry(db_session, settings_row)
    sync_platform_owner_to_registry(db_session, settings_row)
    db_session.commit()

    assert db_session.query(PlatformUser).count() == 1
