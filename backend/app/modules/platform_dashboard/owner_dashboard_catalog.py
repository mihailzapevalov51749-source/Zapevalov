"""Owner Dashboard catalog v1.0 + Addendum v1.0.1 — declarative owner-facing structure.

Not a DB model. Consumed by owner_read_adapter.py only.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Final


OWNER_DASHBOARD_CATALOG_VERSION = "1.0.1"

OWNER_SECTION_KEYS: Final[tuple[str, ...]] = (
    "platform",
    "development",
    "companies",
    "history",
)

DEVELOPMENT_SECTION_TITLE = "Развитие продукта"

# Addendum §5 — Communication Engine Alias Rule
COMMUNICATION_ENGINE_KEY = "communication-engine"
COMMUNICATION_GOVERNANCE_ALIAS = "notifications"

# Addendum §2 — Component Ownership Matrix
PRIMARY_COMPONENT_OWNER: Final[dict[str, str]] = {
    "object-platform": "platform-core",
    "object-type": "object-engine",
    "publish": "object-engine",
    "runtime-entity": "object-engine",
    "object-card": "views-engine",
    "relations": "relations-engine",
    "search": "search-engine",
    "permissions": "permission-engine",
    "ai-context": "ai-engine",
}

PLATFORM_ENGINE_KEYS: Final[tuple[str, ...]] = (
    "platform-core",
    "object-engine",
    "relations-engine",
    "views-engine",
    "permission-engine",
    "search-engine",
    "file-storage",
    COMMUNICATION_ENGINE_KEY,
    "integrations",
    "process-engine",
    "ai-engine",
)

DEVELOPMENT_STAGE_KEYS: Final[tuple[str, ...]] = (
    "dev-architecture",
    "dev-platform-transition",
    "dev-runtime",
    "dev-designer",
    "dev-dashboard",
    "dev-yasii",
    "dev-relation-field-type",
    "dev-processes",
    "dev-status-sync",
)

DEV_PLATFORM_TRANSITION_IMPLEMENTATION_SLUGS: Final[tuple[str, ...]] = (
    "object-platform-independence",
    "legacy-isolation",
    "legacy-removal",
)

COMPANY_STAGE_KEYS: Final[tuple[str, ...]] = (
    "company-onboarding",
    "company-digital-model",
    "company-processes",
    "company-rollout",
)

HISTORY_GROUP_KEYS: Final[tuple[str, ...]] = (
    "hist-dashboard",
    "hist-readiness",
    "hist-delivery",
    "hist-architecture",
    "hist-quality",
)

FORBIDDEN_OWNER_LABEL_PATTERNS: Final[tuple[str, ...]] = (
    r"(?i)phase\s*\d",
    r"(?i)track\s*[a-z]",
    r"(?i)p\d+-w\d+",
    r"(?i)\bACE\b",
)

MVP_PLATFORM_STAGE_KEYS: Final[frozenset[str]] = frozenset(PLATFORM_ENGINE_KEYS) - frozenset(
    {"integrations", "process-engine"}
)
MVP_DEVELOPMENT_STAGE_KEYS: Final[frozenset[str]] = frozenset(DEVELOPMENT_STAGE_KEYS)
POST_MVP_DEVELOPMENT_STAGE_KEYS: Final[frozenset[str]] = frozenset()
FUTURE_PLATFORM_STAGE_KEYS: Final[frozenset[str]] = frozenset({"integrations", "process-engine"})


class OwnerSourceKind(str, Enum):
    PLATFORM_COMPONENT = "platform_component"
    IMPLEMENTATION_STAGE = "implementation_stage"
    IMPLEMENTATION_STAGES = "implementation_stages"
    YASII_MILESTONE = "yasii_milestone"
    ARCHITECTURE_DEBT = "architecture_debt"
    DOC_MILESTONE = "doc_milestone"
    COMPANY_FACET = "company_facet"
    COMPANY_WORKSPACE = "company_workspace"
    ACTIVITY_TYPE = "activity_type"
    GOVERNANCE_FIELD = "governance_field"
    STATIC = "static"


class StepDataKind(str, Enum):
    REAL_DATA = "real_data"
    DOC_DATA = "doc_data"
    STATIC_DATA = "static_data"
    FUTURE_SCAN = "future_scan"
    PLACEHOLDER = "placeholder"
    YASII_MILESTONE = "yasii_milestone"


class ReadinessRule(str, Enum):
    MIN_PRIMARY_COMPONENTS = "min_primary_components"
    MIN_PRIMARY_COMPONENT = "min_primary_component"
    YASII_TRACK_RELEASE = "yasii_track_release"
    YASII_MILESTONE_PASS_RATE = "yasii_milestone_pass_rate"
    COMPANY_FACET_RATE = "company_facet_rate"
    WEIGHTED_REAL_DOC_ONLY = "weighted_real_doc_only"
    NONE = "none"


@dataclass(frozen=True)
class OwnerSourceRef:
    kind: OwnerSourceKind
    key: str
    weight: int = 1


@dataclass(frozen=True)
class OwnerStepDefinition:
    key: str
    title: str
    data_kind: StepDataKind
    source_ref: OwnerSourceRef
    description: str = ""


@dataclass(frozen=True)
class OwnerStageDefinition:
    key: str
    section_key: str
    title: str
    description: str
    order_index: int
    steps: tuple[OwnerStepDefinition, ...]
    readiness_rule: ReadinessRule
    owner_visible: bool = True
    mvp: bool = True
    meta: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class OwnerHistoryEventDefinition:
    key: str
    group_key: str
    title: str
    activity_type: str
    mvp: bool = True


@dataclass(frozen=True)
class OwnerSectionDefinition:
    key: str
    title: str
    order_index: int
    kind: str
    stages: tuple[OwnerStageDefinition, ...] = ()
    history_groups: tuple[str, ...] = ()
    history_events: tuple[OwnerHistoryEventDefinition, ...] = ()


def _step(
    key: str,
    title: str,
    *,
    data_kind: StepDataKind,
    kind: OwnerSourceKind,
    source_key: str,
    weight: int = 1,
    description: str = "",
) -> OwnerStepDefinition:
    return OwnerStepDefinition(
        key=key,
        title=title,
        data_kind=data_kind,
        source_ref=OwnerSourceRef(kind=kind, key=source_key, weight=weight),
        description=description,
    )


def _platform_stages() -> tuple[OwnerStageDefinition, ...]:
    return (
        OwnerStageDefinition(
            key="platform-core",
            section_key="platform",
            title="Платформенное ядро",
            description="Граница Designer и Runtime, объектная платформа как основа продукта.",
            order_index=1,
            readiness_rule=ReadinessRule.MIN_PRIMARY_COMPONENT,
            steps=(
                _step(
                    "pc-object-platform",
                    "Объектная платформа",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="object-platform",
                ),
            ),
            meta={"primary_components": ("object-platform",)},
        ),
        OwnerStageDefinition(
            key="object-engine",
            section_key="platform",
            title="Объектный движок",
            description="Типы объектов, публикация и записи в рабочей среде.",
            order_index=2,
            readiness_rule=ReadinessRule.MIN_PRIMARY_COMPONENTS,
            steps=(
                _step(
                    "oe-object-type",
                    "Типы объектов",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="object-type",
                ),
                _step(
                    "oe-publish",
                    "Публикация",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="publish",
                ),
                _step(
                    "oe-runtime-entity",
                    "Записи объектов",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="runtime-entity",
                ),
            ),
            meta={"primary_components": ("object-type", "publish", "runtime-entity")},
        ),
        OwnerStageDefinition(
            key="relations-engine",
            section_key="platform",
            title="Движок связей",
            description="Связи между объектами в Studio и runtime.",
            order_index=3,
            readiness_rule=ReadinessRule.MIN_PRIMARY_COMPONENT,
            steps=(
                _step(
                    "re-relations",
                    "Связи объектов",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="relations",
                ),
            ),
            meta={"primary_components": ("relations",)},
        ),
        OwnerStageDefinition(
            key="views-engine",
            section_key="platform",
            title="Движок представлений",
            description="Таблицы, фильтры и карточки объектов.",
            order_index=4,
            readiness_rule=ReadinessRule.MIN_PRIMARY_COMPONENT,
            steps=(
                _step(
                    "ve-object-card",
                    "Карточки объектов",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="object-card",
                ),
                _step(
                    "ve-office-user-table-views",
                    "Пользовательские табличные представления Office",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="runtime-entity",
                ),
            ),
            meta={"primary_components": ("object-card", "runtime-entity")},
        ),
        OwnerStageDefinition(
            key="permission-engine",
            section_key="platform",
            title="Движок прав доступа",
            description="Права на объекты, поля и действия.",
            order_index=5,
            readiness_rule=ReadinessRule.MIN_PRIMARY_COMPONENT,
            steps=(
                _step(
                    "pe-permissions",
                    "Права доступа",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="permissions",
                ),
            ),
            meta={"primary_components": ("permissions",)},
        ),
        OwnerStageDefinition(
            key="search-engine",
            section_key="platform",
            title="Движок поиска",
            description="Поиск по объектам и записям платформы.",
            order_index=6,
            readiness_rule=ReadinessRule.MIN_PRIMARY_COMPONENT,
            steps=(
                _step(
                    "se-search",
                    "Поиск",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="search",
                ),
            ),
            meta={"primary_components": ("search",)},
        ),
        OwnerStageDefinition(
            key="file-storage",
            section_key="platform",
            title="Файловый движок",
            description="Файловое хранилище и вложения объектов.",
            order_index=7,
            readiness_rule=ReadinessRule.NONE,
            mvp=True,
            steps=(
                _step(
                    "fs-attachments",
                    "Вложения в карточке объекта",
                    data_kind=StepDataKind.FUTURE_SCAN,
                    kind=OwnerSourceKind.STATIC,
                    source_key="files-object-attachments",
                ),
                _step(
                    "fs-library",
                    "Библиотеки документов",
                    data_kind=StepDataKind.FUTURE_SCAN,
                    kind=OwnerSourceKind.STATIC,
                    source_key="files-library",
                ),
                _step(
                    "fs-onlyoffice",
                    "Совместное редактирование",
                    data_kind=StepDataKind.FUTURE_SCAN,
                    kind=OwnerSourceKind.STATIC,
                    source_key="files-onlyoffice",
                ),
            ),
        ),
        OwnerStageDefinition(
            key=COMMUNICATION_ENGINE_KEY,
            section_key="platform",
            title="Коммуникационный движок",
            description="Комментарии, уведомления и взаимодействие пользователей.",
            order_index=8,
            readiness_rule=ReadinessRule.NONE,
            steps=(
                _step(
                    "comm-comments",
                    "Комментарии к объектам (runtime)",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="comm-comments-runtime",
                ),
                _step(
                    "comm-notifications",
                    "Уведомления ведут на объектную карточку",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.ARCHITECTURE_DEBT,
                    source_key="notifications-runtime-completion",
                ),
                _step(
                    "comm-legacy",
                    "Отключение legacy-маршрутов уведомлений",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="comm-legacy-cleanup",
                ),
                _step(
                    "comm-chats",
                    "Чаты платформы",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="comm-chats",
                ),
            ),
            meta={
                "governance_slug": COMMUNICATION_GOVERNANCE_ALIAS,
                "governance_alias_of": COMMUNICATION_GOVERNANCE_ALIAS,
            },
        ),
        OwnerStageDefinition(
            key="integrations",
            section_key="platform",
            title="Интеграционный движок",
            description="Внешние интеграции и публичные API.",
            order_index=9,
            readiness_rule=ReadinessRule.NONE,
            mvp=False,
            steps=(
                _step(
                    "int-api",
                    "Публичные API платформы",
                    data_kind=StepDataKind.PLACEHOLDER,
                    kind=OwnerSourceKind.STATIC,
                    source_key="int-api-public",
                ),
                _step(
                    "int-external",
                    "Внешние интеграции",
                    data_kind=StepDataKind.PLACEHOLDER,
                    kind=OwnerSourceKind.STATIC,
                    source_key="int-external",
                ),
            ),
        ),
        OwnerStageDefinition(
            key="process-engine",
            section_key="platform",
            title="Процессный движок (BPMN)",
            description="Моделирование и исполнение бизнес-процессов.",
            order_index=10,
            readiness_rule=ReadinessRule.NONE,
            mvp=False,
            steps=(
                _step(
                    "proc-model",
                    "Модель процессного движка",
                    data_kind=StepDataKind.DOC_DATA,
                    kind=OwnerSourceKind.DOC_MILESTONE,
                    source_key="YASNOPRO_PROCESS_ENGINE_MODEL",
                ),
                _step(
                    "proc-designer",
                    "Проектирование процессов",
                    data_kind=StepDataKind.PLACEHOLDER,
                    kind=OwnerSourceKind.STATIC,
                    source_key="proc-designer",
                ),
                _step(
                    "proc-runtime",
                    "Исполнение процессов в портале",
                    data_kind=StepDataKind.PLACEHOLDER,
                    kind=OwnerSourceKind.STATIC,
                    source_key="proc-runtime",
                ),
            ),
        ),
        OwnerStageDefinition(
            key="ai-engine",
            section_key="platform",
            title="ИИ-движок (ЯСИИ)",
            description="Что умеет ИИ внутри платформы (capability).",
            order_index=11,
            readiness_rule=ReadinessRule.MIN_PRIMARY_COMPONENT,
            steps=(
                _step(
                    "ai-cap-context",
                    "ИИ получает контекст объектной платформы",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.PLATFORM_COMPONENT,
                    source_key="ai-context",
                ),
                _step(
                    "ai-cap-perimeter",
                    "Безопасный контур ИИ (границы доступа)",
                    data_kind=StepDataKind.DOC_DATA,
                    kind=OwnerSourceKind.DOC_MILESTONE,
                    source_key="ai-perimeter",
                ),
                _step(
                    "ai-cap-surfaces",
                    "ИИ доступен в ключевых экранах продукта",
                    data_kind=StepDataKind.DOC_DATA,
                    kind=OwnerSourceKind.DOC_MILESTONE,
                    source_key="ai-surfaces",
                ),
            ),
            meta={"primary_components": ("ai-context",), "scope": "platform_ai"},
        ),
    )


def _development_stages() -> tuple[OwnerStageDefinition, ...]:
    return (
        OwnerStageDefinition(
            key="dev-architecture",
            section_key="development",
            title="Архитектура и стратегия",
            description="ADR, статус архитектуры и управление долгом.",
            order_index=1,
            readiness_rule=ReadinessRule.NONE,
            steps=(
                _step(
                    "arch-adr",
                    "Принятые архитектурные решения",
                    data_kind=StepDataKind.DOC_DATA,
                    kind=OwnerSourceKind.DOC_MILESTONE,
                    source_key="adr",
                ),
                _step(
                    "arch-status",
                    "Статус архитектуры актуален",
                    data_kind=StepDataKind.DOC_DATA,
                    kind=OwnerSourceKind.DOC_MILESTONE,
                    source_key="YASNOPRO_ARCHITECTURE_STATUS",
                ),
            ),
        ),
        OwnerStageDefinition(
            key="dev-platform-transition",
            section_key="development",
            title="Переход на объектную платформу",
            description="Независимость object platform и вывод legacy-контура.",
            order_index=2,
            readiness_rule=ReadinessRule.NONE,
            steps=(),
            meta={
                "implementation_stage_slugs": DEV_PLATFORM_TRANSITION_IMPLEMENTATION_SLUGS,
                "uses_implementation_stage_works": True,
            },
        ),
        OwnerStageDefinition(
            key="dev-runtime",
            section_key="development",
            title="Рабочая среда портала",
            description="Runtime, права и поиск для сотрудников.",
            order_index=3,
            readiness_rule=ReadinessRule.NONE,
            steps=(),
            meta={"implementation_stage_slugs": ("runtime-foundation",), "uses_implementation_stage_works": True},
        ),
        OwnerStageDefinition(
            key="dev-designer",
            section_key="development",
            title="Studio и публикация",
            description="Конструктор типов объектов и предсказуемая публикация.",
            order_index=4,
            readiness_rule=ReadinessRule.NONE,
            steps=(),
            meta={"implementation_stage_slugs": ("designer-foundation",), "uses_implementation_stage_works": True},
        ),
        OwnerStageDefinition(
            key="dev-dashboard",
            section_key="development",
            title="Панель управления",
            description="Dashboard как продукт управления развитием.",
            order_index=5,
            readiness_rule=ReadinessRule.NONE,
            steps=(
                _step(
                    "dash-sections",
                    "Разделы для владельца продукта",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="dash-owner-sections",
                ),
                _step(
                    "dash-governance",
                    "Единая модель governance",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.GOVERNANCE_FIELD,
                    source_key="governance_api",
                ),
                _step(
                    "dash-freshness",
                    "Актуальность после refresh",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.GOVERNANCE_FIELD,
                    source_key="dashboard_freshness",
                ),
            ),
        ),
        OwnerStageDefinition(
            key="dev-yasii",
            section_key="development",
            title="ЯСИИ",
            description="Программа создания встроенного интеллектуального сотрудника.",
            order_index=6,
            readiness_rule=ReadinessRule.YASII_TRACK_RELEASE,
            steps=(
                _step(
                    "yasii-dev-m1-core",
                    "Основа ЯСИИ: идентичность и runtime",
                    data_kind=StepDataKind.YASII_MILESTONE,
                    kind=OwnerSourceKind.YASII_MILESTONE,
                    source_key="yasii-core-foundation,yasii-knowledge-foundation,yasii-graph-foundation,yasii-runtime-foundation",
                ),
                _step(
                    "yasii-dev-m2-knowledge",
                    "Знания и граф",
                    data_kind=StepDataKind.YASII_MILESTONE,
                    kind=OwnerSourceKind.YASII_MILESTONE,
                    source_key="yasii-knowledge-foundation,yasii-graph-foundation",
                ),
                _step(
                    "yasii-dev-m3-roles",
                    "Ассистенты разработчика и владельца",
                    data_kind=StepDataKind.YASII_MILESTONE,
                    kind=OwnerSourceKind.YASII_MILESTONE,
                    source_key="yasii-developer-mvp,yasii-owner-mvp",
                ),
                _step(
                    "yasii-dev-m4-embedded",
                    "Встраивание в продукт",
                    data_kind=StepDataKind.YASII_MILESTONE,
                    kind=OwnerSourceKind.YASII_MILESTONE,
                    source_key="yasii-embedded-intelligence",
                ),
                _step(
                    "yasii-dev-m5-memory",
                    "Память и стратегия",
                    data_kind=StepDataKind.YASII_MILESTONE,
                    kind=OwnerSourceKind.YASII_MILESTONE,
                    source_key="yasii-memory-foundation,yasii-strategy-layer",
                ),
                _step(
                    "yasii-dev-m6-governance",
                    "Управление зрелостью через Dashboard",
                    data_kind=StepDataKind.YASII_MILESTONE,
                    kind=OwnerSourceKind.YASII_MILESTONE,
                    source_key="yasii-platform-governance,yasii-development-intelligence",
                ),
            ),
            meta={"scope": "development_ai"},
        ),
        OwnerStageDefinition(
            key="dev-relation-field-type",
            section_key="development",
            title='Тип поля "Связи"',
            description=(
                "Программа field_type relation над runtime_relation_instances "
                "(ADR-Object-Relation-Field)."
            ),
            order_index=7,
            readiness_rule=ReadinessRule.NONE,
            steps=(),
            meta={
                "implementation_stage_slugs": ("relation-field-type",),
                "uses_implementation_stage_works": True,
            },
        ),
        OwnerStageDefinition(
            key="dev-processes",
            section_key="development",
            title="Процессы",
            description="BPMN и process engine в программе развития.",
            order_index=8,
            readiness_rule=ReadinessRule.NONE,
            steps=(
                _step(
                    "dev-proc-plan",
                    "Процессный контур в roadmap",
                    data_kind=StepDataKind.PLACEHOLDER,
                    kind=OwnerSourceKind.STATIC,
                    source_key="dev-processes-plan",
                ),
            ),
        ),
        OwnerStageDefinition(
            key="dev-status-sync",
            section_key="development",
            title="Синхронизация статусов",
            description="Документация и статусы этапов после завершения работ (lifecycle sync).",
            order_index=9,
            readiness_rule=ReadinessRule.NONE,
            steps=(
                _step(
                    "dev-doc-lifecycle",
                    "Документы синхронизированы с Dashboard",
                    data_kind=StepDataKind.DOC_DATA,
                    kind=OwnerSourceKind.DOC_MILESTONE,
                    source_key="YASNOPRO_DEVELOPMENT_LIFECYCLE",
                ),
            ),
        ),
    )


def _company_stages() -> tuple[OwnerStageDefinition, ...]:
    from app.modules.platform_dashboard.company_workspaces import OBJECT_MODEL_COMPANY_FACETS

    facet_steps = tuple(
        _step(
            f"facet-{facet.casefold().replace(' ', '-')}",
            f"Настроить: {facet}",
            data_kind=StepDataKind.STATIC_DATA,
            kind=OwnerSourceKind.COMPANY_FACET,
            source_key=facet,
        )
        for facet in OBJECT_MODEL_COMPANY_FACETS
    )
    return (
        OwnerStageDefinition(
            key="company-onboarding",
            section_key="companies",
            title="Подключение",
            description="Активация рабочего пространства и базовые сущности.",
            order_index=1,
            readiness_rule=ReadinessRule.NONE,
            steps=(
                _step(
                    "cw-active",
                    "Рабочее пространство активно",
                    data_kind=StepDataKind.REAL_DATA,
                    kind=OwnerSourceKind.COMPANY_WORKSPACE,
                    source_key="status",
                ),
                _step(
                    "cw-users",
                    "Пользователи подключены",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="users",
                ),
                _step(
                    "cw-licenses",
                    "Лицензии",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="licenses",
                ),
            ),
        ),
        OwnerStageDefinition(
            key="company-digital-model",
            section_key="companies",
            title="Цифровая модель",
            description="Прикладная модель компании через объектную модель.",
            order_index=2,
            readiness_rule=ReadinessRule.COMPANY_FACET_RATE,
            steps=facet_steps,
        ),
        OwnerStageDefinition(
            key="company-processes",
            section_key="companies",
            title="Процессы",
            description="Настройка и использование процессов компании.",
            order_index=3,
            readiness_rule=ReadinessRule.NONE,
            steps=(
                _step(
                    "cw-proc-config",
                    "Процессы настроены",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="processes-configured",
                ),
                _step(
                    "cw-proc-run",
                    "Процессы используются в портале",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="processes-running",
                ),
            ),
        ),
        OwnerStageDefinition(
            key="company-rollout",
            section_key="companies",
            title="Внедрение и эксплуатация",
            description="Порталы, представления и ввод в эксплуатацию.",
            order_index=4,
            readiness_rule=ReadinessRule.NONE,
            steps=(
                _step(
                    "cw-portals",
                    "Порталы развёрнуты",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="portals",
                ),
                _step(
                    "cw-views",
                    "Представления и навигация",
                    data_kind=StepDataKind.STATIC_DATA,
                    kind=OwnerSourceKind.STATIC,
                    source_key="views",
                ),
            ),
        ),
    )


def _history_event_definitions() -> tuple[OwnerHistoryEventDefinition, ...]:
    return (
        OwnerHistoryEventDefinition(
            "evt-dashboard-refresh",
            "hist-dashboard",
            "Обновление Dashboard",
            "dashboard_refresh",
        ),
        OwnerHistoryEventDefinition(
            "evt-readiness-component",
            "hist-readiness",
            "Изменение готовности контура",
            "readiness_component",
        ),
        OwnerHistoryEventDefinition(
            "evt-readiness-stage",
            "hist-readiness",
            "Изменение готовности этапа",
            "readiness_stage",
        ),
        OwnerHistoryEventDefinition(
            "evt-decision",
            "hist-architecture",
            "Архитектурное решение",
            "decision",
        ),
        OwnerHistoryEventDefinition(
            "evt-milestone",
            "hist-delivery",
            "Веха разработки",
            "milestone",
        ),
        OwnerHistoryEventDefinition(
            "evt-quality",
            "hist-quality",
            "Качество",
            "quality",
        ),
        OwnerHistoryEventDefinition(
            "evt-analysis",
            "hist-dashboard",
            "Анализ",
            "analysis",
        ),
    )


MVP_ACTIVITY_TYPES: Final[frozenset[str]] = frozenset(
    event.activity_type for event in _history_event_definitions()
)


def _build_sections() -> tuple[OwnerSectionDefinition, ...]:
    return (
        OwnerSectionDefinition(
            key="platform",
            title="Платформа",
            order_index=1,
            kind="stages",
            stages=_platform_stages(),
        ),
        OwnerSectionDefinition(
            key="development",
            title=DEVELOPMENT_SECTION_TITLE,
            order_index=2,
            kind="stages",
            stages=_development_stages(),
        ),
        OwnerSectionDefinition(
            key="companies",
            title="Компании",
            order_index=3,
            kind="stages",
            stages=_company_stages(),
        ),
        OwnerSectionDefinition(
            key="history",
            title="История",
            order_index=4,
            kind="timeline",
            history_groups=HISTORY_GROUP_KEYS,
            history_events=_history_event_definitions(),
        ),
    )


OWNER_SECTIONS: tuple[OwnerSectionDefinition, ...] = _build_sections()

_STAGE_BY_KEY: dict[str, OwnerStageDefinition] = {
    stage.key: stage for section in OWNER_SECTIONS for stage in section.stages
}

_HISTORY_EVENT_BY_ACTIVITY: dict[str, OwnerHistoryEventDefinition] = {
    event.activity_type: event for section in OWNER_SECTIONS for event in section.history_events
}


def stage_by_key(key: str) -> OwnerStageDefinition | None:
    return _STAGE_BY_KEY.get(key)


def section_by_key(key: str) -> OwnerSectionDefinition | None:
    return next((section for section in OWNER_SECTIONS if section.key == key), None)


def history_event_for_activity(activity_type: str) -> OwnerHistoryEventDefinition | None:
    return _HISTORY_EVENT_BY_ACTIVITY.get(activity_type)


def primary_components_for_engine(engine_key: str) -> tuple[str, ...]:
    slugs: list[str] = []
    for component_slug, owner in PRIMARY_COMPONENT_OWNER.items():
        if owner == engine_key:
            slugs.append(component_slug)
    return tuple(slugs)


def validate_owner_catalog() -> list[str]:
    errors: list[str] = []

    section_keys = [section.key for section in OWNER_SECTIONS]
    if section_keys != list(OWNER_SECTION_KEYS):
        errors.append(f"section keys mismatch: {section_keys}")

    if len(section_keys) != len(set(section_keys)):
        errors.append("duplicate section keys")

    import re

    forbidden_re = re.compile(
        "|".join(p.replace("(?i)", "") for p in FORBIDDEN_OWNER_LABEL_PATTERNS),
        re.IGNORECASE,
    )
    stage_keys: list[str] = []
    for section in OWNER_SECTIONS:
        for stage in section.stages:
            stage_keys.append(stage.key)
            for label in (stage.title, stage.description):
                if forbidden_re.search(label):
                    errors.append(f"forbidden label in stage {stage.key}: {label!r}")

            step_keys = [step.key for step in stage.steps]
            if len(step_keys) != len(set(step_keys)):
                errors.append(f"duplicate step keys in stage {stage.key}")

    if len(stage_keys) != len(set(stage_keys)):
        errors.append("duplicate stage keys across catalog")

    if "tenant-management" in stage_keys:
        errors.append("tenant-management must not appear in owner catalog")

    if COMMUNICATION_ENGINE_KEY not in stage_keys:
        errors.append("communication-engine missing from platform stages")

    if "dev-object-platform" in stage_keys or "dev-legacy-transition" in stage_keys:
        errors.append("deprecated development stages must not be present")

    if "dev-platform-transition" not in stage_keys:
        errors.append("dev-platform-transition missing")

    expected_components = {
        "object-platform",
        "object-type",
        "publish",
        "runtime-entity",
        "object-card",
        "relations",
        "search",
        "permissions",
        "ai-context",
    }
    if set(PRIMARY_COMPONENT_OWNER.keys()) != expected_components:
        errors.append(f"PRIMARY_COMPONENT_OWNER keys mismatch: {set(PRIMARY_COMPONENT_OWNER)}")

    owners = list(PRIMARY_COMPONENT_OWNER.values())
    if len(owners) != len(set(owners)) and False:
        pass
    for component_slug, owner in PRIMARY_COMPONENT_OWNER.items():
        stage = _STAGE_BY_KEY.get(owner)
        if stage is None and owner != COMMUNICATION_ENGINE_KEY:
            errors.append(f"owner engine {owner!r} for {component_slug} not in catalog")

    for section in OWNER_SECTIONS:
        for stage in section.stages:
            for step in stage.steps:
                if step.data_kind == StepDataKind.STATIC_DATA and step.source_ref.kind not in (
                    OwnerSourceKind.STATIC,
                    OwnerSourceKind.COMPANY_FACET,
                ):
                    errors.append(f"static data_kind mismatch for step {step.key}")

    return errors
