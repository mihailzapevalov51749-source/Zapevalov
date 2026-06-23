"""Registry tab → architecture document mapping for Architecture Navigator.

Read-only projection over files in docs/architecture/. Does not duplicate document
content and does not modify component registries.
"""

from __future__ import annotations

from app.modules.platform.architecture_navigator.registry_constants import (
    REGISTRY_CONFIGURATION,
    REGISTRY_COMPONENTS,
    REGISTRY_CORE,
    REGISTRY_DATA,
    REGISTRY_INTERFACE,
    REGISTRY_MODULES,
    REGISTRY_OVERVIEW,
    REGISTRY_SERVICES,
    REGISTRY_STANDARDS,
)

REGISTRY_DOCUMENT_PATHS: dict[str, str] = {
    REGISTRY_OVERVIEW: "docs/architecture/YASNOPRO_ARCHITECTURE_OVERVIEW.md",
    REGISTRY_CORE: "docs/architecture/YASNOPRO_CORE_ARCHITECTURE.md",
    REGISTRY_STANDARDS: "docs/architecture/YASNOPRO_PLATFORM_STANDARDS.md",
    REGISTRY_SERVICES: "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
    REGISTRY_MODULES: "docs/architecture/YASNOPRO_PLATFORM_MODULES.md",
    REGISTRY_COMPONENTS: "docs/architecture/YASNOPRO_PLATFORM_COMPONENTS.md",
    REGISTRY_INTERFACE: "docs/architecture/YASNOPRO_PLATFORM_UI.md",
    REGISTRY_DATA: "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
    REGISTRY_CONFIGURATION: "docs/architecture/YASNOPRO_PLATFORM_CONFIGURATION.md",
}


def resolve_registry_document_path(registry_key: str) -> str | None:
    return REGISTRY_DOCUMENT_PATHS.get(registry_key)
