"""Publication Guard Foundation P1 — PG-04..PG-06 regression tests."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.orm import Session

from app.modules.pages import service as pages_service
from app.modules.pages.schemas import PageCreate
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.clone_audit_trail import (
    CLONE_BYPASS_EVENT_CODE,
    record_tenant_structure_clone_bypass,
)
from app.modules.tenant_bootstrap.clone_tenant_structure import CloneTenantStructureResult
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_management.exceptions import TenantWriteForbiddenError
from app.modules.tenant_management.tenant_write_policy import (
    assert_script_allows_direct_structure_write,
)
from tests.support.committed_test_registry import commit_test_data


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _create_typed_portal(db: Session, *, tenant_type: TenantType) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"PubGuard P1 {tenant_type.value} {suffix}",
        code=f"pub-guard-p1-{tenant_type.value.lower()}-{suffix}",
        tenant_type=tenant_type.value,
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    commit_test_data(db, portal_ids=[portal.id])
    return portal


def test_pg04_service_create_page_allowed_for_dev(db: Session) -> None:
    dev = _create_typed_portal(db, tenant_type=TenantType.DEV)
    page = pages_service.create_page(
        db,
        PageCreate(portal_id=dev.id, title=f"PG04 dev page {_suffix()}"),
        portal_id=dev.id,
    )
    assert page is not None
    assert int(page.portal_id) == dev.id


@pytest.mark.parametrize("tenant_type", [TenantType.TEMPLATE])
def test_pg04_service_create_page_forbidden_for_template(
    db: Session,
    tenant_type: TenantType,
) -> None:
    portal = _create_typed_portal(db, tenant_type=tenant_type)
    with pytest.raises(TenantWriteForbiddenError):
        pages_service.create_page(
            db,
            PageCreate(portal_id=portal.id, title=f"PG04 blocked {_suffix()}"),
            portal_id=portal.id,
        )


def test_pg04_service_create_page_allowed_for_client(db: Session) -> None:
    client_portal = _create_typed_portal(db, tenant_type=TenantType.CLIENT)
    page = pages_service.create_page(
        db,
        PageCreate(portal_id=client_portal.id, title=f"PG04 client page {_suffix()}"),
        portal_id=client_portal.id,
    )
    assert page is not None
    assert int(page.portal_id) == client_portal.id


def test_pg05_script_guard_blocks_template_direct_write(db: Session) -> None:
    template = _create_typed_portal(db, tenant_type=TenantType.TEMPLATE)
    with pytest.raises(TenantWriteForbiddenError):
        assert_script_allows_direct_structure_write(
            db,
            template.id,
            script_name="test_pg05_script_guard",
        )


def test_pg05_script_guard_allows_explicit_bypass(db: Session) -> None:
    template = _create_typed_portal(db, tenant_type=TenantType.TEMPLATE)
    assert_script_allows_direct_structure_write(
        db,
        template.id,
        script_name="test_pg05_script_bypass",
        bypass_write_policy=True,
    )


def test_pg06_clone_bypass_records_audit_trail(db: Session) -> None:
    source = _create_typed_portal(db, tenant_type=TenantType.DEV)
    target = _create_typed_portal(db, tenant_type=TenantType.TEMPLATE)
    result = CloneTenantStructureResult(
        source_tenant_id=source.id,
        target_tenant_id=target.id,
        pages_cloned=3,
        navigation_items_cloned=5,
        object_types_cloned=2,
        workspaces_cloned=1,
        designer_system_menu_settings_cloned=4,
        tenant_runtime_menu_settings_cloned=2,
        catalog_version=7,
    )

    record_tenant_structure_clone_bypass(
        db,
        result=result,
        reason="pg06_test_clone_audit",
        actor_user_id=None,
        commit=False,
    )
    db.flush()

    entry = (
        db.query(PlatformEventJournalEntry)
        .filter(
            PlatformEventJournalEntry.event_type == CLONE_BYPASS_EVENT_CODE,
            PlatformEventJournalEntry.target_id == str(target.id),
        )
        .order_by(PlatformEventJournalEntry.id.desc())
        .first()
    )
    assert entry is not None
    assert entry.event_category == "publication_guard"
    metadata = entry.metadata_json or {}
    assert metadata["reason"] == "pg06_test_clone_audit"
    assert metadata["bypass_write_policy"] is True
    assert metadata["source_tenant_id"] == source.id
    assert metadata["target_tenant_id"] == target.id
    assert metadata["objects_count"]["pages"] == 3
    assert metadata["objects_count"]["navigation_items"] == 5
