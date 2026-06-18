"""Tests for Principal Layer foundation (WI-03)."""

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
from app.modules.control_plane.platform_identity.principal.audit import (
    principal_audit,
    principal_debug,
    who_am_i,
)
from app.modules.control_plane.platform_identity.principal.constants import (
    PRINCIPAL_TYPE_PLATFORM,
    PRINCIPAL_TYPE_SYSTEM,
    PRINCIPAL_TYPE_TENANT,
)
from app.modules.control_plane.platform_identity.principal.contract import PrincipalContract
from app.modules.control_plane.platform_identity.principal.factory import (
    PrincipalFactory,
    build_principal_from_user,
    build_system_principal,
)
from app.modules.control_plane.platform_identity.principal.resolver import (
    resolve_principal_from_user,
)
from app.modules.control_plane.platform_identity.principal.types import (
    BridgePrincipal,
    PlatformPrincipal,
    SystemPrincipal,
    TenantPrincipal,
)
from app.modules.control_plane.platform_identity.models import (
    PlatformCredential,
    PlatformIdentity,
    PlatformRoleBinding,
)
from app.modules.control_plane.platform_identity.service import (
    create_platform_credential,
    create_platform_identity,
    create_platform_role_binding,
)
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.tenant_users.membership_service import upsert_active_membership
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import Role, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Role.__table__,
            User.__table__,
            PlatformSettings.__table__,
            PlatformIdentity.__table__,
            PlatformRoleBinding.__table__,
            PlatformCredential.__table__,
            TenantUserMembership.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _seed_platform_owner(db_session) -> tuple[User, PlatformIdentity]:
    owner = User(
        email="owner@platform.test",
        full_name="Platform Owner",
        hashed_password="hash",
        is_active=True,
        tenant_id=None,
    )
    db_session.add(owner)
    db_session.flush()

    db_session.add(
        PlatformSettings(
            id=PLATFORM_SETTINGS_SINGLETON_ID,
            platform_name="ЯсноПро",
            platform_short_name="ЯсноПро",
            timezone="(UTC+03:00) Москва",
            date_format="DD.MM.YYYY",
            time_format="24h",
            week_start_day="Понедельник",
            default_language="ru",
            platform_owner_user_id=owner.id,
        )
    )

    identity = create_platform_identity(
        db_session,
        email=owner.email,
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
        full_name=owner.full_name,
    )
    create_platform_role_binding(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        status=PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    )
    create_platform_credential(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        credential_kind=CREDENTIAL_KIND_PASSWORD,
        provider_key=CREDENTIAL_PROVIDER_LOCAL,
        status=CREDENTIAL_STATUS_ACTIVE,
        password_hash="hash",
    )
    db_session.commit()
    return owner, identity


def test_platform_principal_from_store_identity(db_session) -> None:
    owner, identity = _seed_platform_owner(db_session)

    principal = build_principal_from_user(db_session, owner)

    assert isinstance(principal, PlatformPrincipal)
    assert principal.principal_type == PRINCIPAL_TYPE_PLATFORM
    assert principal.platform_identity_id == identity.platform_identity_id
    assert principal.platform_role == PLATFORM_ROLE_OWNER
    assert principal.email == "owner@platform.test"
    assert principal.tenant_id is None
    assert principal.role_key is None


def test_tenant_principal_for_tenant_user(db_session) -> None:
    role = Role(name="company_admin", description="admin")
    db_session.add(role)
    db_session.flush()

    user = User(
        email="tenant@company.test",
        hashed_password="hash",
        is_active=True,
        tenant_id=21,
        role_id=role.id,
    )
    db_session.add(user)
    db_session.flush()
    upsert_active_membership(
        db_session,
        tenant_id=21,
        user_id=user.id,
        role_key="company_admin",
    )
    db_session.commit()

    principal = PrincipalFactory.from_user(db_session, user)

    assert isinstance(principal, TenantPrincipal)
    assert principal.principal_type == PRINCIPAL_TYPE_TENANT
    assert principal.user_id == user.id
    assert principal.tenant_id == 21
    assert principal.role_key == "company_admin"
    assert principal.platform_identity_id is None


def test_platform_role_priority_picks_owner(db_session) -> None:
    owner = User(
        email="multi@platform.test",
        hashed_password="hash",
        is_active=True,
        tenant_id=None,
    )
    db_session.add(owner)
    db_session.flush()

    identity = create_platform_identity(
        db_session,
        email=owner.email,
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
    )
    create_platform_role_binding(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        platform_role=PLATFORM_ROLE_ADMIN,
        status=PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    )
    create_platform_role_binding(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        status=PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    )
    create_platform_credential(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        credential_kind=CREDENTIAL_KIND_PASSWORD,
        provider_key=CREDENTIAL_PROVIDER_LOCAL,
        status=CREDENTIAL_STATUS_ACTIVE,
        password_hash="hash",
    )
    db_session.commit()

    principal = resolve_principal_from_user(db_session, owner)
    assert isinstance(principal, PlatformPrincipal)
    assert principal.platform_role == PLATFORM_ROLE_OWNER


def test_system_principal_factory() -> None:
    principal = build_system_principal("bootstrap-recovery")
    assert isinstance(principal, SystemPrincipal)
    assert principal.principal_type == PRINCIPAL_TYPE_SYSTEM
    assert principal.system_actor == "bootstrap-recovery"


def test_principal_contract_and_audit_helpers(db_session) -> None:
    owner, identity = _seed_platform_owner(db_session)
    principal = build_principal_from_user(db_session, owner)

    assert isinstance(principal, PrincipalContract)
    contract = principal.to_contract_dict()
    assert contract["principal_type"] == PRINCIPAL_TYPE_PLATFORM
    assert contract["platform_identity_id"] == str(identity.platform_identity_id)
    assert contract["platform_role"] == PLATFORM_ROLE_OWNER

    assert who_am_i(principal)["platform_role"] == PLATFORM_ROLE_OWNER
    assert principal_debug(principal)["contract_ok"] is True
    audit = principal_audit(principal)
    assert audit["actor_principal_type"] == PRINCIPAL_TYPE_PLATFORM
    assert audit["actor_principal_id"] == str(identity.platform_identity_id)


def test_bridge_principal_contract_shape() -> None:
    ticket_id = uuid.uuid4()
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
        ticket_id=ticket_id,
    )
    contract = principal.to_contract_dict()
    assert contract["principal_type"] == "bridge"
    assert contract["tenant_id"] == 21
    assert contract["platform_role"] == PLATFORM_ROLE_OWNER
    assert contract["database_name"] == "yasnopro_client"
    assert contract["tenant_code"] == "ooo_rozetka"
    assert contract["ticket_id"] == str(ticket_id)
