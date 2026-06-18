"""Tests for publication diff generation fix."""

from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.platform_module_publications.service import (
    approve_publication,
    create_publication,
    publish_publication_to_template,
    start_publication_review,
    submit_publication_for_review,
)
from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.platform_modules.version_seed import seed_platform_module_versions
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_module_configuration_applies.apply_service import validate_apply_preconditions
from app.modules.tenant_module_configuration_diffs import crud as diff_crud
from app.modules.tenant_module_configuration_diffs.diff_generator import build_target_configuration_from_schema
from app.modules.tenant_module_configuration_diffs.generator import (
    backfill_publication_configuration_diffs,
    build_configuration_diff_payload_for_offer,
    generate_configuration_diff_for_offer,
    resolve_target_configuration_for_offer,
)
from app.modules.tenant_module_configuration_diffs.publication_diff import (
    build_publication_configuration_diff,
    build_target_configuration_from_publication_snapshot,
)
from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.crud import get_current_preview_for_offer
from app.modules.tenant_modules.backfill import backfill_tenant_modules_for_portal
from app.modules.tenant_modules.models import TenantModule
from app.modules.users.models import User
from tests.test_dev_to_template_module_publication_pipeline_mvp import (
    _create_portal,
    _patch_publication_tenants,
    _seed_publication_pipeline,
    _suffix,
)
from tests.test_module_configuration_apply_mvp import _create_user
from tests.test_runtime_configuration_integration_mvp import _ensure_tenant_module_configuration


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_publication_diff_created_on_publish(db: Session):
    dev_portal, template_portal, client_portal, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(
            db,
            module_key="runtime.calendar",
            actor=dev_admin,
            release_summary="Diff on publish",
        )

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    approve_publication(db, publication_id=created["id"], actor=reviewer)
    publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)

    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == client_portal.id,
            TenantModuleUpdateOffer.module_key == "runtime.calendar",
            TenantModuleUpdateOffer.publication_id == created["id"],
            TenantModuleUpdateOffer.status == TenantModuleUpdateOfferStatus.AVAILABLE,
        )
        .one()
    )
    diff = diff_crud.get_latest_diff_for_offer(db, tenant_id=client_portal.id, offer_id=int(offer.id))
    assert diff is not None

    preview = get_current_preview_for_offer(db, tenant_id=client_portal.id, offer_id=int(offer.id))
    assert preview is not None
    assert (preview.impact_analysis or {}).get("configuration_diff") is not None


def test_publication_diff_uses_snapshot_not_manifest_defaults(db: Session):
    dev_portal, template_portal, client_portal, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    from app.modules.platform_module_publications.crud import get_publication

    publication = get_publication(db, created["id"])
    assert isinstance(publication.snapshot_payload, dict)
    publication.snapshot_payload = {
        **publication.snapshot_payload,
        "settings": {"default_view": "week", "unique_audit_marker": "snapshot-target"},
    }
    db.flush()

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    approve_publication(db, publication_id=created["id"], actor=reviewer)
    publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)

    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == client_portal.id,
            TenantModuleUpdateOffer.publication_id == created["id"],
        )
        .one()
    )

    target = resolve_target_configuration_for_offer(db, offer)
    manifest = get_active_manifest_for_module(db, "runtime.calendar")
    manifest_target = build_target_configuration_from_schema(dict(manifest.settings_schema or {}))
    assert target is not None
    assert target.get("settings", {}).get("unique_audit_marker") == "snapshot-target"
    assert target.get("settings") != manifest_target.get("settings")


def test_build_publication_configuration_diff_payload(db: Session):
    dev_portal, template_portal, _, dev_admin, _ = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    from app.modules.platform_module_publications.crud import get_publication
    from app.modules.tenant_module_configurations.crud import get_configuration

    publication = get_publication(db, created["id"])
    configuration = get_configuration(db, tenant_id=dev_portal.id, module_key="runtime.calendar")
    diff_payload = build_publication_configuration_diff(
        current_configuration=configuration,
        publication_snapshot=dict(publication.snapshot_payload or {}),
    )
    assert "settings" in diff_payload
    assert "permissions" in diff_payload


def test_apply_validation_passes_with_publication_diff(db: Session):
    dev_portal, template_portal, client_portal, dev_admin, reviewer = _seed_publication_pipeline(db)
    admin = _create_user(db, role_name="admin", tenant_id=client_portal.id)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    approve_publication(db, publication_id=created["id"], actor=reviewer)
    publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)

    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == client_portal.id,
            TenantModuleUpdateOffer.publication_id == created["id"],
        )
        .one()
    )

    ctx = validate_apply_preconditions(db, tenant_id=client_portal.id, offer_id=int(offer.id))
    assert ctx.diff_id > 0
    assert ctx.target_configuration.get("settings") is not None


def test_backfill_creates_missing_publication_diffs(db: Session):
    dev_portal, template_portal, client_portal, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    approve_publication(db, publication_id=created["id"], actor=reviewer)
    publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)

    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == client_portal.id,
            TenantModuleUpdateOffer.publication_id == created["id"],
        )
        .one()
    )
    diff = diff_crud.get_latest_diff_for_offer(db, tenant_id=client_portal.id, offer_id=int(offer.id))
    assert diff is not None
    db.delete(diff)
    db.flush()

    preview = get_current_preview_for_offer(db, tenant_id=client_portal.id, offer_id=int(offer.id))
    if preview and isinstance(preview.impact_analysis, dict):
        impact = dict(preview.impact_analysis)
        impact.pop("configuration_diff", None)
        preview.impact_analysis = impact
        db.flush()

    totals = backfill_publication_configuration_diffs(db, commit=False)
    assert totals["diffs_created"] >= 1

    restored = diff_crud.get_latest_diff_for_offer(db, tenant_id=client_portal.id, offer_id=int(offer.id))
    assert restored is not None


def test_duplicate_diff_not_created(db: Session):
    dev_portal, template_portal, client_portal, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(dev_portal_id=dev_portal.id, template_portal_id=template_portal.id):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)

    submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
    start_publication_review(db, publication_id=created["id"], actor=reviewer)
    approve_publication(db, publication_id=created["id"], actor=reviewer)
    publish_publication_to_template(db, publication_id=created["id"], actor=reviewer)

    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(
            TenantModuleUpdateOffer.tenant_id == client_portal.id,
            TenantModuleUpdateOffer.publication_id == created["id"],
        )
        .one()
    )

    first = generate_configuration_diff_for_offer(db, offer, commit=False)
    second = generate_configuration_diff_for_offer(db, offer, commit=False)
    assert first["status"] in {"created", "exists"}
    assert second["status"] == "exists"
    assert first["diff"].id == second["diff"].id


def test_runtime_and_rollback_unchanged_imports():
    from app.modules.tenant_module_configuration_rollbacks import rollback_service
    from app.modules.tenant_module_configurations.runtime import service as runtime_service

    assert hasattr(runtime_service, "get_runtime_module_configuration")
    assert hasattr(rollback_service, "rollback_module_configuration")
