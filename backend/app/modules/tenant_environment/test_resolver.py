"""Tests for tenant environment resolver."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.constants import DEFAULT_BOOTSTRAP_FROM_TENANT_ID
from app.modules.tenant_bootstrap.exceptions import SourceTenantNotFoundError
from app.modules.tenant_environment.constants import TenantType
from app.modules.tenant_environment.resolver import (
    build_tenant_environment_read,
    resolve_bootstrap_source_tenant_id,
    resolve_portal_tenant_type,
    resolve_tenant_type_from_id,
)


def test_resolve_tenant_type_from_id_legacy_mapping() -> None:
    assert resolve_tenant_type_from_id(1) == TenantType.DEV
    assert resolve_tenant_type_from_id(2) == TenantType.TEMPLATE
    assert resolve_tenant_type_from_id(3) == TenantType.DEMO
    assert resolve_tenant_type_from_id(13) == TenantType.LEGACY_TEMPLATE
    assert resolve_tenant_type_from_id(14) == TenantType.CLIENT


def test_resolve_portal_tenant_type_prefers_db_field() -> None:
    portal = SimpleNamespace(id=99, tenant_type="CLIENT")
    assert resolve_portal_tenant_type(portal) == TenantType.CLIENT

    portal_dev = SimpleNamespace(id=99, tenant_type="DEV")
    assert resolve_portal_tenant_type(portal_dev) == TenantType.DEV


def test_resolve_portal_tenant_type_falls_back_to_id() -> None:
    portal = SimpleNamespace(id=1, tenant_type=None)
    assert resolve_portal_tenant_type(portal) == TenantType.DEV


def test_build_tenant_environment_read() -> None:
    portal = SimpleNamespace(
        id=14,
        name="Rozetka Demo",
        short_name="Rozetka",
        code="rozetka",
        tenant_type="CLIENT",
        template_version="1.4.0",
        tenant_status="ACTIVE",
        source_tenant_id=2,
        notes="client tenant",
    )
    payload = build_tenant_environment_read(portal)
    assert payload["tenant_id"] == 14
    assert payload["name"] == "Rozetka Demo"
    assert payload["short_name"] == "Rozetka"
    assert payload["code"] == "rozetka"
    assert payload["tenant_type"] == "CLIENT"
    assert payload["template_version"] == "1.4.0"
    assert payload["source_tenant_id"] == 2


@pytest.fixture()
def resolver_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine, tables=[Portal.__table__])
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_resolve_bootstrap_source_tenant_id_uses_existing_portal(resolver_db) -> None:
    resolver_db.add(
        Portal(
            id=7,
            name="Template",
            original_name="Template",
            code="template",
            tenant_type=TenantType.TEMPLATE.value,
        )
    )
    resolver_db.commit()

    assert resolve_bootstrap_source_tenant_id(resolver_db, None) == 7
    assert resolve_bootstrap_source_tenant_id(resolver_db, 7) == 7


def test_resolve_bootstrap_source_tenant_id_falls_back_when_legacy_default_missing(
    resolver_db,
) -> None:
    assert resolve_bootstrap_source_tenant_id(
        resolver_db,
        DEFAULT_BOOTSTRAP_FROM_TENANT_ID,
    ) is None


def test_resolve_bootstrap_source_tenant_id_raises_for_unknown_explicit_id(resolver_db) -> None:
    with pytest.raises(SourceTenantNotFoundError):
        resolve_bootstrap_source_tenant_id(resolver_db, 999)
