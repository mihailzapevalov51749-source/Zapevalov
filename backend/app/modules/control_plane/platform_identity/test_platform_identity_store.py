"""Tests for Platform Identity Store foundation (ADR-010)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_identity.constants import (
    CREDENTIAL_KIND_PASSWORD,
    CREDENTIAL_PROVIDER_LOCAL,
    CREDENTIAL_STATUS_ACTIVE,
    PLATFORM_IDENTITY_STATUS_ACTIVE,
    PLATFORM_ROLE_ADMIN,
    PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    PLATFORM_ROLE_OWNER,
)
from app.modules.control_plane.platform_identity.models import (
    PlatformCredential,
    PlatformIdentity,
    PlatformRoleBinding,
)
from app.modules.control_plane.platform_identity.repository import (
    PlatformCredentialRepository,
    PlatformIdentityRepository,
    PlatformRoleBindingRepository,
)
from app.modules.control_plane.platform_identity.service import (
    create_platform_credential,
    create_platform_identity,
    create_platform_role_binding,
    get_platform_identity_by_email,
    list_platform_credentials,
    list_platform_role_bindings,
)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            PlatformIdentity.__table__,
            PlatformRoleBinding.__table__,
            PlatformCredential.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_create_platform_identity_normalizes_email(db_session) -> None:
    identity = create_platform_identity(
        db_session,
        email="Owner@Platform.Test",
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
        full_name="Owner",
    )

    assert identity.platform_identity_id is not None
    assert identity.email == "owner@platform.test"
    assert get_platform_identity_by_email(db_session, "owner@platform.test") is not None


def test_create_role_binding_and_credential_chain(db_session) -> None:
    identity = create_platform_identity(
        db_session,
        email="admin@platform.test",
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
    )
    binding = create_platform_role_binding(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        platform_role=PLATFORM_ROLE_ADMIN,
        status=PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    )
    credential = create_platform_credential(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        credential_kind=CREDENTIAL_KIND_PASSWORD,
        provider_key=CREDENTIAL_PROVIDER_LOCAL,
        status=CREDENTIAL_STATUS_ACTIVE,
        password_hash="hashed",
    )

    assert binding.platform_identity_id == identity.platform_identity_id
    assert credential.platform_identity_id == identity.platform_identity_id
    assert len(list_platform_role_bindings(db_session, identity.platform_identity_id)) == 1
    assert len(list_platform_credentials(db_session, identity.platform_identity_id)) == 1


def test_repository_get_by_id(db_session) -> None:
    repo = PlatformIdentityRepository()
    identity_id = uuid.uuid4()
    created = repo.create(
        db_session,
        email="repo@platform.test",
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
        platform_identity_id=identity_id,
    )
    db_session.commit()

    loaded = repo.get_by_id(db_session, identity_id)
    assert loaded is not None
    assert loaded.email == created.email


def test_role_binding_repository_list_for_identity(db_session) -> None:
    identity_repo = PlatformIdentityRepository()
    binding_repo = PlatformRoleBindingRepository()

    identity = identity_repo.create(
        db_session,
        email="bindings@platform.test",
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
    )
    binding_repo.create(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        status=PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    )
    db_session.commit()

    bindings = binding_repo.list_for_identity(db_session, identity.platform_identity_id)
    assert len(bindings) == 1
    assert bindings[0].platform_role == PLATFORM_ROLE_OWNER


def test_credential_repository_password_row(db_session) -> None:
    identity_repo = PlatformIdentityRepository()
    credential_repo = PlatformCredentialRepository()

    identity = identity_repo.create(
        db_session,
        email="credential@platform.test",
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
    )
    credential_repo.create(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        credential_kind=CREDENTIAL_KIND_PASSWORD,
        provider_key=CREDENTIAL_PROVIDER_LOCAL,
        status=CREDENTIAL_STATUS_ACTIVE,
        password_hash="hash",
    )
    db_session.commit()

    credentials = credential_repo.list_for_identity(db_session, identity.platform_identity_id)
    assert len(credentials) == 1
    assert credentials[0].credential_kind == CREDENTIAL_KIND_PASSWORD
    assert credentials[0].provider_key == CREDENTIAL_PROVIDER_LOCAL
