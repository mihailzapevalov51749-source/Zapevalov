"""Tests for immutable portal original_name vs mutable profile name."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.tenant_registry.service import list_tenant_registry
from app.modules.portals.models import Portal
from app.modules.portals.repository import create_portal


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine, tables=[Portal.__table__])
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_create_portal_sets_original_name(db_session):
    portal = create_portal(db_session, name="ООО Розетка", description=None)

    assert portal.original_name == "ООО Розетка"
    assert portal.name == "ООО Розетка"


def test_update_portal_general_settings_changes_name_not_original_name(db_session):
    from app.modules.portals import repository

    portal = create_portal(db_session, name="Розетка", description=None)

    updated = repository.update_portal_general_settings(
        db_session,
        portal,
        name="Розетка СПБ",
        short_name=None,
        public_slug="rozetka",
        public_slug_locked=False,
        description=None,
        timezone="(UTC+03:00) Москва",
        date_format="DD.MM.YYYY",
        time_format="24h",
        week_start_day="Понедельник",
        default_language="ru",
    )

    assert updated.name == "Розетка СПБ"
    assert updated.original_name == "Розетка"


def test_list_tenant_registry_returns_original_and_current_names(db_session, monkeypatch):
    db_session.add(
        Portal(
            id=21,
            name="Розетка СПБ",
            original_name="Розетка",
            code="ooo_rozetka",
            public_slug="rozetka",
            tenant_type="CLIENT",
            template_version="1.0.0",
            tenant_status="ACTIVE",
        )
    )
    db_session.commit()

    monkeypatch.setattr(
        "app.modules.control_plane.tenant_registry.service.build_active_platform_version_map",
        lambda _db: {21: "1.0.0"},
    )
    monkeypatch.setattr(
        "app.modules.control_plane.tenant_registry.service.resolve_company_portal_url",
        lambda *, public_slug: f"http://localhost:5173/{public_slug}",
    )

    items = list_tenant_registry(db_session)

    assert len(items) == 1
    assert items[0].id == 21
    assert items[0].original_name == "Розетка"
    assert items[0].name == "Розетка СПБ"
    assert items[0].public_slug == "rozetka"
    assert items[0].public_url == "http://localhost:5173/rozetka"


def test_list_tenant_registry_search_matches_original_name(db_session, monkeypatch):
    db_session.add_all(
        [
            Portal(
                id=1,
                name="Разработка",
                original_name="Разработка",
                tenant_type="DEV",
                template_version="1.0.0-dev",
                tenant_status="ACTIVE",
            ),
            Portal(
                id=21,
                name="Розетка СПБ",
                original_name="Розетка",
                code="ooo_rozetka",
                public_slug="rozetka",
                tenant_type="CLIENT",
                template_version="1.0.0",
                tenant_status="ACTIVE",
            ),
        ]
    )
    db_session.commit()

    monkeypatch.setattr(
        "app.modules.control_plane.tenant_registry.service.build_active_platform_version_map",
        lambda _db: {},
    )

    by_original = list_tenant_registry(db_session, search="Розетка")
    assert [item.id for item in by_original] == [21]

    by_current = list_tenant_registry(db_session, search="СПБ")
    assert [item.id for item in by_current] == [21]

    by_id = list_tenant_registry(db_session, search="21")
    assert [item.id for item in by_id] == [21]

    by_slug = list_tenant_registry(db_session, search="rozetka")
    assert [item.id for item in by_slug] == [21]
