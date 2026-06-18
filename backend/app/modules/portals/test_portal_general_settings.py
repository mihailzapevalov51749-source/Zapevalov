"""Tests for tenant portal general settings."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.portals.models import Portal
from app.modules.portals.schemas import PortalGeneralSettingsUpdate
from app.modules.portals.service import update_portal_general_settings


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine, tables=[Portal.__table__])
    session = sessionmaker(bind=engine)()
    session.add(
        Portal(
            id=10,
            name="Client Tenant",
            code="client",
            description="Initial description",
        )
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_update_portal_general_settings_persists_all_fields(db_session):
    payload = PortalGeneralSettingsUpdate(
        name="Updated Tenant",
        code="updated",
        description="Updated description",
        timezone="(UTC+00:00) UTC",
        date_format="YYYY-MM-DD",
        time_format="12 часов (02:30 PM)",
        week_start_day="Воскресенье",
        default_language="English",
    )

    portal = update_portal_general_settings(db_session, 10, payload)

    assert portal.name == "Updated Tenant"
    assert portal.code == "updated"
    assert portal.description == "Updated description"
    assert portal.timezone == "(UTC+00:00) UTC"
    assert portal.date_format == "YYYY-MM-DD"
    assert portal.time_format == "12h"
    assert portal.week_start_day == "Воскресенье"
    assert portal.default_language == "en"


def test_update_portal_general_settings_rejects_duplicate_code(db_session):
    db_session.add(Portal(id=11, name="Other", code="taken"))
    db_session.commit()

    payload = PortalGeneralSettingsUpdate(
        name="Client Tenant",
        code="taken",
        description=None,
        timezone="(UTC+03:00) Москва",
        date_format="DD.MM.YYYY",
        time_format="24 часа (14:30)",
        week_start_day="Понедельник",
        default_language="Русский",
    )

    with pytest.raises(HTTPException) as exc:
        update_portal_general_settings(db_session, 10, payload)

    assert exc.value.status_code == 409
