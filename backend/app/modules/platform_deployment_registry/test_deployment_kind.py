"""Tests for Deployment Kind model (WI-IMPL-005)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.platform_deployment_registry.constants import (
    PROVISION_BASELINE_RELEASE_ID,
    PlatformDeploymentKind,
    PlatformDeploymentStatus,
    PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_deployment_registry.deployment_kind import (
    enrich_deployment_manifest,
    infer_deployment_kind,
    resolve_runtime_routing,
    validate_deployment_kind_contract,
)
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.portals.models import Portal


class _Query:
    def __init__(self, portal: SimpleNamespace | None) -> None:
        self._portal = portal

    def filter(self, *_args, **_kwargs) -> _Query:
        return self

    def one_or_none(self) -> SimpleNamespace | None:
        return self._portal


class _Db:
    def __init__(self, portal: SimpleNamespace | None = None) -> None:
        self._portal = portal

    def query(self, _model) -> _Query:
        return _Query(self._portal)


@pytest.mark.parametrize(
    ("created_via", "target_type", "expected"),
    [
        ("platform_releases_api_adapter", "template", PlatformDeploymentKind.TEMPLATE_PUBLISH.value),
        ("tenant_update_apply", "client", PlatformDeploymentKind.COMPANY_UPDATE.value),
        ("provision_baseline", "client", PlatformDeploymentKind.PROVISION_BASELINE.value),
        ("deployment_rollback", "client", PlatformDeploymentKind.ROLLBACK.value),
        ("dev_deploy", "dev", PlatformDeploymentKind.DEV_DEPLOY.value),
        (None, "dev", PlatformDeploymentKind.DEV_DEPLOY.value),
        (None, "client", PlatformDeploymentKind.COMPANY_UPDATE.value),
        (None, "template", PlatformDeploymentKind.TEMPLATE_PUBLISH.value),
    ],
)
def test_infer_deployment_kind(created_via: str | None, target_type: str, expected: str) -> None:
    manifest = {"created_via": created_via} if created_via else {}
    assert (
        infer_deployment_kind(
            target_environment_type=target_type,
            deployment_manifest_json=manifest,
        )
        == expected
    )


def test_validate_rejects_invalid_kind() -> None:
    with pytest.raises(HTTPException) as exc_info:
        validate_deployment_kind_contract(
            deployment_kind="unknown_kind",
            target_environment_type="template",
            target_tenant_id=1,
        )
    assert exc_info.value.status_code == 400


def test_validate_rejects_kind_target_mismatch() -> None:
    with pytest.raises(HTTPException) as exc_info:
        validate_deployment_kind_contract(
            deployment_kind=PlatformDeploymentKind.TEMPLATE_PUBLISH.value,
            target_environment_type=PlatformDeploymentTargetEnvironmentType.CLIENT.value,
            target_tenant_id=1,
        )
    assert exc_info.value.status_code == 400


def test_validate_rollback_requires_previous_package() -> None:
    with pytest.raises(HTTPException) as exc_info:
        validate_deployment_kind_contract(
            deployment_kind=PlatformDeploymentKind.ROLLBACK.value,
            target_environment_type=PlatformDeploymentTargetEnvironmentType.CLIENT.value,
            target_tenant_id=1,
            previous_release_package_id=None,
        )
    assert exc_info.value.status_code == 400


@pytest.mark.parametrize(
    ("kind", "expected_slot"),
    [
        (PlatformDeploymentKind.TEMPLATE_PUBLISH.value, "template"),
        (PlatformDeploymentKind.DEV_DEPLOY.value, "dev"),
        (PlatformDeploymentKind.COMPANY_UPDATE.value, "company/ooo_rozetka"),
        (PlatformDeploymentKind.PROVISION_BASELINE.value, "company/ooo_rozetka"),
    ],
)
def test_resolve_runtime_routing_slots(kind: str, expected_slot: str) -> None:
    db = _Db(SimpleNamespace(code="ooo_rozetka"))
    routing = resolve_runtime_routing(
        db,
        deployment_kind=kind,
        target_tenant_id=1,
        deployment_manifest_json={},
    )
    assert routing["runtime_slot_key"] == expected_slot
    assert routing["deployment_kind"] == kind


def test_provision_baseline_pins_release_001() -> None:
    db = _Db(SimpleNamespace(code="ooo_rozetka"))
    routing = resolve_runtime_routing(
        db,
        deployment_kind=PlatformDeploymentKind.PROVISION_BASELINE.value,
        target_tenant_id=1,
        deployment_manifest_json={},
    )
    assert routing["materialized_release_id"] == PROVISION_BASELINE_RELEASE_ID


def test_rollback_resolves_previous_release_from_succeeded_deployment() -> None:
    previous = SimpleNamespace(
        deployment_manifest_json={"materialized_release_id": "release-017"},
        status=PlatformDeploymentStatus.SUCCEEDED.value,
        finished_at=None,
        id=99,
    )

    class _RollbackQuery:
        def filter(self, *_args, **_kwargs) -> _RollbackQuery:
            return self

        def order_by(self, *_args, **_kwargs) -> _RollbackQuery:
            return self

        def first(self) -> SimpleNamespace:
            return previous

    class _RollbackDb:
        def query(self, model):
            if model is Portal:
                return _Query(SimpleNamespace(code="ooo_rozetka"))
            if model is PlatformDeployment:
                return _RollbackQuery()
            raise AssertionError(f"unexpected model: {model}")

    routing = resolve_runtime_routing(
        _RollbackDb(),
        deployment_kind=PlatformDeploymentKind.ROLLBACK.value,
        target_tenant_id=1,
        deployment_manifest_json={},
        previous_release_package_id=42,
    )
    assert routing["materialized_release_id"] == "release-017"


def test_enrich_deployment_manifest_merges_kind_and_routing() -> None:
    db = _Db(SimpleNamespace(code="demo_co"))
    manifest = enrich_deployment_manifest(
        db,
        deployment_kind=PlatformDeploymentKind.COMPANY_UPDATE.value,
        target_tenant_id=1,
        deployment_manifest_json={"created_via": "tenant_update_apply"},
    )
    assert manifest["deployment_kind"] == PlatformDeploymentKind.COMPANY_UPDATE.value
    assert manifest["runtime_slot_key"] == "company/demo_co"


def test_company_kind_requires_portal_code() -> None:
    db = _Db(SimpleNamespace(code=None))
    with pytest.raises(HTTPException) as exc_info:
        resolve_runtime_routing(
            db,
            deployment_kind=PlatformDeploymentKind.COMPANY_UPDATE.value,
            target_tenant_id=1,
            deployment_manifest_json={},
        )
    assert exc_info.value.status_code == 400
