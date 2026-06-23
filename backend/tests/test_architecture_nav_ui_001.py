"""WI-ARCH-NAV-UI-001 — simplified cards and dynamic implementation files."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest

from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.constants import ArchitectureFindingKind
from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.models import ArchitectureComponent, ArchitectureFinding, ArchitectureScan
from app.modules.platform.architecture_navigator.registry_constants import CORE_REGISTRY_COMPONENT_KEYS
from app.modules.platform.architecture_navigator.schemas import ArchitectureComponentCard
from app.modules.platform.architecture_navigator.scanner import run_architecture_scan


def test_scanner_emits_backend_files_for_company_model():
    draft = run_architecture_scan()
    company_files = [
        item.label
        for item in draft.findings
        if item.component_key == "company-model"
        and item.finding_kind == ArchitectureFindingKind.BACKEND_FILE.value
    ]
    assert company_files
    assert any("modules/portals/" in path for path in company_files)


def test_scanner_emits_frontend_files_for_object_types_engine():
    draft = run_architecture_scan()
    frontend_files = [
        item.label
        for item in draft.findings
        if item.component_key == "object-types-engine"
        and item.finding_kind == ArchitectureFindingKind.FRONTEND_FILE.value
    ]
    if not frontend_files:
        pytest.skip("frontend src scan unavailable in this environment")
    assert any("objectTypes" in path or "objectTypes/" in path for path in frontend_files)


def test_registry_seed_has_no_static_implementation_file_lists():
    for row in service._all_seed_rows():
        merged = service._merged_seed_row(row)
        implementation = merged.get("implementation_json") or {}
        assert "backend_files" not in implementation, merged["component_key"]
        assert "frontend_files" not in implementation, merged["component_key"]


def test_core_scan_scopes_use_platform_prefixes():
    for key in CORE_REGISTRY_COMPONENT_KEYS:
        scope = COMPONENT_SCAN_SCOPES.get(key)
        assert scope is not None, key
        for path in scope.get("backend") or []:
            assert "modules/designer/" not in path, f"{key} has legacy path {path}"
            assert "modules/runtime_entity/" not in path, f"{key} has legacy path {path}"


def test_get_component_card_uses_scan_files_not_registry(monkeypatch):
    component = SimpleNamespace(
        id=11,
        component_key="company-model",
        title="Компания",
        technical_name="Company Model",
        description="desc",
        purpose="purpose",
    )
    scan = SimpleNamespace(
        id=5,
        finished_at=datetime(2026, 6, 20, 12, 0, 0),
        started_at=datetime(2026, 6, 20, 11, 59, 0),
        scanner_version="1.1.0",
    )
    findings = [
        SimpleNamespace(
            label="modules/portals/router.py",
            finding_kind=ArchitectureFindingKind.BACKEND_FILE.value,
        ),
        SimpleNamespace(
            label="modules/tenant_management/service.py",
            finding_kind=ArchitectureFindingKind.BACKEND_FILE.value,
        ),
    ]

    class _ScanQuery:
        def order_by(self, *_args, **_kwargs):
            return self

        def first(self):
            return scan

    class _FindingQuery:
        def filter(self, *_args, **_kwargs):
            return self

        def order_by(self, *_args, **_kwargs):
            return self

        def all(self):
            return findings

    class _ComponentQuery:
        def filter(self, *_args, **_kwargs):
            return self

        def one_or_none(self):
            return component

    class _FakeSession:
        def query(self, model):
            if model is ArchitectureComponent:
                return _ComponentQuery()
            if model is ArchitectureScan:
                return _ScanQuery()
            if model is ArchitectureFinding:
                return _FindingQuery()
            raise AssertionError(model)

    monkeypatch.setattr(service, "ensure_catalog_seeded", lambda _db: None)
    card = service.get_component_card(_FakeSession(), "company-model")

    assert card.title == "Компания"
    assert card.technical_name == "Company Model"
    assert card.backend_files == [
        "modules/portals/router.py",
        "modules/tenant_management/service.py",
    ]
    assert card.frontend_files == []
    assert card.last_scan.scanner_version == "1.1.0"
    assert not hasattr(card, "component_type")
    assert not hasattr(card, "findings")


def test_component_card_schema_fields():
    fields = ArchitectureComponentCard.model_fields
    assert set(fields) == {
        "id",
        "key",
        "title",
        "technical_name",
        "description",
        "purpose",
        "backend_files",
        "frontend_files",
        "last_scan",
    }
