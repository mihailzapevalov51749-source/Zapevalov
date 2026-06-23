"""WI-ARCH-REG-SERV-002B — regression tests for services seed/migration conflict."""

from __future__ import annotations

from app.modules.platform.architecture_navigator.models import ArchitectureComponent, ArchitectureLink
from app.modules.platform.architecture_navigator.registry_constants import (
    ELEMENT_STATUS_ACTIVE,
    REGISTRY_ARCHIVED,
    REGISTRY_SERVICES,
    SERVICES_REGISTRY_COMPONENT_KEYS,
)
from app.modules.platform.architecture_navigator import service


class _LegacyServicesSeedSession:
    """Minimal session simulating pre-002 DEV DB with publication-pipeline."""

    def __init__(self) -> None:
        self.components: dict[str, ArchitectureComponent] = {
            "session-bridge": ArchitectureComponent(
                component_key="session-bridge",
                technical_name="Session Bridge",
                component_type="service",
                category_key="services",
                title="Session Bridge",
                registry_key=REGISTRY_SERVICES,
                element_status=ELEMENT_STATUS_ACTIVE,
                sort_order=10,
            ),
            "platform-identity": ArchitectureComponent(
                component_key="platform-identity",
                technical_name="Platform Identity",
                component_type="service",
                category_key="services",
                title="Platform Identity",
                registry_key=REGISTRY_SERVICES,
                element_status=ELEMENT_STATUS_ACTIVE,
                sort_order=20,
            ),
            "publication-pipeline": ArchitectureComponent(
                component_key="publication-pipeline",
                technical_name="Publication Pipeline",
                component_type="service",
                category_key="services",
                title="Publication Pipeline",
                registry_key=REGISTRY_SERVICES,
                element_status=ELEMENT_STATUS_ACTIVE,
                sort_order=40,
            ),
            "search-service": ArchitectureComponent(
                component_key="search-service",
                technical_name="Search Service",
                component_type="service",
                category_key="services",
                title="Search Service",
                registry_key=REGISTRY_SERVICES,
                element_status=ELEMENT_STATUS_ACTIVE,
                sort_order=50,
            ),
            "materialize": ArchitectureComponent(
                component_key="materialize",
                technical_name="Materialize",
                component_type="service",
                category_key="services",
                title="Materialize",
                registry_key=REGISTRY_SERVICES,
                element_status=ELEMENT_STATUS_ACTIVE,
                sort_order=60,
            ),
        }
        self.links: list[ArchitectureLink] = []
        self.flushes = 0
        self.commits = 0

    def query(self, model):
        if model is ArchitectureComponent:
            return _ComponentQuery(self.components)
        if model is ArchitectureLink:
            return _LinkQuery(self.links)
        raise AssertionError(f"unexpected query model: {model}")

    def add(self, obj) -> None:
        if isinstance(obj, ArchitectureComponent):
            self.components[obj.component_key] = obj
        elif isinstance(obj, ArchitectureLink):
            self.links.append(obj)

    def flush(self) -> None:
        self.flushes += 1
        # Simulate PK assignment and index consistency after rename.
        reindexed: dict[str, ArchitectureComponent] = {}
        for row in self.components.values():
            reindexed[row.component_key] = row
        self.components = reindexed

    def commit(self) -> None:
        self.commits += 1


class _ComponentQuery:
    def __init__(self, components: dict[str, ArchitectureComponent]) -> None:
        self._components = components
        self._filtered: list[ArchitectureComponent] | None = None

    def filter(self, *_args, **_kwargs):
        return self

    def filter_by(self, **kwargs):
        key = kwargs.get("component_key")
        if key is None:
            self._filtered = list(self._components.values())
            return self
        row = self._components.get(key)
        self._filtered = [row] if row is not None else []
        return self

    def one_or_none(self):
        if self._filtered is None:
            return None
        return self._filtered[0] if self._filtered else None

    def all(self):
        if self._filtered is not None:
            return list(self._filtered)
        return list(self._components.values())


class _LinkQuery:
    def __init__(self, links: list[ArchitectureLink]) -> None:
        self._links = links

    def all(self):
        return list(self._links)


def _service_keys(session: _LegacyServicesSeedSession) -> set[str]:
    return {
        key
        for key, row in session.components.items()
        if row.registry_key == REGISTRY_SERVICES and row.element_status == ELEMENT_STATUS_ACTIVE
    }


def test_ensure_catalog_seeded_renames_publication_pipeline_without_duplicate():
    session = _LegacyServicesSeedSession()
    service.ensure_catalog_seeded(session)

    assert "publication-pipeline" not in session.components
    assert "publication-service" in session.components
    publication = session.components["publication-service"]
    assert publication.registry_key == REGISTRY_SERVICES
    assert publication.element_status == ELEMENT_STATUS_ACTIVE
    assert session.commits == 1


def test_ensure_catalog_seeded_idempotent_for_legacy_publication_pipeline():
    session = _LegacyServicesSeedSession()
    service.ensure_catalog_seeded(session)
    keys_after_first = set(session.components.keys())
    service_keys_after_first = _service_keys(session)

    service.ensure_catalog_seeded(session)

    assert set(session.components.keys()) == keys_after_first
    assert _service_keys(session) == service_keys_after_first
    assert "publication-service" in session.components
    assert "publication-pipeline" not in session.components


def test_ensure_catalog_seeded_services_tab_has_nine_active_elements():
    session = _LegacyServicesSeedSession()
    service.ensure_catalog_seeded(session)
    active_service_keys = _service_keys(session)
    assert active_service_keys == set(SERVICES_REGISTRY_COMPONENT_KEYS)


def test_ensure_catalog_seeded_archives_legacy_when_canonical_already_exists():
    session = _LegacyServicesSeedSession()
    session.components["publication-service"] = ArchitectureComponent(
        component_key="publication-service",
        technical_name="Publication Service",
        component_type="service",
        category_key="services",
        title="Publication Service",
        registry_key=REGISTRY_SERVICES,
        element_status=ELEMENT_STATUS_ACTIVE,
        sort_order=40,
    )
    service.ensure_catalog_seeded(session)

    pipeline = session.components.get("publication-pipeline")
    assert pipeline is not None
    assert pipeline.registry_key == REGISTRY_ARCHIVED
    assert pipeline.element_status != ELEMENT_STATUS_ACTIVE
    assert session.components["publication-service"].registry_key == REGISTRY_SERVICES
