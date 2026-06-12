"""Tests for designer system menu settings service."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.platform.designer.system_menu_settings.models import DesignerSystemMenuSetting
from app.modules.platform.designer.system_menu_settings.schemas import (
    DesignerSystemMenuSettingUpsert,
)
from app.modules.platform.designer.system_menu_settings.service import (
    clone_designer_system_menu_settings,
    list_designer_system_menu_settings,
    upsert_designer_system_menu_setting,
)
from app.modules.portals.models import Portal


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[Portal.__table__, DesignerSystemMenuSetting.__table__],
    )
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Portal(id=2, name="Template", code="platform_template"),
            Portal(id=21, name="Client", code="client_a"),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_upsert_and_list_designer_system_menu_settings(db_session):
    upsert_designer_system_menu_setting(
        db_session,
        tenant_id=2,
        item_key="objects",
        payload=DesignerSystemMenuSettingUpsert(
            icon="box",
            icon_type="library",
            sort_order=15,
            is_visible=True,
        ),
    )
    db_session.commit()

    settings = list_designer_system_menu_settings(db_session, 2)
    assert "objects" in settings
    assert settings["objects"].icon == "box"
    assert settings["objects"].sort_order == 15


def test_clone_designer_system_menu_settings_copies_template_to_client(db_session):
    upsert_designer_system_menu_setting(
        db_session,
        tenant_id=2,
        item_key="pages",
        payload=DesignerSystemMenuSettingUpsert(
            title="Страницы",
            icon_file_url="https://cdn.example/pages.png",
            sort_order=5,
            block_id=2,
        ),
    )
    upsert_designer_system_menu_setting(
        db_session,
        tenant_id=2,
        item_key="trash",
        payload=DesignerSystemMenuSettingUpsert(sort_order=99, is_visible=False),
    )
    db_session.commit()

    cloned = clone_designer_system_menu_settings(
        db_session,
        source_tenant_id=2,
        target_tenant_id=21,
    )
    db_session.commit()

    assert cloned == 2

    client_settings = list_designer_system_menu_settings(db_session, 21)
    assert client_settings["pages"].icon_file_url == "https://cdn.example/pages.png"
    assert client_settings["pages"].sort_order == 5
    assert client_settings["pages"].block_id == 2
    assert client_settings["trash"].is_visible is False
