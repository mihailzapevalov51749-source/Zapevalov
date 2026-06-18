"""Tests for WI-16 legacy demo_tehzak cleanup helpers."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.customer_companies.legacy_cleanup import (
    LEGACY_COMPANY_CODE,
    LEGACY_PORTAL_ID,
    LegacyCleanupError,
    LegacyCleanupSnapshot,
    LegacyEntityRef,
    assert_legacy_cleanup_target,
    build_legacy_cleanup_snapshot,
    delete_legacy_demo_tehzak,
    users_safe_to_delete,
    verify_legacy_demo_tehzak_removed,
)
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import User


@pytest.fixture()
def dev_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Portal.__table__,
            CustomerCompany.__table__,
            Page.__table__,
            NavigationItem.__table__,
            TenantUserMembership.__table__,
            TenantUserProfile.__table__,
            User.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _seed_legacy_company(dev_db) -> None:
    portal = Portal(
        id=LEGACY_PORTAL_ID,
        name="Demo Tehzak",
        original_name="Demo Tehzak",
        code=LEGACY_COMPANY_CODE,
        tenant_type=TenantType.CLIENT.value,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version="1.0.0",
        is_active=True,
        is_protected=False,
    )
    page = Page(id=793, portal_id=LEGACY_PORTAL_ID, title="Home", is_home=True)
    nav = NavigationItem(
        id=455,
        portal_id=LEGACY_PORTAL_ID,
        title="Home",
        type="page",
        page_id=793,
        sort_order=0,
    )
    company = CustomerCompany(
        id=8,
        name="Demo Tehzak",
        status="active",
        portal_id=LEGACY_PORTAL_ID,
        database_name="yasnopro_client",
        code=LEGACY_COMPANY_CODE,
        tenant_type=TenantType.CLIENT.value,
        tenant_status=TenantStatus.ACTIVE.value,
        home_page_id=793,
    )
    user = User(
        id=1848,
        email=f"wi16-{uuid.uuid4().hex[:8]}@example.com",
        full_name="WI16 Legacy User",
        hashed_password="test-hash",
        is_active=True,
    )
    membership = TenantUserMembership(
        id=239,
        tenant_id=LEGACY_PORTAL_ID,
        user_id=1848,
        role_key="superadmin",
        is_active=True,
        membership_status="active",
    )
    profile = TenantUserProfile(
        id=95,
        tenant_id=LEGACY_PORTAL_ID,
        user_id=1848,
        display_name="WI16 Legacy User",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    dev_db.add_all([portal, page, nav, company, user, membership, profile])
    dev_db.commit()


def test_snapshot_collects_legacy_entities(dev_db) -> None:
    _seed_legacy_company(dev_db)
    snapshot = build_legacy_cleanup_snapshot(dev_db)
    entities = {(item.entity, item.record_id) for item in snapshot.entities}
    assert ("portals", LEGACY_PORTAL_ID) in entities
    assert ("customer_companies", 8) in entities
    assert ("pages", 793) in entities
    assert ("navigation_items", 455) in entities
    assert users_safe_to_delete(snapshot) == [1848]


def test_delete_legacy_demo_tehzak_removes_core_records(dev_db) -> None:
    _seed_legacy_company(dev_db)
    deleted = delete_legacy_demo_tehzak(dev_db, include_module_registry=False)
    dev_db.commit()
    verification = verify_legacy_demo_tehzak_removed(dev_db)
    assert verification["cleanup_passed"] is True
    assert dev_db.get(Portal, LEGACY_PORTAL_ID) is None
    assert dev_db.get(User, 1848) is None
    assert any(item.entity == "portals" for item in deleted)


def test_refuses_protected_portal_id(dev_db) -> None:
    dev_db.add(
        Portal(
            id=21,
            name="Protected",
            original_name="Protected",
            code="ooo_rozetka",
            tenant_type=TenantType.CLIENT.value,
            tenant_status=TenantStatus.ACTIVE.value,
            template_version="1.0.0",
            is_active=True,
            is_protected=True,
        ),
    )
    dev_db.commit()
    with pytest.raises(LegacyCleanupError):
        assert_legacy_cleanup_target(dev_db, portal_id=21)


def test_portal_21_unaffected_after_legacy_delete(dev_db) -> None:
    _seed_legacy_company(dev_db)
    protected = Portal(
        id=21,
        name="ООО Розетка",
        original_name="ООО Розетка",
        code="ooo_rozetka",
        tenant_type=TenantType.CLIENT.value,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version="1.0.0",
        is_active=True,
        is_protected=True,
    )
    dev_db.add(protected)
    dev_db.commit()

    delete_legacy_demo_tehzak(dev_db, include_module_registry=False)
    dev_db.commit()

    assert dev_db.get(Portal, 21) is not None
    assert dev_db.get(Portal, LEGACY_PORTAL_ID) is None


def test_users_safe_to_delete_requires_exclusive_membership() -> None:
    snapshot = LegacyCleanupSnapshot(
        portal_id=14,
        portal_code=LEGACY_COMPANY_CODE,
        is_protected=False,
        entities=[
            LegacyEntityRef(entity="users", record_id=1, portal_id=14, extra={"exclusive": False}),
            LegacyEntityRef(entity="users", record_id=2, portal_id=14, extra={"exclusive": True}),
        ],
    )
    assert users_safe_to_delete(snapshot) == [2]
