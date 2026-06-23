"""Architecture registry tabs and mappings (WI-ARCH-REG-002, WI-ARCH-CLEAN-002, WI-ARCH-CORE-002, WI-ARCH-REG-SERV-002, WI-ARCH-REG-MOD-002, WI-ARCH-REG-DATA-002, WI-ARCH-REG-UI-002, WI-ARCH-REG-COMP-002, WI-ARCH-REG-CONF-002, WI-ARCH-REG-STD-002)."""

from __future__ import annotations

REGISTRY_OVERVIEW = "overview"
REGISTRY_CORE = "core"
REGISTRY_STANDARDS = "standards"
REGISTRY_SERVICES = "services"
REGISTRY_MODULES = "modules"
REGISTRY_COMPONENTS = "components"
REGISTRY_INTERFACE = "interface"
REGISTRY_DATA = "data"
REGISTRY_CONFIGURATION = "configuration"

# Legacy compositional keys — removed from DEV Studio tabs in v1.2 (governance redirect only).
REGISTRY_PUBLICATION = "publication"
REGISTRY_RULES = "rules"

# Legacy tab key — resolved to configuration (backward-compatible URLs).
REGISTRY_RUNTIME_LEGACY = "runtime"

# Hidden bucket for deprecated / operational / governance-only elements.
REGISTRY_ARCHIVED = "archived"

COMPOSITIONAL_REGISTRY_ORDER: tuple[str, ...] = (
    REGISTRY_CORE,
    REGISTRY_STANDARDS,
    REGISTRY_SERVICES,
    REGISTRY_MODULES,
    REGISTRY_COMPONENTS,
    REGISTRY_INTERFACE,
    REGISTRY_DATA,
    REGISTRY_CONFIGURATION,
)

REGISTRY_ORDER: tuple[str, ...] = (REGISTRY_OVERVIEW, *COMPOSITIONAL_REGISTRY_ORDER)

REGISTRY_LABELS: dict[str, str] = {
    REGISTRY_OVERVIEW: "Обзор",
    REGISTRY_CORE: "Ядро",
    REGISTRY_STANDARDS: "Стандарты",
    REGISTRY_SERVICES: "Службы",
    REGISTRY_MODULES: "Модули",
    REGISTRY_COMPONENTS: "Компоненты",
    REGISTRY_INTERFACE: "Интерфейс",
    REGISTRY_DATA: "Данные",
    REGISTRY_CONFIGURATION: "Конфигурация",
}

REGISTRY_LEGACY_ALIASES: dict[str, str] = {
    REGISTRY_RUNTIME_LEGACY: REGISTRY_CONFIGURATION,
}

LEGACY_GOVERNANCE_REGISTRY_KEYS: frozenset[str] = frozenset(
    {
        REGISTRY_PUBLICATION,
        REGISTRY_RULES,
    }
)

CATEGORY_TO_REGISTRY: dict[str, str] = {
    "configuration": REGISTRY_CONFIGURATION,
    "subsystems": REGISTRY_INTERFACE,
    "core": REGISTRY_CORE,
    "platform_components": REGISTRY_COMPONENTS,
    "platform_ui_elements": REGISTRY_INTERFACE,
    "modules": REGISTRY_MODULES,
    "services": REGISTRY_SERVICES,
    "data": REGISTRY_DATA,
    "decisions": REGISTRY_STANDARDS,
    "restrictions": REGISTRY_ARCHIVED,
    "deviations": REGISTRY_OVERVIEW,
}

LEGACY_RUNTIME_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "control-plane",
        "dev-environment",
        "template-environment",
        "client-environment",
    }
)

# v1.2 migration: former publication/rules catalog rows → compositional or archived home.
REGISTRY_COMPONENT_MIGRATION: dict[str, str] = {
    "release-package": REGISTRY_ARCHIVED,
    "release-scope": REGISTRY_ARCHIVED,
    "release-candidate": REGISTRY_ARCHIVED,
    "release-governance": REGISTRY_ARCHIVED,
    "materialize": REGISTRY_ARCHIVED,
    "verify": REGISTRY_ARCHIVED,
    "activate": REGISTRY_ARCHIVED,
    "rollback": REGISTRY_ARCHIVED,
    "publication-pipeline": REGISTRY_ARCHIVED,
    "publication-service": REGISTRY_SERVICES,
    "deployment-execution": REGISTRY_SERVICES,
    "company-provisioning": REGISTRY_SERVICES,
    "file-service": REGISTRY_SERVICES,
    "notification-dispatch": REGISTRY_SERVICES,
    "version-pin": REGISTRY_ARCHIVED,
    "dirty-dev-check": REGISTRY_ARCHIVED,
    "rule-dev-only-development": REGISTRY_ARCHIVED,
    "rule-no-direct-template": REGISTRY_ARCHIVED,
    "rule-no-direct-client": REGISTRY_ARCHIVED,
    "rule-no-tenant-bypass": REGISTRY_ARCHIVED,
    "restriction-no-tenant-data-in-control-plane": REGISTRY_ARCHIVED,
    "restriction-no-display-as-id": REGISTRY_ARCHIVED,
    "restriction-runtime-no-designer-draft": REGISTRY_ARCHIVED,
    # WI-ARCH-REG-STD-002: legacy flat standards rows replaced by hierarchical registry.
    "standard-object": REGISTRY_ARCHIVED,
    "standard-field": REGISTRY_ARCHIVED,
    "standard-api": REGISTRY_ARCHIVED,
    "standard-journal": REGISTRY_ARCHIVED,
    "standard-publication": REGISTRY_ARCHIVED,
    "standard-modules": REGISTRY_ARCHIVED,
    # WI-ARCH-CORE-002: disputed core elements → compositional homes (YASNOPRO_CORE_ARCHITECTURE §5).
    "ai-context-engine": REGISTRY_SERVICES,
    "published-catalog": REGISTRY_ARCHIVED,
    "event-journal-core": REGISTRY_ARCHIVED,
    # WI-ARCH-REG-DATA-002: legacy / consolidated data rows leave data registry tab.
    "object-schema-data": REGISTRY_ARCHIVED,
    "platform-audit-journal-data": REGISTRY_ARCHIVED,
    "runtime-entities-data": REGISTRY_ARCHIVED,
    "designer-metadata-data": REGISTRY_ARCHIVED,
    "configuration-data": REGISTRY_ARCHIVED,
    "settings-data": REGISTRY_ARCHIVED,
    # WI-ARCH-REG-MOD-002: solution/disputed rows removed from modules registry tab.
    "module-crm": REGISTRY_ARCHIVED,
    "module-projects": REGISTRY_ARCHIVED,
    "module-org-structure": REGISTRY_ARCHIVED,
    # WI-ARCH-REG-UI-002: application contours are not interface UI elements.
    "studio": REGISTRY_ARCHIVED,
    "office": REGISTRY_ARCHIVED,
    "tenant-administration": REGISTRY_ARCHIVED,
}

# Expected active elements in registry_key=core after WI-ARCH-CORE-004 + WI-ARCH-REG-MOD-002 + WI-ARCH-REG-DATA-002.
CORE_REGISTRY_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "company-model",
        "entity-engine",
        "object-types-engine",
        "fields-engine",
        "relation-engine",
        "view-engine",
        "action-engine",
        "process-engine",
        "event-engine",
        "navigation-engine",
        "permission-engine",
        "portal-composition-engine",
    }
)

# Expected active elements in registry_key=modules after WI-ARCH-REG-MOD-002 normalization.
MODULES_REGISTRY_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "chats-module",
        "calendar-module",
        "document-libraries-module",
        "notifications-module",
        "module-bpmn",
        "module-yasii",
    }
)

LEGACY_MODULE_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "module-crm",
        "module-projects",
        "module-org-structure",
    }
)

# Expected active elements in registry_key=services after WI-ARCH-REG-SERV-002 normalization.
SERVICES_REGISTRY_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "platform-identity",
        "session-bridge",
        "company-provisioning",
        "publication-service",
        "deployment-execution",
        "file-service",
        "search-service",
        "notification-dispatch",
        "ai-context-engine",
    }
)

# Legacy service keys renamed or consolidated (DB migration + archived phase operations).
LEGACY_SERVICE_COMPONENT_KEY_RENAMES: dict[str, str] = {
    "publication-pipeline": "publication-service",
}

# Expected active elements in registry_key=data after WI-ARCH-REG-DATA-002 normalization.
DATA_REGISTRY_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "structure-metadata-data",
        "business-records-data",
        "relation-instances-data",
        "users-access-data",
        "tenant-configuration-data",
        "user-settings-data",
        "module-domain-data",
        "platform-catalog-data",
        "release-operations-data",
        "journals-data",
        "file-metadata-data",
    }
)

# Legacy data keys consolidated or renamed (DB migration + archived phase).
LEGACY_DATA_COMPONENT_KEY_RENAMES: dict[str, str] = {
    "runtime-entities-data": "business-records-data",
    "designer-metadata-data": "structure-metadata-data",
    "configuration-data": "tenant-configuration-data",
    "settings-data": "user-settings-data",
}

LEGACY_DATA_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "object-schema-data",
        "platform-audit-journal-data",
        "event-journal-core",
        "runtime-entities-data",
        "designer-metadata-data",
        "configuration-data",
        "settings-data",
    }
)

DEPLOYMENT_PHASE_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "materialize",
        "verify",
        "activate",
        "rollback",
    }
)

# Expected active elements in registry_key=interface after WI-ARCH-REG-UI-002 normalization.
INTERFACE_REGISTRY_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "side-navigation",
        "top-navigation",
        "breadcrumbs",
        "avatar",
        "user-menu",
        "global-search",
        "notification-center",
        "settings-entry",
        "workspace-tabs",
        "favorites-recent",
        "context-switcher",
        "entity-card",
        "view-surface",
        "action-panel",
        "properties-panel",
        "modal-zone",
        "side-panel",
        "context-menu",
        "quick-create",
        "picker-panel",
    }
)

# Legacy interface keys renamed during WI-ARCH-REG-UI-002 (DB migration + seed parity).
LEGACY_INTERFACE_COMPONENT_KEY_RENAMES: dict[str, str] = {
    "notification-bell": "notification-center",
    "settings-button": "settings-entry",
}

LEGACY_INTERFACE_SUBSYSTEM_KEYS: frozenset[str] = frozenset(
    {
        "studio",
        "office",
        "tenant-administration",
    }
)

# Expected active elements in registry_key=components after WI-ARCH-REG-COMP-002 normalization.
COMPONENTS_REGISTRY_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "platform-page",
        "platform-modal",
        "platform-table",
        "platform-form",
        "platform-tree",
        "platform-card",
        "platform-tabs",
        "platform-drawer",
        "platform-toolbar",
        "platform-notification",
        "platform-sidebar",
        "platform-breadcrumbs",
        "platform-context-menu",
        "user-picker",
        "object-picker",
        "file-picker",
        "platform-kanban",
        "platform-calendar",
    }
)

# Legacy display names from pre-COMP-002 registry overrides (metadata only, not component_key).
LEGACY_COMPONENT_DISPLAY_NAMES: dict[str, str] = {
    "platform-table": "ObjectTable",
    "platform-modal": "Modal",
    "platform-tree": "NavigationTree",
}

ELEMENT_STATUS_ACTIVE = "active"
ELEMENT_STATUS_PARTIAL = "partial"
ELEMENT_STATUS_PLANNED = "planned"
ELEMENT_STATUS_DEPRECATED = "deprecated"
ELEMENT_STATUS_EXPERIMENTAL = "experimental"

# Expected active elements in registry_key=configuration after WI-ARCH-REG-CONF-002 normalization.
CONFIGURATION_REGISTRY_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "config-group-navigation",
        "config-nav-structure",
        "config-nav-menu-items",
        "config-nav-order-hierarchy",
        "config-nav-icons-labels",
        "config-nav-module-entry-points",
        "config-group-pages",
        "config-pages-catalog",
        "config-pages-composition",
        "config-pages-home",
        "config-pages-layout-templates",
        "config-group-workspaces",
        "config-workspaces",
        "config-workspace-tabs",
        "config-system-tabs",
        "config-group-object-placement",
        "config-object-type-publication",
        "config-view-publication",
        "config-object-nav-binding",
        "config-quick-forms",
        "config-group-module-placement",
        "config-module-publication",
        "config-module-tenant-settings",
        "config-group-ui-placement",
        "config-shell-layout",
        "config-top-bar-zones",
        "config-ui-visibility",
        "config-portal-branding",
        "config-group-action-placement",
        "config-list-toolbar-actions",
        "config-card-actions",
        "config-context-actions",
        "config-action-groups-order",
        "config-group-startup-roles",
        "config-group-startup-company",
        "config-group-published-catalog",
    }
)

LEGACY_CONFIGURATION_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "published-catalog",
    }
)

# Expected active elements in registry_key=standards after WI-ARCH-REG-STD-002 normalization.
STANDARDS_REGISTRY_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        # Constitution (12)
        "constitution-norm-ten-categories",
        "constitution-norm-one-primary-category",
        "constitution-norm-classification-methodology",
        "constitution-norm-display-not-id",
        "constitution-norm-single-sot",
        "constitution-norm-platform-tenant-separation",
        "constitution-norm-dev-template-company",
        "constitution-norm-environment-isolation",
        "constitution-norm-company-isolated-runtime",
        "constitution-norm-no-logic-duplication",
        "constitution-norm-system-entity-standard",
        "constitution-norm-entity-identity-contract",
        # Architectural principles (3)
        "decision-control-plane-not-tenant",
        "decision-platform-owner-not-tenant-user",
        "decision-entity-sot",
        # Development standards (10)
        "standard-dev-prompt-preparation",
        "standard-dev-journal",
        "standard-dev-doc-sync",
        "standard-dev-architecture-audit",
        "standard-dev-test-data-control",
        "standard-dev-cleanup-control",
        "standard-dev-data-impact",
        "standard-dev-demo-readiness",
        "standard-dev-manual-smoke",
        "standard-dev-test-data-ownership",
        # Interface standards (5)
        "standard-ui-modal",
        "standard-ui-color-zones",
        "standard-ui-three-level-model",
        "standard-ui-card-structure",
        "standard-ui-navigation-shell",
        # Data standards (2)
        "standard-data-identifiers",
        "standard-data-event-journal",
        # Publication standards (3)
        "standard-pub-release-package",
        "standard-pub-release-scope",
        "standard-pub-governance-discipline",
    }
)

LEGACY_STANDARDS_COMPONENT_KEYS: frozenset[str] = frozenset(
    {
        "standard-object",
        "standard-field",
        "standard-api",
        "standard-journal",
        "standard-publication",
        "standard-modules",
    }
)

LEGACY_STANDARDS_LINK_RENAMES: dict[str, str] = {
    "standard-object": "constitution-norm-system-entity-standard",
    "standard-field": "constitution-norm-display-not-id",
    "standard-journal": "standard-data-event-journal",
    "standard-publication": "standard-pub-governance-discipline",
    "standard-api": "decision-entity-sot",
    "standard-modules": "standard-pub-release-scope",
}

COMPONENTS_REGISTRY_ELEMENT_STATUS: dict[str, str] = {
    "platform-page": ELEMENT_STATUS_ACTIVE,
    "platform-modal": ELEMENT_STATUS_ACTIVE,
    "platform-table": ELEMENT_STATUS_ACTIVE,
    "platform-form": ELEMENT_STATUS_ACTIVE,
    "platform-tree": ELEMENT_STATUS_ACTIVE,
    "platform-card": ELEMENT_STATUS_ACTIVE,
    "platform-tabs": ELEMENT_STATUS_ACTIVE,
    "platform-drawer": ELEMENT_STATUS_ACTIVE,
    "platform-toolbar": ELEMENT_STATUS_ACTIVE,
    "platform-notification": ELEMENT_STATUS_ACTIVE,
    "platform-sidebar": ELEMENT_STATUS_ACTIVE,
    "platform-breadcrumbs": ELEMENT_STATUS_ACTIVE,
    "user-picker": ELEMENT_STATUS_ACTIVE,
    "platform-context-menu": ELEMENT_STATUS_PARTIAL,
    "object-picker": ELEMENT_STATUS_PARTIAL,
    "file-picker": ELEMENT_STATUS_PARTIAL,
    "platform-kanban": ELEMENT_STATUS_PLANNED,
    "platform-calendar": ELEMENT_STATUS_PLANNED,
}


def resolve_registry_key(registry_key: str) -> str:
    """Map legacy registry keys to current tabs (runtime → configuration)."""
    normalized = str(registry_key or "").strip()
    return REGISTRY_LEGACY_ALIASES.get(normalized, normalized)


def is_compositional_registry_key(registry_key: str) -> bool:
    normalized = resolve_registry_key(registry_key)
    return normalized in COMPOSITIONAL_REGISTRY_ORDER
