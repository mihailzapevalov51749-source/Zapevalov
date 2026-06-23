"""WI-ARCH-LINKS-001 — CATALOG_LINKS integrity tests."""

from __future__ import annotations

from pathlib import Path

from app.modules.platform.architecture_navigator.catalog import CATALOG_LINKS
from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.link_integrity import (
    active_catalog_keys,
    find_invalid_catalog_links,
    merged_catalog_keys,
)
from app.modules.platform.architecture_navigator.models import ArchitectureLink
from app.modules.platform.architecture_navigator.registry_constants import (
    COMPONENTS_REGISTRY_COMPONENT_KEYS,
    CONFIGURATION_REGISTRY_COMPONENT_KEYS,
    CORE_REGISTRY_COMPONENT_KEYS,
    DATA_REGISTRY_COMPONENT_KEYS,
    INTERFACE_REGISTRY_COMPONENT_KEYS,
    LEGACY_RUNTIME_COMPONENT_KEYS,
    MODULES_REGISTRY_COMPONENT_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    SERVICES_REGISTRY_COMPONENT_KEYS,
    STANDARDS_REGISTRY_COMPONENT_KEYS,
)
from app.modules.platform.architecture_navigator.standards_registry_catalog import (
    STANDARDS_REGISTRY_COMPONENTS,
)


def _all_keys() -> frozenset[str]:
    return merged_catalog_keys(service._all_seed_rows, service._merged_seed_row)


def _active_keys() -> frozenset[str]:
    return active_catalog_keys(service._all_seed_rows, service._merged_seed_row)


def test_catalog_links_have_no_invalid_endpoints():
    invalid = find_invalid_catalog_links(
        CATALOG_LINKS,
        all_seed_rows=service._all_seed_rows,
        merged_seed_row=service._merged_seed_row,
    )
    assert invalid == [], f"invalid catalog links: {invalid}"


def test_catalog_links_exclude_legacy_runtime_contours():
    legacy = set(LEGACY_RUNTIME_COMPONENT_KEYS) | {
        "studio",
        "office",
        "release-governance",
        "dirty-dev-check",
        "publication-pipeline",
        "materialize",
        "verify",
        "activate",
        "rollback",
        "control-plane",
        "restriction-no-display-as-id",
    }
    for link in CATALOG_LINKS:
        assert link["from"] not in legacy, link
        assert link["to"] not in legacy, link


def test_all_catalog_link_targets_exist():
    keys = _all_keys()
    for link in CATALOG_LINKS:
        assert link["from"] in keys, link
        assert link["to"] in keys, link


def test_active_registry_elements_not_linked_to_archived():
    archived = {
        service._merged_seed_row(row)["component_key"]
        for row in service._all_seed_rows()
        if service._merged_seed_row(row).get("registry_key") == REGISTRY_ARCHIVED
    }
    active_union = (
        CORE_REGISTRY_COMPONENT_KEYS
        | SERVICES_REGISTRY_COMPONENT_KEYS
        | MODULES_REGISTRY_COMPONENT_KEYS
        | DATA_REGISTRY_COMPONENT_KEYS
        | INTERFACE_REGISTRY_COMPONENT_KEYS
        | COMPONENTS_REGISTRY_COMPONENT_KEYS
        | CONFIGURATION_REGISTRY_COMPONENT_KEYS
        | STANDARDS_REGISTRY_COMPONENT_KEYS
    )
    for link in CATALOG_LINKS:
        for endpoint in (link["from"], link["to"]):
            if endpoint in active_union:
                assert endpoint not in archived, endpoint
            if endpoint in archived:
                assert endpoint not in active_union, endpoint


def test_interface_component_links_are_valid():
    interface_keys = set(INTERFACE_REGISTRY_COMPONENT_KEYS)
    component_keys = set(COMPONENTS_REGISTRY_COMPONENT_KEYS)
    interface_links = [
        link
        for link in CATALOG_LINKS
        if link["from"] in interface_keys or link["to"] in component_keys
    ]
    assert interface_links, "expected interface ↔ component links"
    keys = _active_keys()
    for link in interface_links:
        assert link["from"] in keys, link
        assert link["to"] in keys, link


def test_configuration_links_use_active_services():
    config_keys = set(CONFIGURATION_REGISTRY_COMPONENT_KEYS)
    service_keys = set(SERVICES_REGISTRY_COMPONENT_KEYS)
    for link in CATALOG_LINKS:
        if link["from"] in config_keys or link["to"] in config_keys:
            assert link["from"] in _active_keys(), link
            assert link["to"] in _active_keys(), link
        if link["from"] in service_keys or link["to"] in service_keys:
            assert "dirty-dev-check" not in (link["from"], link["to"]), link
            assert "publication-pipeline" not in (link["from"], link["to"]), link


def test_standards_related_adrs_exist_on_disk():
    repo_root = Path(__file__).resolve().parents[2]
    adr_dir = repo_root / "docs" / "architecture" / "adr"
    adr_ids = {path.stem for path in adr_dir.glob("ADR-*.md")}

    missing: list[tuple[str, str]] = []
    for row in STANDARDS_REGISTRY_COMPONENTS:
        documents = row.get("documents_json") or {}
        for adr_id in documents.get("related_adrs") or []:
            prefix = adr_id.lower()
            if not any(existing.lower().startswith(prefix) for existing in adr_ids):
                missing.append((row["component_key"], adr_id))

    assert missing == [], f"missing ADR files: {missing}"


def test_decision_control_plane_links_to_platform_identity():
    matches = [
        link
        for link in CATALOG_LINKS
        if link["from"] == "decision-control-plane-not-tenant"
        and link["to"] == "platform-identity"
    ]
    assert matches, "expected redirected control-plane standard link"


def test_migrate_catalog_links_v1_removes_archived_endpoints():
    archived_key = next(
        key
        for key, registry in REGISTRY_COMPONENT_MIGRATION.items()
        if registry == REGISTRY_ARCHIVED
    )
    active_key = next(iter(CORE_REGISTRY_COMPONENT_KEYS))

    links: list[ArchitectureLink] = [
        ArchitectureLink(
            from_component_key=archived_key,
            to_component_key=active_key,
            link_type="uses",
        ),
        ArchitectureLink(
            from_component_key=active_key,
            to_component_key=active_key,
            link_type="uses",
        ),
    ]

    class _LinkQuery:
        def __init__(self, store: list[ArchitectureLink]):
            self._store = store

        def all(self):
            return list(self._store)

    class _FakeSession:
        def __init__(self):
            self.deleted: list[ArchitectureLink] = []
            self.added: list[ArchitectureLink] = []

        def query(self, model):
            assert model is ArchitectureLink
            return _LinkQuery(links)

        def delete(self, obj):
            self.deleted.append(obj)
            links.remove(obj)

        def add(self, obj):
            self.added.append(obj)
            links.append(obj)

    session = _FakeSession()
    changed = service._migrate_catalog_links_v1(session)
    assert changed is True
    assert len(session.deleted) == 2
    assert any(link.from_component_key == archived_key for link in session.deleted)
    assert session.added


def test_migrate_catalog_links_v1_removes_noncanonical_and_adds_missing():
    canonical = CATALOG_LINKS[0]
    active_key = next(iter(CORE_REGISTRY_COMPONENT_KEYS))
    extra_link = ArchitectureLink(
        from_component_key=active_key,
        to_component_key=active_key,
        link_type="depends_on",
    )
    links: list[ArchitectureLink] = [
        extra_link,
    ]

    class _LinkQuery:
        def __init__(self, store: list[ArchitectureLink]):
            self._store = store

        def all(self):
            return list(self._store)

    class _FakeSession:
        def __init__(self):
            self.deleted: list[ArchitectureLink] = []
            self.added: list[ArchitectureLink] = []

        def query(self, model):
            assert model is ArchitectureLink
            return _LinkQuery(links)

        def delete(self, obj):
            self.deleted.append(obj)
            links.remove(obj)

        def add(self, obj):
            self.added.append(obj)
            links.append(obj)

    session = _FakeSession()
    changed = service._migrate_catalog_links_v1(session)
    assert changed is True
    assert extra_link in session.deleted
    assert any(
        obj.from_component_key == canonical["from"]
        and obj.to_component_key == canonical["to"]
        and obj.link_type == canonical["type"]
        for obj in session.added
    )
