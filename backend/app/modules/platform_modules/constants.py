"""Constants and seed catalog for platform modules registry."""

from __future__ import annotations

from typing import Any, TypedDict


class PlatformModuleStatus:
    ACTIVE = "active"
    PLANNED = "planned"
    DISABLED = "disabled"
    DEPRECATED = "deprecated"


class PlatformModuleType:
    RUNTIME = "runtime"
    PLATFORM_SERVICE = "platform_service"
    TENANT_FEATURE = "tenant_feature"
    ADMIN_FEATURE = "admin_feature"


class PlatformModuleSeedItem(TypedDict):
    module_key: str
    title: str
    description: str
    module_type: str
    status: str
    version: str
    entry_system_key: str | None
    entry_route: str | None
    is_runtime: bool
    is_tenant_installable: bool
    is_enabled_by_default: bool
    is_core: bool
    dependencies: list[str]


PLATFORM_MODULE_DEPENDENCIES: dict[str, list[str]] = {
    "runtime.chat": ["notifications"],
    "runtime.calendar": ["runtime.chat", "notifications"],
    "runtime.notifications": [],
    "runtime.documents": ["files"],
    "runtime.bpmn": ["designer"],
    "runtime.yasii": ["platform/runtime"],
}


PLATFORM_MODULE_SEED: list[PlatformModuleSeedItem] = [
    {
        "module_key": "runtime.chat",
        "title": "Чат",
        "description": "Корпоративный чат Office: групповые и личные диалоги, вложения, упоминания.",
        "module_type": PlatformModuleType.RUNTIME,
        "status": PlatformModuleStatus.ACTIVE,
        "version": "1.0.0",
        "entry_system_key": "runtime.chat",
        "entry_route": None,
        "is_runtime": True,
        "is_tenant_installable": True,
        "is_enabled_by_default": True,
        "is_core": True,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.chat"],
    },
    {
        "module_key": "runtime.calendar",
        "title": "Календарь",
        "description": "Корпоративный календарь событий Office с участниками и приглашениями.",
        "module_type": PlatformModuleType.RUNTIME,
        "status": PlatformModuleStatus.ACTIVE,
        "version": "1.0.0",
        "entry_system_key": "runtime.calendar",
        "entry_route": None,
        "is_runtime": True,
        "is_tenant_installable": True,
        "is_enabled_by_default": True,
        "is_core": False,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.calendar"],
    },
    {
        "module_key": "runtime.notifications",
        "title": "Уведомления",
        "description": "Центр уведомлений пользователя: колокол, overlay и маршрутизация целей.",
        "module_type": PlatformModuleType.RUNTIME,
        "status": PlatformModuleStatus.ACTIVE,
        "version": "1.0.0",
        "entry_system_key": "runtime.notifications",
        "entry_route": None,
        "is_runtime": True,
        "is_tenant_installable": True,
        "is_enabled_by_default": True,
        "is_core": True,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.notifications"],
    },
    {
        "module_key": "runtime.documents",
        "title": "Документы",
        "description": "Библиотеки документов tenant: хранение, просмотр и совместная работа с файлами.",
        "module_type": PlatformModuleType.RUNTIME,
        "status": PlatformModuleStatus.ACTIVE,
        "version": "1.0.0",
        "entry_system_key": None,
        "entry_route": None,
        "is_runtime": True,
        "is_tenant_installable": True,
        "is_enabled_by_default": True,
        "is_core": False,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.documents"],
    },
    {
        "module_key": "runtime.bpmn",
        "title": "BPMN",
        "description": "Модуль визуального моделирования бизнес-процессов в Designer Studio.",
        "module_type": PlatformModuleType.TENANT_FEATURE,
        "status": PlatformModuleStatus.PLANNED,
        "version": "0.0.0",
        "entry_system_key": None,
        "entry_route": "/designer/tenant/{tenant_id}/processes",
        "is_runtime": False,
        "is_tenant_installable": True,
        "is_enabled_by_default": False,
        "is_core": False,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.bpmn"],
    },
    {
        "module_key": "runtime.yasii",
        "title": "ЯСИИ",
        "description": "Встроенный AI-сотрудник платформы YASII для пользователей tenant.",
        "module_type": PlatformModuleType.RUNTIME,
        "status": PlatformModuleStatus.ACTIVE,
        "version": "1.0.0",
        "entry_system_key": None,
        "entry_route": "/yasii",
        "is_runtime": True,
        "is_tenant_installable": True,
        "is_enabled_by_default": False,
        "is_core": False,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.yasii"],
    },
]


def resolve_module_dependencies(module_key: str) -> list[str]:
    return list(PLATFORM_MODULE_DEPENDENCIES.get(module_key, []))


def seed_item_without_dependencies(item: PlatformModuleSeedItem) -> dict[str, Any]:
    payload = dict(item)
    payload.pop("dependencies", None)
    return payload
