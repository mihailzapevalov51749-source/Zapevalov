"""Platform governance catalog — target architecture vs Dashboard components (P13-W02)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlatformEngineDefinition:
    slug: str
    title: str
    description: str
    dashboard_component_slugs: tuple[str, ...] = ()
    in_dashboard: bool = True


PLATFORM_LAYER_ENGINES: tuple[PlatformEngineDefinition, ...] = (
    PlatformEngineDefinition(
        slug="platform-core",
        title="Платформенное ядро",
        description="Object platform, runtime, publish, designer boundary.",
        dashboard_component_slugs=("object-platform", "publish", "object-type"),
    ),
    PlatformEngineDefinition(
        slug="object-engine",
        title="Object Engine",
        description="Типы объектов, записи, публикация в runtime.",
        dashboard_component_slugs=("object-platform", "object-type", "runtime-entity", "publish"),
    ),
    PlatformEngineDefinition(
        slug="relations-engine",
        title="Relations Engine",
        description="Связи между объектами в Studio и runtime.",
        dashboard_component_slugs=("relations",),
    ),
    PlatformEngineDefinition(
        slug="process-engine",
        title="Process Engine",
        description="BPMN / process layer, workflow execution.",
        dashboard_component_slugs=(),
        in_dashboard=False,
    ),
    PlatformEngineDefinition(
        slug="views-engine",
        title="Views Engine",
        description="Табличные представления, фильтры, карточки.",
        dashboard_component_slugs=("object-card", "runtime-entity"),
    ),
    PlatformEngineDefinition(
        slug="permission-engine",
        title="Permission Engine",
        description="Права на объекты, поля и действия.",
        dashboard_component_slugs=("permissions",),
    ),
    PlatformEngineDefinition(
        slug="ai-engine",
        title="AI Engine",
        description="YASII / AI Context поверх object platform.",
        dashboard_component_slugs=("ai-context",),
    ),
    PlatformEngineDefinition(
        slug="file-storage",
        title="File Storage",
        description="Файловое хранилище и вложения объектов.",
        dashboard_component_slugs=(),
        in_dashboard=False,
    ),
    PlatformEngineDefinition(
        slug="notifications",
        title="Notifications & Events",
        description="Уведомления и события платформы.",
        dashboard_component_slugs=(),
        in_dashboard=False,
    ),
    PlatformEngineDefinition(
        slug="search-engine",
        title="Search",
        description="Поиск по объектам и записям.",
        dashboard_component_slugs=("search",),
    ),
    PlatformEngineDefinition(
        slug="integrations",
        title="Integrations & API",
        description="Внешние интеграции и публичные API.",
        dashboard_component_slugs=(),
        in_dashboard=False,
    ),
    PlatformEngineDefinition(
        slug="tenant-management",
        title="Tenant Management",
        description=(
            "Техническая граница: tenant_id, изоляция данных, пользователи, права, лицензии, лимиты. "
            "Не прикладная модель компании — она настраивается через Object Engine."
        ),
        dashboard_component_slugs=(),
        in_dashboard=False,
    ),
    PlatformEngineDefinition(
        slug="control-plane",
        title="Control Plane / Управление платформой",
        description=(
            "Коммерческий слой SaaS: клиентские компании, ответственные, лимиты, "
            "связь с основным порталом; подготовка к provisioning и биллингу."
        ),
        dashboard_component_slugs=("control-plane",),
    ),
    PlatformEngineDefinition(
        slug="office",
        title="Office",
        description="Офисный контур (документы, совместная работа).",
        dashboard_component_slugs=(),
        in_dashboard=False,
    ),
)

ARCHITECTURE_MAP_PRESENT_IN_DASHBOARD: tuple[str, ...] = tuple(
    {
        slug
        for engine in PLATFORM_LAYER_ENGINES
        for slug in engine.dashboard_component_slugs
    }
)

ARCHITECTURE_MAP_MISSING_FROM_DASHBOARD: tuple[str, ...] = tuple(
    engine.slug for engine in PLATFORM_LAYER_ENGINES if not engine.in_dashboard
)

DEVELOPMENT_WORKSPACE_SECTIONS: tuple[tuple[str, str], ...] = (
    ("implementation", "Реализация"),
    ("architecture", "Архитектура"),
    ("quality", "Качество"),
    ("history", "История"),
    ("roadmap", "Roadmap"),
    ("yasii_development", "YASII Development"),
)
