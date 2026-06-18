"""Tests for DEV → template → client module publication pipeline MVP."""

from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.main import app
from app.modules.platform_module_publications.constants import PlatformModulePublicationStatus
from app.modules.platform_module_publications.crud import get_publication, list_publications
from app.modules.platform_module_publications.service import (
    approve_publication,
    create_publication,
    publish_publication_to_template,
    reject_publication,
    start_publication_review,
    submit_publication_for_review,
)
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.platform_modules.version_seed import seed_platform_module_versions
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_module_configuration_applies.apply_service import apply_module_configuration_update
from app.modules.tenant_module_configuration_rollbacks.rollback_service import rollback_module_configuration
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.runtime.service import get_runtime_module_configuration
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.generator import build_preview_payload_from_offer
from app.modules.tenant_modules.backfill import backfill_tenant_modules_for_portal
from app.modules.tenant_modules.models import TenantModule
from app.modules.users.models import Role, User
from tests.test_module_configuration_apply_mvp import (
    _auth_headers,
    _create_user,
    _seed_apply_scenario,
    _suffix,
)
from tests.test_runtime_configuration_integration_mvp import _ensure_tenant_module_configuration


def _create_portal(db: Session, *, tenant_type: str) -> Portal:
    portal = Portal(
        name=f"Publication {tenant_type} {_suffix()}",
        code=f"pub-{tenant_type.lower()}-{_suffix()}",
        tenant_type=tenant_type,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version="1.0.0",
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _seed_publication_pipeline(db: Session) -> tuple[Portal, Portal, Portal, User, User]:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    seed_platform_module_versions(db, commit=False)

    dev_portal = _create_portal(db, tenant_type=TenantType.DEV.value)
    template_portal = _create_portal(db, tenant_type=TenantType.TEMPLATE.value)
    client_portal = _create_portal(db, tenant_type=TenantType.CLIENT.value)

    dev_admin = _create_user(db, role_name="admin", tenant_id=dev_portal.id)
    platform_reviewer = _create_user(db, role_name="superadmin", tenant_id=None)

    for portal in (dev_portal, template_portal, client_portal):
        backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)
        _ensure_tenant_module_configuration(db, portal=portal, module_key="runtime.calendar")

    dev_configuration = get_configuration(
        db,
        tenant_id=dev_portal.id,
        module_key="runtime.calendar",
    )
    dev_configuration.settings = {
        **dict(dev_configuration.settings or {}),
        "default_view": "month",
    }
    dev_module = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == dev_portal.id, TenantModule.module_key == "runtime.calendar")
        .one()
    )
    dev_module.installed_version = "2.0.0"

    client_module = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == client_portal.id, TenantModule.module_key == "runtime.calendar")
        .one()
    )
    client_module.installed_version = "1.0.0"
    db.flush()

    return dev_portal, template_portal, client_portal, dev_admin, platform_reviewer


@contextmanager
def _patch_publication_tenants(*, dev_portal_id: int, template_portal_id: int):
    with patch(
        "app.modules.platform_event_journal.seed_classification.resolve_dev_tenant_portal_id",
        return_value=dev_portal_id,
    ), patch(
        "app.modules.platform_module_publications.snapshot.resolve_template_tenant_id",
        return_value=template_portal_id,
    ):
        yield


def test_publication_table_created(db: Session):
    inspector = inspect(db.bind)
    assert "platform_module_publications" in inspector.get_table_names()
    offer_columns = {column["name"] for column in inspector.get_columns("tenant_module_update_offers")}
    assert "publication_id" in offer_columns


def test_publication_snapshot_is_immutable(db: Session):
    dev_portal, template_portal, _, dev_admin, _ = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        publication = create_publication(
            db,
            module_key="runtime.calendar",
            actor=dev_admin,
            release_summary="Immutable snapshot test",
        )

    row = get_publication(db, publication["id"])
    original_snapshot = dict(row.snapshot_payload or {})

    dev_configuration = get_configuration(db, tenant_id=dev_portal.id, module_key="runtime.calendar")
    dev_configuration.settings = {"default_view": "day"}
    db.flush()

    db.refresh(row)
    assert row.snapshot_payload == original_snapshot


def test_create_publication_works(db: Session):
    dev_portal, template_portal, _, dev_admin, _ = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        publication = create_publication(
            db,
            module_key="runtime.calendar",
            actor=dev_admin,
        )

    assert publication["publication_status"] == PlatformModulePublicationStatus.DRAFT
    assert publication["source_tenant_id"] == dev_portal.id
    assert publication["target_tenant_id"] == template_portal.id
    assert publication["to_module_version"] == "2.0.0"


def test_review_workflow_and_approve(db: Session):
    dev_portal, template_portal, _, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    submitted = submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    assert submitted["publication_status"] == PlatformModulePublicationStatus.READY_FOR_REVIEW

    in_review = start_publication_review(db, publication_id=created["id"], actor=reviewer)
    assert in_review["publication_status"] == PlatformModulePublicationStatus.IN_REVIEW

    approved = approve_publication(db, publication_id=created["id"], actor=reviewer)
    assert approved["publication_status"] == PlatformModulePublicationStatus.APPROVED


def test_reject_works(db: Session):
    dev_portal, template_portal, _, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    rejected = reject_publication(db, publication_id=created["id"], actor=reviewer, notes="Needs changes")
    assert rejected["publication_status"] == PlatformModulePublicationStatus.REJECTED


def test_publish_requires_approval(db: Session):
    dev_portal, template_portal, _, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    with pytest.raises(Exception):
        publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    approve_publication(db, publication_id=created["id"], actor=reviewer)
    result = publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)
    assert result["publication"]["publication_status"] == PlatformModulePublicationStatus.PUBLISHED


def test_publish_updates_template_and_generates_client_offers(db: Session):
    dev_portal, template_portal, client_portal, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(
            db,
            module_key="runtime.calendar",
            actor=dev_admin,
            release_summary="Template rollout",
        )

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    approve_publication(db, publication_id=created["id"], actor=reviewer)
    result = publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)

    template_configuration = get_configuration(
        db,
        tenant_id=template_portal.id,
        module_key="runtime.calendar",
    )
    assert template_configuration.settings.get("default_view") == "month"

    template_module = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == template_portal.id, TenantModule.module_key == "runtime.calendar")
        .one()
    )
    assert template_module.installed_version == "2.0.0"
    assert result["offers_created"] >= 1
    assert client_portal.id in result["tenant_ids"]

    dev_offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == dev_portal.id,
            TenantModuleUpdateOffer.module_key == "runtime.calendar",
            TenantModuleUpdateOffer.status == "available",
        )
        .first()
    )
    template_offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == template_portal.id,
            TenantModuleUpdateOffer.module_key == "runtime.calendar",
            TenantModuleUpdateOffer.status == "available",
        )
        .first()
    )
    assert dev_offer is None
    assert template_offer is None

    client_offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == client_portal.id,
            TenantModuleUpdateOffer.module_key == "runtime.calendar",
            TenantModuleUpdateOffer.status == "available",
        )
        .one()
    )
    assert client_offer.publication_id == created["id"]
    assert "Template rollout" in (client_offer.change_summary or "")

    preview_payload = build_preview_payload_from_offer(db, client_offer)
    metadata = preview_payload["impact_analysis"].get("publication_metadata") or {}
    assert metadata.get("source") == "Published from Platform Template"
    assert metadata.get("publication_id") == created["id"]


def test_publication_history_lists_all_statuses(db: Session):
    dev_portal, template_portal, _, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        draft = create_publication(db, module_key="runtime.calendar", actor=dev_admin)
        rejected_source = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    submit_publication_for_review(db, publication_id=rejected_source["id"], actor=dev_admin)
    start_publication_review(db, publication_id=rejected_source["id"], actor=reviewer)
    reject_publication(db, publication_id=rejected_source["id"], actor=reviewer)

    rows = list_publications(db)
    statuses = {row.publication_status for row in rows if row.id in {draft["id"], rejected_source["id"]}}
    assert PlatformModulePublicationStatus.DRAFT in statuses
    assert PlatformModulePublicationStatus.REJECTED in statuses


def test_runtime_configuration_still_works_after_publish(db: Session):
    dev_portal, template_portal, _, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    approve_publication(db, publication_id=created["id"], actor=reviewer)
    publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)

    runtime_config = get_runtime_module_configuration(
        db,
        tenant_id=template_portal.id,
        module_key="runtime.calendar",
        use_cache=False,
    )
    assert runtime_config.settings.get("default_view") == "month"


def test_apply_and_rollback_still_work(db: Session):
    portal, offer, admin = _seed_apply_scenario(db, module_key="runtime.calendar")
    apply_result = apply_module_configuration_update(
        db,
        tenant_id=portal.id,
        offer_id=int(offer.id),
        applied_by=admin,
    )
    assert apply_result["status"] == "completed"

    rollback_result = rollback_module_configuration(
        db,
        tenant_id=portal.id,
        apply_id=int(apply_result["apply_id"]),
        rolled_back_by=admin,
    )
    assert rollback_result["status"] == "completed"


def test_create_publication_api(db: Session, client: TestClient):
    dev_portal, template_portal, _, _, platform_reviewer = _seed_publication_pipeline(db)
    db.commit()

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        response = client.post(
            "/platform/module-publications",
            headers=_auth_headers(platform_reviewer),
            json={"module_key": "runtime.calendar", "release_summary": "API create"},
        )

    assert response.status_code == 201
    assert response.json()["publication_status"] == PlatformModulePublicationStatus.DRAFT
