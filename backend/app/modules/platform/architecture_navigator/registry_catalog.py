"""Supplement seed for architecture registries (WI-ARCH-REG-002).

Extends legacy ``catalog.py`` with registry-specific elements and metadata.
"""

from __future__ import annotations

from typing import Any, TypedDict

from app.modules.platform.architecture_navigator.constants import (
    ArchitectureComponentType,
    ArchitectureSourceKind,
)
from app.modules.platform.architecture_navigator.registry_constants import (
    COMPONENTS_REGISTRY_ELEMENT_STATUS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENTS,
    REGISTRY_CONFIGURATION,
    REGISTRY_CORE,
    REGISTRY_DATA,
    REGISTRY_MODULES,
    REGISTRY_PUBLICATION,
    REGISTRY_RULES,
    REGISTRY_SERVICES,
    REGISTRY_STANDARDS,
    ELEMENT_STATUS_DEPRECATED,
)


class RegistrySupplementRow(TypedDict, total=False):
    component_key: str
    technical_name: str
    component_type: str
    registry_key: str
    category_key: str
    title: str
    description: str
    purpose: str
    parent_key: str | None
    sort_order: int
    element_status: str
    architecture_zone: str
    catalog_sources: list[str]
    implementation_json: dict[str, Any]
    documents_json: dict[str, Any]
    metadata_json: dict[str, Any]


def _row(**kwargs: Any) -> RegistrySupplementRow:
    base: RegistrySupplementRow = {
        "parent_key": None,
        "sort_order": 50,
        "element_status": "active",
        "architecture_zone": "platform",
        "catalog_sources": [ArchitectureSourceKind.CATALOG_SEED.value],
        "implementation_json": {},
        "documents_json": {},
        "metadata_json": {},
    }
    base.update(kwargs)
    return base


REGISTRY_SUPPLEMENT_COMPONENTS: list[RegistrySupplementRow] = [
    # --- Ядро (WI-ARCH-CORE-004) ---
    _row(
        component_key="company-model",
        technical_name="Company Model",
        component_type=ArchitectureComponentType.CORE_COMPONENT.value,
        registry_key=REGISTRY_CORE,
        category_key="core",
        title="Компания",
        description=(
            "Базовый контейнер платформы, внутри которого существуют пользователи, "
            "объекты, данные, настройки и рабочее пространство организации."
        ),
        purpose="Граница tenant и изолированная организация",
        sort_order=10,
        architecture_zone="core",
        documents_json={
            "primary": "docs/architecture/YASNOPRO_CORE_ARCHITECTURE.md",
            "adr": "docs/architecture/adr/ADR-SEC-001-security-and-isolation-model.md",
        },
    ),
    _row(
        component_key="object-types-engine",
        technical_name="Object Types Engine",
        component_type=ArchitectureComponentType.CORE_COMPONENT.value,
        registry_key=REGISTRY_CORE,
        category_key="core",
        title="Объект",
        description=(
            "Универсальный инструмент конструктора, предназначенный для описания любой "
            "сущности компании: клиента, проекта, договора, сотрудника, задачи, документа "
            "и других элементов деятельности."
        ),
        purpose="Основной инструмент конструктора: объект как вид сущности",
        sort_order=20,
        architecture_zone="core",
        documents_json={
            "primary": "docs/architecture/YASNOPRO_CORE_ARCHITECTURE.md",
            "terminology": "WI-ARCH-TERM-001",
        },
    ),
    _row(
        component_key="fields-engine",
        technical_name="Fields Engine",
        component_type=ArchitectureComponentType.CORE_COMPONENT.value,
        registry_key=REGISTRY_CORE,
        category_key="core",
        title="Поля",
        description=(
            "Атрибуты объекта, определяющие какие данные могут храниться в экземплярах объекта."
        ),
        purpose="Единая модель полей объектов",
        sort_order=30,
        architecture_zone="core",
    ),
    _row(
        component_key="view-engine",
        technical_name="View Engine",
        component_type=ArchitectureComponentType.CORE_COMPONENT.value,
        registry_key=REGISTRY_CORE,
        category_key="core",
        title="Представления",
        description=(
            "Способы отображения объектов и их данных для пользователя: таблицы, карточки, "
            "планы, календари и другие формы визуализации."
        ),
        purpose="Отображение данных объектов",
        sort_order=50,
        architecture_zone="core",
    ),
    _row(
        component_key="navigation-engine",
        technical_name="Navigation Engine",
        component_type=ArchitectureComponentType.CORE_COMPONENT.value,
        registry_key=REGISTRY_CORE,
        category_key="core",
        title="Навигация",
        description=(
            "Механизм организации перемещения пользователя по платформе и доступа к её "
            "разделам, объектам и функциям."
        ),
        purpose="Структура переходов tenant",
        sort_order=70,
        architecture_zone="core",
    ),
    _row(
        component_key="permission-engine",
        technical_name="Permission Engine",
        component_type=ArchitectureComponentType.CORE_COMPONENT.value,
        registry_key=REGISTRY_CORE,
        category_key="core",
        title="Доступ",
        description=(
            "Механизм управления правами пользователей, определяющий кто, что и в каком "
            "объёме может видеть, изменять или выполнять."
        ),
        purpose="Авторизация tenant и platform",
        sort_order=80,
        architecture_zone="core",
        documents_json={
            "primary": "docs/architecture/adr/ADR-SEC-001-security-and-isolation-model.md",
        },
    ),
    _row(
        component_key="portal-composition-engine",
        technical_name="Portal Composition Engine",
        component_type=ArchitectureComponentType.CORE_COMPONENT.value,
        registry_key=REGISTRY_CORE,
        category_key="core",
        title="Композиция портала",
        description=(
            "Механизм построения пользовательского пространства компании из страниц, "
            "секций, блоков, объектов, модулей и элементов интерфейса."
        ),
        purpose="Сборка рабочих экранов tenant",
        sort_order=90,
        architecture_zone="core",
        documents_json={
            "primary": "docs/architecture/YASNOPRO_CORE_ARCHITECTURE.md",
        },
    ),
    # --- Стандарты (WI-ARCH-REG-STD-002: canonical rows in standards_registry_catalog.py) ---
    # --- Данные (WI-ARCH-REG-DATA-002: canonical rows in catalog.py) ---
    # --- Публикация ---
    _row(
        component_key="release-package",
        technical_name="Release Package",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_PUBLICATION,
        category_key="services",
        title="Release Package",
        description="Артефакт релиза с manifest и BOM.",
        purpose="Упаковка изменений",
        sort_order=10,
        architecture_zone="publication",
    ),
    _row(
        component_key="release-scope",
        technical_name="Release Scope",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_PUBLICATION,
        category_key="services",
        title="Release Scope",
        description="Manifest included/excluded changes, scope proof.",
        purpose="Контроль состава релиза",
        sort_order=20,
        architecture_zone="publication",
    ),
    _row(
        component_key="release-candidate",
        technical_name="Release Candidate",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_PUBLICATION,
        category_key="services",
        title="Release Candidate",
        description="Кандидат на публикацию после review.",
        purpose="Gate перед materialize",
        sort_order=30,
        architecture_zone="publication",
    ),
    _row(
        component_key="materialize",
        technical_name="Materialize",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_PUBLICATION,
        category_key="services",
        title="Materialize",
        description="Фаза Deployment Execution: копирование артефактов DEV → TEMPLATE runtime.",
        purpose="Операция materialize",
        parent_key="deployment-execution",
        sort_order=40,
        architecture_zone="legacy_publication",
        element_status=ELEMENT_STATUS_DEPRECATED,
        metadata_json={"deployment_phase": "materialize", "operational": True},
    ),
    _row(
        component_key="verify",
        technical_name="Verify",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_PUBLICATION,
        category_key="services",
        title="Verify",
        description="Фаза Deployment Execution: post-materialize verification checks.",
        purpose="Операция verify",
        parent_key="deployment-execution",
        sort_order=50,
        architecture_zone="legacy_publication",
        element_status=ELEMENT_STATUS_DEPRECATED,
        metadata_json={"deployment_phase": "verify", "operational": True},
    ),
    _row(
        component_key="activate",
        technical_name="Activate",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_PUBLICATION,
        category_key="services",
        title="Activate",
        description="Фаза Deployment Execution: активация релиза на target environment.",
        purpose="Операция activate",
        parent_key="deployment-execution",
        sort_order=60,
        architecture_zone="legacy_publication",
        element_status=ELEMENT_STATUS_DEPRECATED,
        metadata_json={"deployment_phase": "activate", "operational": True},
    ),
    _row(
        component_key="rollback",
        technical_name="Rollback",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_PUBLICATION,
        category_key="services",
        title="Rollback",
        description="Фаза Deployment Execution: откат к предыдущей версии.",
        purpose="Операция rollback",
        parent_key="deployment-execution",
        sort_order=70,
        architecture_zone="legacy_publication",
        element_status=ELEMENT_STATUS_DEPRECATED,
        metadata_json={"deployment_phase": "rollback", "operational": True},
    ),
    _row(
        component_key="version-pin",
        technical_name="Version Pin",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_PUBLICATION,
        category_key="services",
        title="Version Pin",
        description="Pin активной версии на environment.",
        purpose="Фиксация версии",
        sort_order=80,
        architecture_zone="publication",
    ),
    _row(
        component_key="dirty-dev-check",
        technical_name="Dirty DEV Check",
        component_type=ArchitectureComponentType.SERVICE.value,
        registry_key=REGISTRY_ARCHIVED,
        category_key="services",
        title="Dirty DEV Check",
        description="Gate публикации: сравнение git worktree с release scope.",
        purpose="Барьер незакрытых изменений перед publish",
        parent_key="publication-service",
        sort_order=90,
        architecture_zone="legacy_publication",
        element_status=ELEMENT_STATUS_DEPRECATED,
        metadata_json={"publication_gate": True},
    ),
    # --- Правила и запреты (дополнения) ---
    _row(
        component_key="rule-dev-only-development",
        technical_name="DEV-only Development",
        component_type=ArchitectureComponentType.ARCHITECTURE_RESTRICTION.value,
        registry_key=REGISTRY_RULES,
        category_key="restrictions",
        title="DEV-only development",
        description="Разработка платформы только в DEV Studio.",
        purpose="Изоляция сред",
        sort_order=5,
    ),
    _row(
        component_key="rule-no-direct-template",
        technical_name="No Direct TEMPLATE Modifications",
        component_type=ArchitectureComponentType.ARCHITECTURE_RESTRICTION.value,
        registry_key=REGISTRY_RULES,
        category_key="restrictions",
        title="No direct TEMPLATE modifications",
        description="TEMPLATE меняется только через publish pipeline.",
        purpose="Целостность шаблона",
        sort_order=10,
    ),
    _row(
        component_key="rule-no-direct-client",
        technical_name="No Direct CLIENT Modifications",
        component_type=ArchitectureComponentType.ARCHITECTURE_RESTRICTION.value,
        registry_key=REGISTRY_RULES,
        category_key="restrictions",
        title="No direct CLIENT modifications",
        description="CLIENT обновляется через release activation.",
        purpose="Контроль клиентских сред",
        sort_order=15,
    ),
    _row(
        component_key="rule-no-tenant-bypass",
        technical_name="No Tenant Bypass",
        component_type=ArchitectureComponentType.ARCHITECTURE_RESTRICTION.value,
        registry_key=REGISTRY_RULES,
        category_key="restrictions",
        title="No tenant bypass",
        description="Platform API не обходит tenant routing и permissions.",
        purpose="Безопасность multi-tenant",
        sort_order=25,
    ),
]

# Enrichments for legacy catalog keys (registry_key, zone, implementation hints).
REGISTRY_FIELD_OVERRIDES: dict[str, dict[str, Any]] = {
    "object-types-engine": {
        "registry_key": REGISTRY_CORE,
        "architecture_zone": "core",
        "title": "Объект",
        "description": (
            "Универсальный инструмент конструктора, предназначенный для описания любой "
            "сущности компании: клиента, проекта, договора, сотрудника, задачи, документа "
            "и других элементов деятельности."
        ),
    },
    "relation-engine": {
        "registry_key": REGISTRY_CORE,
        "architecture_zone": "core",
        "title": "Связи",
        "description": (
            "Механизм установления отношений между объектами и их экземплярами, "
            "позволяющий формировать единую модель данных компании."
        ),
    },
    "action-engine": {
        "registry_key": REGISTRY_CORE,
        "architecture_zone": "core",
        "title": "Действия",
        "description": (
            "Операции, которые могут выполняться над объектами, экземплярами объектов "
            "и другими элементами платформы."
        ),
    },
    "process-engine": {
        "registry_key": REGISTRY_CORE,
        "architecture_zone": "core",
        "category_key": "core",
        "title": "Движок процессов",
        "description": "Исполнение бизнес-процессов поверх объектов и действий.",
    },
    "structure-metadata-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "business-records-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "relation-instances-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "users-access-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "tenant-configuration-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "user-settings-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "module-domain-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "platform-catalog-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "release-operations-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "journals-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
            "related": "docs/architecture/adr/ADR-AUD-001-audit-and-event-journal-model.md",
        },
    },
    "file-metadata-data": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
        },
    },
    "object-schema-data": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_data",
        "category_key": "data",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "platform-audit-journal-data": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_data",
        "category_key": "data",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "event-journal-core": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_data",
        "category_key": "data",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "runtime-entities-data": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_data",
        "category_key": "data",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "designer-metadata-data": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_data",
        "category_key": "data",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "configuration-data": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_data",
        "category_key": "data",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "settings-data": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_data",
        "category_key": "data",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "module-crm": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_modules",
        "category_key": "modules",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "module-projects": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_modules",
        "category_key": "modules",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "module-org-structure": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_modules",
        "category_key": "modules",
        "element_status": ELEMENT_STATUS_DEPRECATED,
    },
    "chats-module": {
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_MODULES.md",
        },
    },
    "calendar-module": {
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_MODULES.md",
        },
    },
    "document-libraries-module": {
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_MODULES.md",
        },
    },
    "notifications-module": {
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_MODULES.md",
        },
    },
    "module-bpmn": {
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_MODULES.md",
        },
    },
    "module-yasii": {
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_MODULES.md",
        },
    },
    "ai-context-engine": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "category_key": "services",
        "title": "Служба контекста ИИ",
        "technical_name": "AI Context Service",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "platform-identity": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "session-bridge": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "company-provisioning": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "publication-service": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "deployment-execution": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "file-service": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "search-service": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "notification-dispatch": {
        "registry_key": REGISTRY_SERVICES,
        "architecture_zone": "services",
        "documents_json": {
            "primary": "docs/architecture/YASNOPRO_PLATFORM_SERVICES.md",
        },
    },
    "publication-pipeline": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_services",
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "metadata_json": {"renamed_to": "publication-service"},
    },
    "materialize": {
        "registry_key": REGISTRY_ARCHIVED,
        "parent_key": "deployment-execution",
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_publication",
    },
    "verify": {
        "registry_key": REGISTRY_ARCHIVED,
        "parent_key": "deployment-execution",
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_publication",
    },
    "activate": {
        "registry_key": REGISTRY_ARCHIVED,
        "parent_key": "deployment-execution",
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_publication",
    },
    "rollback": {
        "registry_key": REGISTRY_ARCHIVED,
        "parent_key": "deployment-execution",
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_publication",
    },
    "dirty-dev-check": {
        "registry_key": REGISTRY_ARCHIVED,
        "parent_key": "publication-service",
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_publication",
        "category_key": "services",
        "component_type": ArchitectureComponentType.SERVICE.value,
    },
    "published-catalog": {
        "registry_key": REGISTRY_ARCHIVED,
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_configuration",
        "category_key": "configuration",
        "parent_key": "config-group-published-catalog",
    },
    "event-journal-core": {
        "registry_key": REGISTRY_DATA,
        "architecture_zone": "data",
        "category_key": "data",
    },
    "platform-table": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-table"],
    },
    "platform-page": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-page"],
    },
    "platform-modal": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-modal"],
    },
    "platform-tree": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-tree"],
    },
    "platform-form": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-form"],
    },
    "platform-card": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-card"],
    },
    "platform-tabs": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-tabs"],
    },
    "platform-drawer": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-drawer"],
    },
    "platform-toolbar": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-toolbar"],
    },
    "platform-notification": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-notification"],
    },
    "platform-sidebar": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-sidebar"],
    },
    "platform-breadcrumbs": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-breadcrumbs"],
    },
    "platform-context-menu": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-context-menu"],
    },
    "user-picker": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["user-picker"],
    },
    "object-picker": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["object-picker"],
    },
    "file-picker": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["file-picker"],
    },
    "platform-kanban": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-kanban"],
    },
    "platform-calendar": {
        "registry_key": REGISTRY_COMPONENTS,
        "architecture_zone": "components",
        "element_status": COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-calendar"],
    },
    "control-plane": {
        "registry_key": REGISTRY_ARCHIVED,
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_runtime",
    },
    "dev-environment": {
        "registry_key": REGISTRY_ARCHIVED,
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "title": "DEV",
        "architecture_zone": "legacy_runtime",
    },
    "template-environment": {
        "registry_key": REGISTRY_ARCHIVED,
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "title": "TEMPLATE",
        "architecture_zone": "legacy_runtime",
    },
    "client-environment": {
        "registry_key": REGISTRY_ARCHIVED,
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "title": "CLIENT",
        "architecture_zone": "legacy_runtime",
    },
    "studio": {
        "registry_key": REGISTRY_ARCHIVED,
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_subsystems",
    },
    "office": {
        "registry_key": REGISTRY_ARCHIVED,
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_subsystems",
    },
    "tenant-administration": {
        "registry_key": REGISTRY_ARCHIVED,
        "element_status": ELEMENT_STATUS_DEPRECATED,
        "architecture_zone": "legacy_subsystems",
    },
    "release-governance": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_publication",
    },
    "restriction-no-tenant-data-in-control-plane": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_governance",
    },
    "restriction-no-display-as-id": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_governance",
    },
    "restriction-runtime-no-designer-draft": {
        "registry_key": REGISTRY_ARCHIVED,
        "architecture_zone": "legacy_governance",
    },
}
