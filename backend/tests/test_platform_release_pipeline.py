"""Platform release pipeline with Platform Review stage."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release.models import TenantUpdateOffer, TenantVersion
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_environment.resolver import resolve_template_tenant_id
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import Role, User

_CREATED_PORTAL_IDS: list[int] = []


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _purge_release_test_portals() -> None:
    global _CREATED_PORTAL_IDS
    _CREATED_PORTAL_IDS = []
    yield
    if not _CREATED_PORTAL_IDS:
        return
    from tests.support.committed_test_registry import register_committed_test_data
    from tests.support.release_test_cleanup import purge_test_portal

    db = SessionLocal()
    try:
        portal_ids = list(_CREATED_PORTAL_IDS)
        for portal_id in reversed(portal_ids):
            purge_test_portal(db, portal_id)
        register_committed_test_data(portal_ids=portal_ids)
        db.commit()
    finally:
        _CREATED_PORTAL_IDS = []
        db.close()


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def _create_user(
    db: Session,
    *,
    role_name: str,
    tenant_id: int | None = None,
    email_prefix: str = "release_test",
) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"{email_prefix}_{role_name}_{_suffix()}@test.local",
        full_name=f"Release Test {role_name}",
        hashed_password="hash",
        is_active=True,
        tenant_id=tenant_id,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _create_portal(
    db: Session,
    *,
    tenant_type: str,
    template_version: str = "1.0.0",
) -> Portal:
    portal = Portal(
        name=f"Test {tenant_type} {_suffix()}",
        code=f"test_{tenant_type.lower()}_{_suffix()}",
        tenant_type=tenant_type,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version=template_version,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    _CREATED_PORTAL_IDS.append(portal.id)
    return portal


def _add_membership(db: Session, *, tenant_id: int, user_id: int, role_key: str = "admin") -> None:
    db.add(
        TenantUserMembership(
            tenant_id=tenant_id,
            user_id=user_id,
            role_key=role_key,
            is_active=True,
        )
    )
    db.flush()


def _cleanup_release_artifacts(db: Session, release_id: int) -> None:
    db.query(PlatformEventJournalEntry).filter(
        PlatformEventJournalEntry.slug.like(f"%{release_id}%")
    ).delete(synchronize_session=False)
    db.query(TenantUpdateOffer).filter(TenantUpdateOffer.release_id == release_id).delete(
        synchronize_session=False,
    )
    tenant_ids = [
        row.target_tenant_id
        for row in db.query(PlatformDeployment)
        .filter(PlatformDeployment.release_package_id == release_id)
        .all()
        if row.target_tenant_id is not None
    ]
    if tenant_ids:
        db.query(PlatformVersionHistory).filter(
            PlatformVersionHistory.tenant_id.in_(tenant_ids)
        ).delete(synchronize_session=False)
        db.query(PlatformEnvironmentVersion).filter(
            PlatformEnvironmentVersion.tenant_id.in_(tenant_ids)
        ).delete(synchronize_session=False)
    db.query(PlatformDeployment).filter(
        PlatformDeployment.release_package_id == release_id
    ).delete(synchronize_session=False)
    package = (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.id == release_id)
        .one_or_none()
    )
    if package is None:
        return
    build_id = package.build_id
    db.delete(package)
    db.flush()
    if build_id is not None:
        build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == build_id).one_or_none()
        if build is not None:
            db.delete(build)
            db.flush()


def _create_release(client: TestClient, developer: User, suffix: str) -> dict:
    response = client.post(
        "/platform/releases",
        headers=_auth_headers(developer),
        json={"title": f"Review flow {suffix}", "changes": [{"title": "Change A", "change_type": "feature"}]},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _submit_for_review(client: TestClient, developer: User, release_id: int) -> dict:
    response = client.post(
        f"/platform/releases/{release_id}/submit-for-review",
        headers=_auth_headers(developer),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _start_review(client: TestClient, reviewer: User, release_id: int) -> dict:
    response = client.post(
        f"/platform/releases/{release_id}/start-review",
        headers=_auth_headers(reviewer),
    )
    assert response.status_code == 200, response.text
    return response.json()


def _approve(client: TestClient, reviewer: User, release_id: int) -> dict:
    response = client.post(
        f"/platform/releases/{release_id}/approve",
        headers=_auth_headers(reviewer),
        json={"comment": "Approved for template"},
    )
    assert response.status_code == 200, response.text
    return response.json()


class TestPlatformReleaseReviewPipeline:
    def test_developer_can_create_draft_release(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        developer = _create_user(db, role_name="admin", email_prefix=f"dev_create_{suffix}")
        db.commit()

        body = _create_release(client, developer, suffix)
        assert body["status"] == "draft"

        journal = (
            db.query(PlatformEventJournalEntry)
            .filter(PlatformEventJournalEntry.slug == f"platform-release-created-{body['id']}")
            .one_or_none()
        )
        assert journal is not None
        _cleanup_release_artifacts(db, body["id"])
        db.commit()

    def test_developer_can_submit_for_platform_review(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        developer = _create_user(db, role_name="admin", email_prefix=f"dev_submit_{suffix}")
        db.commit()

        created = _create_release(client, developer, suffix)
        submitted = _submit_for_review(client, developer, created["id"])
        assert submitted["status"] == "ready_for_platform_review"

        journal = (
            db.query(PlatformEventJournalEntry)
            .filter(PlatformEventJournalEntry.slug == f"platform-release-submitted-{created['id']}")
            .one_or_none()
        )
        assert journal is not None
        _cleanup_release_artifacts(db, created["id"])
        db.commit()

    def test_developer_cannot_publish_to_template(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        dev_portal_id = resolve_dev_tenant_portal_id(db) or _create_portal(
            db, tenant_type=TenantType.DEV.value,
        ).id
        dev_user = _create_user(
            db,
            role_name="admin",
            tenant_id=dev_portal_id,
            email_prefix=f"dev_only_{suffix}",
        )
        _add_membership(db, tenant_id=dev_portal_id, user_id=dev_user.id)
        reviewer = _create_user(db, role_name="admin", email_prefix=f"reviewer_{suffix}")
        db.commit()

        created = _create_release(client, reviewer, suffix)
        _submit_for_review(client, reviewer, created["id"])
        _start_review(client, reviewer, created["id"])
        _approve(client, reviewer, created["id"])

        response = client.post(
            f"/platform/releases/{created['id']}/publish-to-template",
            headers=_auth_headers(dev_user),
        )
        assert response.status_code == 403

        _cleanup_release_artifacts(db, created["id"])
        db.delete(dev_user)
        db.commit()

    def test_reviewer_can_start_review(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        developer = _create_user(db, role_name="admin", email_prefix=f"dev_{suffix}")
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_{suffix}")
        db.commit()

        created = _create_release(client, developer, suffix)
        _submit_for_review(client, developer, created["id"])
        reviewed = _start_review(client, reviewer, created["id"])
        assert reviewed["status"] == "in_platform_review"

        journal = (
            db.query(PlatformEventJournalEntry)
            .filter(PlatformEventJournalEntry.slug == f"platform-release-review-started-{created['id']}")
            .one_or_none()
        )
        assert journal is not None
        _cleanup_release_artifacts(db, created["id"])
        db.commit()

    def test_reviewer_can_request_changes(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        developer = _create_user(db, role_name="admin", email_prefix=f"dev_{suffix}")
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_{suffix}")
        db.commit()

        created = _create_release(client, developer, suffix)
        _submit_for_review(client, developer, created["id"])
        _start_review(client, reviewer, created["id"])

        response = client.post(
            f"/platform/releases/{created['id']}/request-changes",
            headers=_auth_headers(reviewer),
            json={"comment": "Нужно уточнить изменения"},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "changes_requested"
        assert body["review_comment"] == "Нужно уточнить изменения"

        _cleanup_release_artifacts(db, created["id"])
        db.commit()

    def test_developer_can_edit_and_resubmit_changes_requested(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        developer = _create_user(db, role_name="admin", email_prefix=f"dev_{suffix}")
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_{suffix}")
        db.commit()

        created = _create_release(client, developer, suffix)
        _submit_for_review(client, developer, created["id"])
        _start_review(client, reviewer, created["id"])
        client.post(
            f"/platform/releases/{created['id']}/request-changes",
            headers=_auth_headers(reviewer),
            json={"comment": "Доработать описание"},
        )

        patch_response = client.patch(
            f"/platform/releases/{created['id']}",
            headers=_auth_headers(developer),
            json={"description": "Исправленное описание"},
        )
        assert patch_response.status_code == 200

        resubmit = client.post(
            f"/platform/releases/{created['id']}/submit-for-review",
            headers=_auth_headers(developer),
        )
        assert resubmit.status_code == 200
        assert resubmit.json()["status"] == "ready_for_platform_review"

        journal = (
            db.query(PlatformEventJournalEntry)
            .filter(PlatformEventJournalEntry.slug == f"platform-release-resubmitted-{created['id']}")
            .one_or_none()
        )
        assert journal is not None
        _cleanup_release_artifacts(db, created["id"])
        db.commit()

    def test_cannot_publish_before_approve(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        developer = _create_user(db, role_name="admin", email_prefix=f"dev_{suffix}")
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_{suffix}")
        db.commit()

        created = _create_release(client, developer, suffix)
        _submit_for_review(client, developer, created["id"])
        _start_review(client, reviewer, created["id"])

        response = client.post(
            f"/platform/releases/{created['id']}/publish-to-template",
            headers=_auth_headers(reviewer),
        )
        assert response.status_code == 400
        assert "approved by platform" in response.json()["detail"].lower()

        _cleanup_release_artifacts(db, created["id"])
        db.commit()

    def test_can_publish_after_approve(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        developer = _create_user(db, role_name="admin", email_prefix=f"dev_{suffix}")
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_{suffix}")
        db.commit()

        created = _create_release(client, developer, suffix)
        _submit_for_review(client, developer, created["id"])
        _start_review(client, reviewer, created["id"])
        _approve(client, reviewer, created["id"])

        publish = client.post(
            f"/platform/releases/{created['id']}/publish-to-template",
            headers=_auth_headers(reviewer),
        )
        assert publish.status_code == 200, publish.text
        assert publish.json()["orchestrator"]["status"] == "in_progress"
        assert publish.json()["orchestrator"]["current_phase"] == "version_pinned"

        _cleanup_release_artifacts(db, created["id"])
        db.commit()

    def test_cannot_offer_before_published_to_template(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_{suffix}")
        db.commit()

        created = _create_release(client, reviewer, suffix)
        _submit_for_review(client, reviewer, created["id"])
        _start_review(client, reviewer, created["id"])
        _approve(client, reviewer, created["id"])

        response = client.post(
            f"/platform/releases/{created['id']}/offer-to-tenants",
            headers=_auth_headers(reviewer),
        )
        assert response.status_code == 400

        _cleanup_release_artifacts(db, created["id"])
        db.commit()

    def test_review_journals_for_state_transitions(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        client_portal = _create_portal(db, tenant_type=TenantType.CLIENT.value)
        developer = _create_user(db, role_name="admin", email_prefix=f"dev_{suffix}")
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_{suffix}")
        tenant_user = _create_user(
            db,
            role_name="admin",
            tenant_id=client_portal.id,
            email_prefix=f"tenant_{suffix}",
        )
        _add_membership(db, tenant_id=client_portal.id, user_id=tenant_user.id)
        db.commit()

        created = _create_release(client, developer, suffix)
        release_id = created["id"]
        _submit_for_review(client, developer, release_id)
        _start_review(client, reviewer, release_id)
        client.post(
            f"/platform/releases/{release_id}/request-changes",
            headers=_auth_headers(reviewer),
            json={"comment": "Fix docs"},
        )
        client.post(f"/platform/releases/{release_id}/submit-for-review", headers=_auth_headers(developer))
        _start_review(client, reviewer, release_id)
        _approve(client, reviewer, release_id)
        client.post(
            f"/platform/releases/{release_id}/publish-to-template",
            headers=_auth_headers(reviewer),
        )
        client.post(
            f"/platform/releases/{release_id}/offer-to-tenants",
            headers=_auth_headers(reviewer),
        )

        offers = client.get(
            f"/tenants/{client_portal.id}/updates?status=available",
            headers=_auth_headers(tenant_user),
        ).json()
        offer_id = offers[0]["id"]
        client.post(
            f"/tenants/{client_portal.id}/updates/{offer_id}/apply",
            headers=_auth_headers(tenant_user),
        )

        slugs = {
            f"platform-release-created-{release_id}",
            f"platform-release-submitted-{release_id}",
            f"platform-release-review-started-{release_id}",
            f"platform-release-changes-requested-platform-{release_id}",
            f"platform-release-changes-requested-dev-{release_id}",
            f"platform-release-resubmitted-{release_id}",
            f"platform-release-approved-{release_id}",
            f"platform-release-offered-tenants-{release_id}",
            f"tenant-update-applied-{client_portal.id}-{offer_id}",
        }
        for slug in slugs:
            entry = (
                db.query(PlatformEventJournalEntry)
                .filter(PlatformEventJournalEntry.slug == slug)
                .one_or_none()
            )
            assert entry is not None, slug

        _cleanup_release_artifacts(db, release_id)
        db.query(TenantVersion).filter(TenantVersion.tenant_id == client_portal.id).delete(
            synchronize_session=False,
        )
        db.delete(client_portal)
        db.commit()

    def test_dev_and_template_excluded_from_offers(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        _create_portal(db, tenant_type=TenantType.DEV.value)
        client_a = _create_portal(db, tenant_type=TenantType.CLIENT.value)
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_{suffix}")
        db.commit()

        template_id = resolve_template_tenant_id(db)
        assert template_id is not None

        created = _create_release(client, reviewer, suffix)
        _submit_for_review(client, reviewer, created["id"])
        _start_review(client, reviewer, created["id"])
        _approve(client, reviewer, created["id"])
        client.post(
            f"/platform/releases/{created['id']}/publish-to-template",
            headers=_auth_headers(reviewer),
        )
        offer_response = client.post(
            f"/platform/releases/{created['id']}/offer-to-tenants",
            headers=_auth_headers(reviewer),
        )
        assert offer_response.status_code == 200
        assert client_a.id in offer_response.json()["tenant_ids"]
        assert template_id not in offer_response.json()["tenant_ids"]

        dev_offer = (
            db.query(TenantUpdateOffer)
            .join(Portal, Portal.id == TenantUpdateOffer.tenant_id)
            .filter(
                TenantUpdateOffer.release_id == created["id"],
                Portal.tenant_type == TenantType.DEV.value,
            )
            .count()
        )
        assert dev_offer == 0

        _cleanup_release_artifacts(db, created["id"])
        db.delete(client_a)
        db.commit()

    def test_review_count_endpoint_counts_actionable_releases(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        from app.modules.platform_build_registry import service as build_service
        from app.modules.platform_build_registry.models import PlatformCodeBuild
        from app.modules.platform_release_package_registry import service as package_service
        from app.modules.platform_release_package_registry.models import PlatformReleasePackage

        suffix = _suffix()
        reviewer = _create_user(db, role_name="admin", email_prefix=f"rev_count_{suffix}")
        db.commit()

        def _make_package(seq: int, label: str) -> PlatformReleasePackage:
            build_key = f"BLD-20260616-{seq:04d}"
            package_key = f"PKG-20260616-{seq:04d}"
            build = build_service.create_build(
                db,
                build_key=build_key,
                commit_sha="b" * 40,
                build_manifest_json={"schema_revision": f"rev-count-{label}"},
                actor=reviewer,
            )
            build_service.start_build(db, build_id=build.id)
            build_service.mark_succeeded(db, build_id=build.id)
            return package_service.create_release_package(
                db,
                package_key=package_key,
                build_id=build.id,
                platform_version=f"8.8.{seq}",
                package_manifest_json={"title": f"Count {label}", "build_id": build.id},
                module_bom_json={"modules": ["runtime.chat"]},
                actor=reviewer,
            )

        base_seq = int(suffix[:4], 16) % 9998
        count_before = client.get(
            "/platform/releases/review-count",
            headers=_auth_headers(reviewer),
        )
        assert count_before.status_code == 200, count_before.text
        baseline = count_before.json()["count"]

        package_a = _make_package(base_seq, f"{suffix}_a")
        package_b = _make_package(base_seq + 1, f"{suffix}_b")
        db.commit()

        from tests.support.committed_test_registry import register_committed_test_data

        build_ids = [package_a.build_id, package_b.build_id]
        register_committed_test_data(
            package_ids=[package_a.id, package_b.id],
            build_ids=[bid for bid in build_ids if bid is not None],
        )

        client.post(
            f"/platform/releases/{package_a.id}/submit-for-review",
            headers=_auth_headers(reviewer),
        )
        client.post(
            f"/platform/releases/{package_b.id}/submit-for-review",
            headers=_auth_headers(reviewer),
        )
        client.post(
            f"/platform/releases/{package_b.id}/start-review",
            headers=_auth_headers(reviewer),
        )

        count_response = client.get(
            "/platform/releases/review-count",
            headers=_auth_headers(reviewer),
        )
        assert count_response.status_code == 200, count_response.text
        assert count_response.json()["count"] == baseline + 2

        queue_response = client.get(
            "/platform/releases/review-queue",
            headers=_auth_headers(reviewer),
        )
        assert queue_response.status_code == 200, queue_response.text
        queue_ids = {item["id"] for item in queue_response.json()}
        assert package_a.id in queue_ids
        assert package_b.id in queue_ids

        cleanup_build_ids: list[int] = []
        for package in (package_a, package_b):
            if package.build_id is not None:
                cleanup_build_ids.append(package.build_id)
            db.delete(package)
        db.flush()
        for build_id in cleanup_build_ids:
            build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == build_id).one_or_none()
            if build is not None:
                db.delete(build)
        db.commit()
