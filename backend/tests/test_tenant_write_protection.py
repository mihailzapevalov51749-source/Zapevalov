"""Unit tests for tenant-type write protection policy."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_management.demo_tenant_inventory import assert_demo_tenant_inventory
from app.modules.tenant_management.exceptions import (
    ProtectedTenantDeleteForbiddenError,
    TenantWriteForbiddenError,
)
from app.modules.tenant_management.constants import DEMO_CLIENT_TENANT_KEY
from app.modules.tenant_management.tenant_write_policy import (
    assert_tenant_allows_apply_target,
    assert_tenant_allows_direct_module_config_write,
    assert_tenant_allows_direct_structure_write,
    assert_tenant_allows_publish_source,
    assert_tenant_allows_publish_target,
    assert_tenant_allows_rollback_target,
    assert_tenant_allows_delete,
)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _create_portal(db: Session, *, tenant_type: TenantType) -> Portal:
    portal = Portal(
        name=f"Write Policy {tenant_type.value} {_suffix()}",
        code=f"write-policy-{tenant_type.value.lower()}-{_suffix()}",
        tenant_type=tenant_type.value,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version="1.0.0",
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def test_direct_structure_write_allowed_for_dev_and_client(db: Session) -> None:
    dev = _create_portal(db, tenant_type=TenantType.DEV)
    client = _create_portal(db, tenant_type=TenantType.CLIENT)

    assert_tenant_allows_direct_structure_write(db, dev.id, "designer_write")
    assert_tenant_allows_direct_structure_write(db, client.id, "company_constructor_write")


def test_direct_structure_write_forbidden_for_template(db: Session) -> None:
    template = _create_portal(db, tenant_type=TenantType.TEMPLATE)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_direct_structure_write(db, template.id, "designer_write")


def test_direct_module_config_write_allowed_for_dev(db: Session) -> None:
    dev = _create_portal(db, tenant_type=TenantType.DEV)
    assert_tenant_allows_direct_module_config_write(db, dev.id, "module_config_write")


def test_direct_module_config_write_forbidden_for_template_and_client(db: Session) -> None:
    template = _create_portal(db, tenant_type=TenantType.TEMPLATE)
    client = _create_portal(db, tenant_type=TenantType.CLIENT)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_direct_module_config_write(db, template.id, "module_config_write")

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_direct_module_config_write(db, client.id, "module_config_write")


def test_publish_target_policy(db: Session) -> None:
    dev = _create_portal(db, tenant_type=TenantType.DEV)
    template = _create_portal(db, tenant_type=TenantType.TEMPLATE)
    client = _create_portal(db, tenant_type=TenantType.CLIENT)

    assert_tenant_allows_publish_target(db, template.id)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_publish_target(db, dev.id)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_publish_target(db, client.id)


def test_publish_source_policy(db: Session) -> None:
    dev = _create_portal(db, tenant_type=TenantType.DEV)
    template = _create_portal(db, tenant_type=TenantType.TEMPLATE)

    assert_tenant_allows_publish_source(db, dev.id)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_publish_source(db, template.id)


def test_apply_target_policy(db: Session) -> None:
    dev = _create_portal(db, tenant_type=TenantType.DEV)
    template = _create_portal(db, tenant_type=TenantType.TEMPLATE)
    client = _create_portal(db, tenant_type=TenantType.CLIENT)

    assert_tenant_allows_apply_target(db, client.id)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_apply_target(db, dev.id)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_apply_target(db, template.id)


def test_rollback_target_policy(db: Session) -> None:
    dev = _create_portal(db, tenant_type=TenantType.DEV)
    template = _create_portal(db, tenant_type=TenantType.TEMPLATE)
    client = _create_portal(db, tenant_type=TenantType.CLIENT)

    assert_tenant_allows_rollback_target(db, client.id)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_rollback_target(db, dev.id)

    with pytest.raises(TenantWriteForbiddenError):
        assert_tenant_allows_rollback_target(db, template.id)


def test_protected_tenant_deletion(db: Session) -> None:
    dev = db.query(Portal).filter(Portal.id == 1).one_or_none()
    template = db.query(Portal).filter(Portal.id == 2).one_or_none()
    demo_client = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one_or_none()

    if dev is None or template is None or demo_client is None:
        pytest.skip("Demo environment tenants id=1, id=2, demo CLIENT ooo_rozetka are required")

    for tenant_id in (dev.id, template.id, demo_client.id):
        with pytest.raises(ProtectedTenantDeleteForbiddenError):
            assert_tenant_allows_delete(db, tenant_id)

    assert_demo_tenant_inventory(db)
