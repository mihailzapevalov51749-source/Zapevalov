"""Publication Guard Foundation P0 — PG-01..PG-03 regression tests."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.document_libraries.models import DocumentLibrary
from app.modules.navigation import service as navigation_service
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform_module_publications.service import (
    approve_publication,
    create_publication,
    publish_publication_to_template,
    start_publication_review,
    submit_publication_for_review,
)
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.platform_modules.version_seed import seed_platform_module_versions
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_management.exceptions import TenantWriteForbiddenError
from app.modules.tenant_bootstrap.runtime_module_provisioning import (
    provision_tenant_runtime_modules,
)
from app.modules.tenant_module_configurations.backfill import (
    backfill_configuration_for_tenant_module,
)
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_modules.models import TenantModule
from app.modules.tenant_users.models import TenantUserMembership
from tests.support.committed_test_registry import commit_test_data
from tests.test_dev_to_template_module_publication_pipeline_mvp import (
    _patch_publication_tenants,
    _seed_publication_pipeline,
)
from tests.test_module_configuration_apply_mvp import _auth_headers, _create_user


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def _create_typed_portal(db: Session, *, tenant_type: TenantType) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"PubGuard {tenant_type.value} {suffix}",
        code=f"pub-guard-{tenant_type.value.lower()}-{suffix}",
        tenant_type=tenant_type.value,
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _ensure_membership(db: Session, *, user_id: int, tenant_id: int) -> None:
    existing = (
        db.query(TenantUserMembership)
        .filter(
            TenantUserMembership.user_id == user_id,
            TenantUserMembership.tenant_id == tenant_id,
        )
        .one_or_none()
    )
    if existing is None:
        db.add(
            TenantUserMembership(
                user_id=user_id,
                tenant_id=tenant_id,
                role_key="admin",
                is_active=True,
            )
        )
        db.flush()


def _seed_module_runtime(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    seed_platform_module_versions(db, commit=False)


def _ensure_tenant_module_without_configuration(
    db: Session,
    *,
    portal: Portal,
    module_key: str = "runtime.calendar",
) -> TenantModule:
    provision_tenant_runtime_modules(
        db,
        portal.id,
        commit=False,
        enforce_invariant=False,
        bypass_module_config_write_policy=True,
    )
    tenant_module = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == module_key,
        )
        .one()
    )
    configuration = get_configuration(db, tenant_id=portal.id, module_key=module_key)
    if configuration is not None:
        db.delete(configuration)
        db.flush()
    return tenant_module


def test_pg01_module_config_write_allowed_for_dev(db: Session) -> None:
    _seed_module_runtime(db)
    dev = _create_typed_portal(db, tenant_type=TenantType.DEV)
    tenant_module = _ensure_tenant_module_without_configuration(db, portal=dev)

    result = backfill_configuration_for_tenant_module(
        db,
        tenant_module=tenant_module,
        commit=False,
    )

    assert result["status"] == "created"
    assert get_configuration(db, tenant_id=dev.id, module_key="runtime.calendar") is not None


def test_pg01_module_config_write_forbidden_for_template_and_client(db: Session) -> None:
    _seed_module_runtime(db)
    template = _create_typed_portal(db, tenant_type=TenantType.TEMPLATE)
    client = _create_typed_portal(db, tenant_type=TenantType.CLIENT)

    for portal in (template, client):
        tenant_module = _ensure_tenant_module_without_configuration(db, portal=portal)
        with pytest.raises(TenantWriteForbiddenError):
            backfill_configuration_for_tenant_module(
                db,
                tenant_module=tenant_module,
                commit=False,
            )


def test_pg01_publication_path_still_writes_template_configuration(db: Session) -> None:
    dev_portal, template_portal, _, dev_admin, reviewer = _seed_publication_pipeline(db)

    with _patch_publication_tenants(
        dev_portal_id=dev_portal.id,
        template_portal_id=template_portal.id,
    ):
        created = create_publication(db, module_key="runtime.calendar", actor=dev_admin)
        submit_publication_for_review(db, publication_id=created["id"], actor=dev_admin)
        start_publication_review(db, publication_id=created["id"], actor=reviewer)
        approve_publication(db, publication_id=created["id"], actor=reviewer)
        result = publish_publication_to_template(
            db,
            publication_id=created["id"],
            actor=reviewer,
        )

    assert result["publication"]["publication_status"] == "published"
    template_configuration = get_configuration(
        db,
        tenant_id=template_portal.id,
        module_key="runtime.calendar",
    )
    assert template_configuration is not None
    assert template_configuration.settings.get("default_view") == "month"


def test_pg02_document_library_create_allowed_for_dev(
    client: TestClient,
    db: Session,
) -> None:
    dev = _create_typed_portal(db, tenant_type=TenantType.DEV)
    user = _create_user(db, role_name="admin", tenant_id=dev.id)
    _ensure_membership(db, user_id=int(user.id), tenant_id=dev.id)
    commit_test_data(db, portal_ids=[dev.id], user_ids=[int(user.id)])

    response = client.post(
        f"/tenants/{dev.id}/document-libraries",
        headers=_auth_headers(user),
        json={
            "title": f"Dev library {_suffix()}",
            "description": "pg02",
            "portal_id": dev.id,
        },
    )

    assert response.status_code == 201, response.text


@pytest.mark.parametrize("tenant_type", [TenantType.TEMPLATE])
def test_pg02_document_library_create_forbidden_for_template(
    client: TestClient,
    db: Session,
    tenant_type: TenantType,
) -> None:
    portal = _create_typed_portal(db, tenant_type=tenant_type)
    user = _create_user(db, role_name="admin", tenant_id=portal.id)
    _ensure_membership(db, user_id=int(user.id), tenant_id=portal.id)
    commit_test_data(db, portal_ids=[portal.id], user_ids=[int(user.id)])

    response = client.post(
        f"/tenants/{portal.id}/document-libraries",
        headers=_auth_headers(user),
        json={
            "title": f"Blocked library {_suffix()}",
            "description": "pg02",
            "portal_id": portal.id,
        },
    )

    assert response.status_code == 403


def test_pg02_document_library_create_allowed_for_client(
    client: TestClient,
    db: Session,
) -> None:
    portal = _create_typed_portal(db, tenant_type=TenantType.CLIENT)
    user = _create_user(db, role_name="admin", tenant_id=portal.id)
    _ensure_membership(db, user_id=int(user.id), tenant_id=portal.id)
    commit_test_data(db, portal_ids=[portal.id], user_ids=[int(user.id)])

    response = client.post(
        f"/tenants/{portal.id}/document-libraries",
        headers=_auth_headers(user),
        json={
            "title": f"Client library {_suffix()}",
            "description": "pg02 client",
            "portal_id": portal.id,
        },
    )

    assert response.status_code == 201, response.text


def test_pg03_get_navigation_designer_scope_does_not_mutate_db(db: Session) -> None:
    portal = _create_typed_portal(db, tenant_type=TenantType.DEV)

    def _count_rows() -> tuple[int, int, int]:
        nav_count = (
            db.query(NavigationItem)
            .filter(
                NavigationItem.portal_id == portal.id,
                NavigationItem.deleted_at.is_(None),
            )
            .count()
        )
        page_count = (
            db.query(Page)
            .filter(Page.portal_id == portal.id, Page.deleted_at.is_(None))
            .count()
        )
        library_count = db.query(DocumentLibrary).count()
        return nav_count, page_count, library_count

    before = _count_rows()

    navigation_service.get_navigation_tree(db, portal.id, "designer")
    navigation_service.get_navigation_list(db, portal.id, "designer")

    after = _count_rows()
    assert after == before


def test_pg03_ensure_designer_system_items_endpoint_still_writes_on_dev(
    client: TestClient,
    db: Session,
) -> None:
    portal = _create_typed_portal(db, tenant_type=TenantType.DEV)
    designer = _create_user(db, role_name="admin", tenant_id=portal.id)
    _ensure_membership(db, user_id=int(designer.id), tenant_id=portal.id)
    commit_test_data(db, portal_ids=[portal.id], user_ids=[int(designer.id)])

    before = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal.id,
            NavigationItem.deleted_at.is_(None),
        )
        .count()
    )

    response = client.post(
        f"/navigation/portal/{portal.id}/ensure-designer-system-items",
        headers=_auth_headers(designer),
    )

    assert response.status_code == 200, response.text
    after = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal.id,
            NavigationItem.deleted_at.is_(None),
        )
        .count()
    )
    assert after >= before
