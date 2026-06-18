from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from app.modules.platform_deployment_registry.constants import PlatformDeploymentStatus
from app.modules.platform_release.constants import PlatformReleaseStatus
from app.modules.platform_release.schemas import PlatformReleaseOut
from app.modules.platform_release_package_registry import adapters, governance
from app.modules.platform_release_package_registry.constants import PlatformReleasePackageStatus


def _package(
    *,
    status: str = PlatformReleasePackageStatus.DRAFT.value,
    manifest: dict | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=42,
        package_key="PKG-20260616-0001",
        platform_version="1.2.4",
        build_id=7,
        status=status,
        package_manifest_json=dict(manifest or {}),
        module_bom_json={"modules": [{"module_key": "runtime.chat"}]},
        release_notes="Описание релиза",
        created_by=11,
        created_at=datetime(2026, 6, 16, 10, 0, 0),
        published_at=None,
    )


def _build(source_tenant_id: int = 1) -> SimpleNamespace:
    return SimpleNamespace(
        id=7,
        build_manifest_json={"source_tenant_id": source_tenant_id},
    )


def _template_deployment(
    *,
    status: str = PlatformDeploymentStatus.SUCCEEDED.value,
    target_tenant_id: int = 2,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=99,
        status=status,
        target_tenant_id=target_tenant_id,
        finished_at=datetime(2026, 6, 16, 12, 0, 0),
        created_by=22,
    )


def test_default_governance_shape():
    package = _package()
    result = governance.get_governance(package)

    assert result["review_status"] == PlatformReleaseStatus.DRAFT.value
    assert result["submitted_at"] is None
    assert result["submitted_by"] is None
    assert result["review_started_at"] is None
    assert result["review_started_by"] is None
    assert result["review_comment"] is None
    assert result["approved_at"] is None
    assert result["approved_by"] is None
    assert result["changes_requested_at"] is None
    assert result["changes_requested_by"] is None
    assert result["offered_at"] is None
    assert result["offered_by"] is None


def test_set_and_get_review_status():
    package = _package()
    governance.set_review_status(package, PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value)

    assert governance.get_review_status(package) == PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value
    assert package.package_manifest_json["governance"]["review_status"] == (
        PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value
    )


def test_set_governance_merges_without_dropping_other_manifest_keys():
    package = _package(manifest={"title": "Релиз Q2", "build_id": 7})
    governance.set_governance(
        package,
        {
            "review_status": PlatformReleaseStatus.IN_PLATFORM_REVIEW.value,
            "review_comment": "Проверяем",
        },
    )

    assert package.package_manifest_json["title"] == "Релиз Q2"
    assert package.package_manifest_json["governance"]["review_comment"] == "Проверяем"


def test_compute_ui_status_draft():
    package = _package()
    assert governance.compute_platform_release_ui_status(package) == PlatformReleaseStatus.DRAFT.value


def test_compute_ui_status_ready_for_platform_review():
    package = _package(
        manifest={
            "governance": {
                "review_status": PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value,
            },
        },
    )
    assert governance.compute_platform_release_ui_status(package) == (
        PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value
    )


def test_compute_ui_status_published_to_template():
    package = _package(status=PlatformReleasePackageStatus.PUBLISHED.value)
    deployment = _template_deployment()

    assert governance.compute_platform_release_ui_status(
        package,
        latest_template_deployment=deployment,
    ) == PlatformReleaseStatus.PUBLISHED_TO_TEMPLATE.value


def test_compute_ui_status_offered_to_tenants_has_priority():
    package = _package(
        status=PlatformReleasePackageStatus.PUBLISHED.value,
        manifest={
            "governance": {
                "review_status": PlatformReleaseStatus.PUBLISHED_TO_TEMPLATE.value,
            },
        },
    )
    deployment = _template_deployment()

    assert governance.compute_platform_release_ui_status(
        package,
        latest_template_deployment=deployment,
        offers_exist=True,
    ) == PlatformReleaseStatus.OFFERED_TO_TENANTS.value


def test_package_to_platform_release_out_compatible_structure():
    package = _package(
        status=PlatformReleasePackageStatus.PUBLISHED.value,
        manifest={
            "title": "Релиз платформы 1.2.4",
            "changes": [
                {
                    "change_type": "feature",
                    "title": "Новый модуль",
                    "description": "Добавлен чат",
                    "risk_level": "low",
                },
            ],
            "governance": {
                "review_status": PlatformReleaseStatus.APPROVED_BY_PLATFORM.value,
                "submitted_at": "2026-06-16T09:00:00",
                "submitted_by": 11,
                "approved_at": "2026-06-16T11:00:00",
                "approved_by": 22,
            },
        },
    )
    build = _build(source_tenant_id=1)
    deployment = _template_deployment(target_tenant_id=2)

    result = adapters.package_to_platform_release_out(
        package,
        build=build,
        latest_template_deployment=deployment,
    )

    assert isinstance(result, PlatformReleaseOut)
    assert result.id == 42
    assert result.version == "1.2.4"
    assert result.title == "Релиз платформы 1.2.4"
    assert result.description == "Описание релиза"
    assert result.status == PlatformReleaseStatus.PUBLISHED_TO_TEMPLATE.value
    assert result.source_tenant_id == 1
    assert result.target_template_tenant_id == 2
    assert result.created_by == 11
    assert result.submitted_by == 11
    assert result.approved_by == 22
    assert result.published_at == deployment.finished_at
    assert result.published_by == 22
    assert len(result.changes) == 1
    assert result.changes[0].title == "Новый модуль"
    assert result.changes[0].release_id == 42

    payload = result.model_dump()
    assert payload["id"] == 42
    assert payload["status"] == PlatformReleaseStatus.PUBLISHED_TO_TEMPLATE.value
    assert payload["changes"][0]["change_type"] == "feature"


def test_package_to_platform_release_out_handles_missing_optional_fields():
    package = _package()
    result = adapters.package_to_platform_release_out(package)

    assert isinstance(result, PlatformReleaseOut)
    assert result.id == 42
    assert result.title == "Релиз 1.2.4"
    assert result.description == "Описание релиза"
    assert result.status == PlatformReleaseStatus.DRAFT.value
    assert result.source_tenant_id == 0
    assert result.target_template_tenant_id is None
    assert result.submitted_at is None
    assert result.review_comment is None
    assert result.published_at is None
    assert result.published_by is None
    assert result.changes == []


def test_set_review_status_rejects_unknown_value():
    package = _package()
    with pytest.raises(ValueError):
        governance.set_review_status(package, "unknown_status")
