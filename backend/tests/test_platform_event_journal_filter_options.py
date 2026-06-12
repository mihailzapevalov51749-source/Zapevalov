from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.dependencies import get_current_user
from app.modules.platform.shared.dependencies import require_designer_user, require_tenant
from app.modules.platform_event_journal.filter_options import (
    get_platform_event_journal_filter_options,
    get_tenant_event_journal_filter_options,
)
from app.modules.platform_event_journal.label_resolvers import (
    resolve_event_category_label,
    resolve_event_type_label,
)
from app.modules.platform_event_journal.router import get_platform_event_journal_filter_options as platform_filter_route
from app.modules.platform.designer.event_journal.router import (
    get_tenant_event_journal_filter_options as tenant_filter_route,
)
from app.modules.platform_event_journal.tenant_audit_constants import TenantEventCategory, TenantEventCode


def test_platform_filter_options_exclude_tenant_categories():
    categories, event_types = get_platform_event_journal_filter_options()
    category_values = {item.value for item in categories}

    assert "pages" not in category_values
    assert "objects" not in category_values
    assert "trash" not in category_values
    assert "company" in category_values
    assert "platform_user" in category_values

    type_values = {item.value for item in event_types}
    assert "page_deleted" not in type_values
    assert "company_created" in type_values


def test_tenant_filter_options_exclude_platform_categories():
    categories, event_types = get_tenant_event_journal_filter_options(
        tenant_type="DEV",
    )
    category_values = {item.value for item in categories}

    assert "pages" in category_values
    assert "trash" in category_values
    assert "company" not in category_values
    assert "platform_user" not in category_values
    assert "provisioning" not in category_values

    type_values = {item.value for item in event_types}
    assert "page_deleted" in type_values
    assert "company_created" not in type_values
    assert "architecture" in type_values


def test_template_filter_options_exclude_development_types():
    _, event_types = get_tenant_event_journal_filter_options(tenant_type="TEMPLATE")
    type_values = {item.value for item in event_types}
    assert "architecture" not in type_values
    assert "page_deleted" in type_values


def test_scope_aware_category_labels():
    assert resolve_event_category_label("company", scope="platform") == "Company"
    assert resolve_event_category_label("pages", scope="tenant") == "Pages"
    assert resolve_event_category_label("company", scope="tenant") == "company"


def test_scope_aware_type_labels():
    assert (
        resolve_event_type_label("company_created", scope="platform")
        == "Создание компании"
    )
    assert (
        resolve_event_type_label("page_deleted", scope="tenant")
        == "Удаление страницы"
    )
    assert (
        resolve_event_type_label(
            TenantEventCode.LEGACY.value,
            {"legacy_event_type": "architecture"},
            scope="tenant",
        )
        == "Архитектурное решение"
    )


def test_platform_filter_options_route():
    response = platform_filter_route(_current_user=object())
    assert any(item.value == "company" for item in response.categories)
    assert all(item.value != "pages" for item in response.categories)


def test_tenant_filter_options_route():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.modules.platform_event_journal.models import PlatformEventJournalEntry

    engine = create_engine("sqlite:///:memory:")
    PlatformEventJournalEntry.__table__.create(bind=engine, checkfirst=True)
    db_session = sessionmaker(bind=engine)()

    response = tenant_filter_route(tenant_id=1, db=db_session, _current_user=object())

    assert any(item.value == TenantEventCategory.PAGES.value for item in response.categories)
    assert all(item.value != "company" for item in response.categories)
    db_session.close()


@pytest.fixture()
def authenticated_client():
    fake_user = SimpleNamespace(
        id=1,
        username="admin",
        full_name="Admin",
        role=SimpleNamespace(name="platform_admin"),
    )

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[require_designer_user] = lambda: fake_user
    app.dependency_overrides[require_tenant] = lambda tenant_id=1: tenant_id

    client = TestClient(app, raise_server_exceptions=False)
    try:
        yield client
    finally:
        app.dependency_overrides.clear()


def test_tenant_filter_options_http_returns_200(authenticated_client):
    response = authenticated_client.get("/designer/tenants/1/event-journal/filter-options")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload.get("categories"), list)
    assert isinstance(payload.get("event_types"), list)
    assert len(payload["categories"]) > 0
    assert len(payload["event_types"]) > 0

    category_values = {item["value"] for item in payload["categories"]}
    assert "pages" in category_values
    assert "navigation" in category_values
    assert "trash" in category_values
    assert "system" in category_values
    assert "company" not in category_values
    assert "platform_user" not in category_values
    assert "platform_role" not in category_values
    assert "license" not in category_values
