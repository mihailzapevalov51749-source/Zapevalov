import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.auth.security import hash_password
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.owner_service import (
    bootstrap_platform_owner_from_legacy,
    get_platform_owner,
    upsert_platform_owner,
)
from app.modules.control_plane.platform_profile.schemas import PlatformOwnerUpsert
from app.modules.control_plane.platform_profile.service import get_or_create_platform_settings
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
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


def test_bootstrap_platform_owner_from_legacy_superadmin(db_session):
    legacy_user = User(
        email="owner@example.com",
        full_name="Legacy Owner",
        phone="+79990000000",
        hashed_password=hash_password("password123"),
        is_active=True,
        role_id=4,
    )
    db_session.add(legacy_user)
    db_session.commit()

    row = get_or_create_platform_settings(db_session)
    row = bootstrap_platform_owner_from_legacy(db_session, row)
    db_session.commit()

    owner = get_platform_owner(db_session, row)
    assert owner is not None
    assert owner.user_id == legacy_user.id
    assert owner.full_name == "Legacy Owner"
    assert owner.email == "owner@example.com"


def test_upsert_platform_owner_creates_user(db_session):
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

    assert owner.exists is True
    assert owner.user_id is not None

    user = db_session.get(User, owner.user_id)
    assert user is not None
    assert user.full_name == "Platform Owner"
    assert user.role_id == 4
    assert user.is_active is True


def test_upsert_platform_owner_updates_existing_owner_without_creating_second_user(db_session):
    row = get_or_create_platform_settings(db_session)
    upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Owner One",
            email="one@yasno.ru",
            password="secret123",
            password_confirm="secret123",
        ),
    )
    db_session.commit()

    updated = upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Owner One Updated",
            email="one@yasno.ru",
            phone="+79990001122",
        ),
    )
    db_session.commit()

    assert updated.full_name == "Owner One Updated"
    assert updated.phone == "+79990001122"
    assert db_session.query(User).count() == 1


def test_platform_owner_avatar_comes_from_linked_user(db_session):
    row = get_or_create_platform_settings(db_session)
    owner = upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Owner Avatar",
            email="avatar@yasno.ru",
            password="secret123",
            password_confirm="secret123",
        ),
    )
    db_session.commit()

    user = db_session.get(User, owner.user_id)
    user.avatar_url = "https://cdn.example/avatar.png"
    user.avatar_settings = {"x": 4, "y": -2, "scale": 1.2}
    row.platform_owner_avatar_url = "https://cdn.example/stale.png"
    row.platform_owner_avatar_settings = {"x": 0, "y": 0, "scale": 1}
    db_session.commit()

    serialized = get_platform_owner(db_session, row)
    assert serialized.avatar_url == "https://cdn.example/avatar.png"
    assert serialized.avatar_settings == {"x": 4, "y": -2, "scale": 1.2}


def test_upsert_platform_owner_does_not_overwrite_user_avatar(db_session):
    row = get_or_create_platform_settings(db_session)
    upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Owner Avatar",
            email="avatar2@yasno.ru",
            password="secret123",
            password_confirm="secret123",
        ),
    )
    db_session.commit()

    user = db_session.get(User, row.platform_owner_user_id)
    user.avatar_url = "https://cdn.example/keep.png"
    user.avatar_settings = {"x": 1, "y": 2, "scale": 1.1}
    db_session.commit()

    upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Owner Avatar Updated",
            email="avatar2@yasno.ru",
            phone="+79990000001",
        ),
    )
    db_session.commit()

    db_session.refresh(user)
    assert user.avatar_url == "https://cdn.example/keep.png"
    assert user.avatar_settings == {"x": 1, "y": 2, "scale": 1.1}
