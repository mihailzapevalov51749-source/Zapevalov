from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.minimal_runtime_shell import (
    ensure_tenant_home_runtime_shell,
    resolve_tenant_home_page_id,
)
from app.modules.tenant_environment.constants import TenantType


@pytest.fixture()
def shell_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Portal.__table__,
            Page.__table__,
            NavigationItem.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    portal = Portal(
        name="Shell tenant",
        original_name="Shell tenant",
        code="shell_tenant",
        tenant_type=TenantType.CLIENT.value,
    )
    session.add(portal)
    session.commit()
    try:
        yield session, portal
    finally:
        session.close()


def test_ensure_tenant_home_runtime_shell_creates_page_and_navigation(shell_db) -> None:
    db, portal = shell_db

    home_page_id = ensure_tenant_home_runtime_shell(
        db,
        portal_id=portal.id,
        title="ООО Ромашка",
    )
    db.commit()

    assert home_page_id > 0
    page = db.get(Page, home_page_id)
    assert page is not None
    assert page.is_home is True
    assert page.status == "published"

    nav_count = (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == portal.id, NavigationItem.page_id == home_page_id)
        .count()
    )
    assert nav_count == 1


def test_ensure_tenant_home_runtime_shell_is_idempotent(shell_db) -> None:
    db, portal = shell_db

    first_id = ensure_tenant_home_runtime_shell(db, portal_id=portal.id, title="Home")
    second_id = ensure_tenant_home_runtime_shell(db, portal_id=portal.id, title="Home")
    db.commit()

    assert first_id == second_id
    assert db.query(Page).filter(Page.portal_id == portal.id).count() == 1


def test_resolve_tenant_home_page_id_prefers_is_home(shell_db) -> None:
    db, portal = shell_db
    db.add(
        Page(
            portal_id=portal.id,
            title="Other",
            status="published",
            is_home=False,
            is_visible=True,
        )
    )
    home = Page(
        portal_id=portal.id,
        title="Home",
        status="published",
        is_home=True,
        is_visible=True,
    )
    db.add(home)
    db.commit()

    assert resolve_tenant_home_page_id(db, portal.id) == home.id
