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
    "runtime.yasii": ["platform/runtime"],
    "runtime.processes": ["designer"],
    "runtime.org_structure": ["tenant_administration"],
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
        "description": "Платформенная подсистема уведомлений: колокол, overlay и маршрутизация целей.",
        "module_type": PlatformModuleType.PLATFORM_SERVICE,
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
        "description": "Планируемый runtime-модуль документов; сейчас библиотеки реализованы как document_library.",
        "module_type": PlatformModuleType.RUNTIME,
        "status": PlatformModuleStatus.PLANNED,
        "version": "0.0.0",
        "entry_system_key": None,
        "entry_route": None,
        "is_runtime": True,
        "is_tenant_installable": True,
        "is_enabled_by_default": False,
        "is_core": False,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.documents"],
    },
    {
        "module_key": "runtime.yasii",
        "title": "YASII",
        "description": "Планируемый runtime-модуль встроенного AI-сотрудника YASII.",
        "module_type": PlatformModuleType.PLATFORM_SERVICE,
        "status": PlatformModuleStatus.PLANNED,
        "version": "0.0.0",
        "entry_system_key": None,
        "entry_route": "/yasii",
        "is_runtime": False,
        "is_tenant_installable": True,
        "is_enabled_by_default": False,
        "is_core": False,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.yasii"],
    },
    {
        "module_key": "runtime.processes",
        "title": "Бизнес-процессы",
        "description": "Планируемый модуль бизнес-процессов; сейчас доступен в Designer Studio.",
        "module_type": PlatformModuleType.TENANT_FEATURE,
        "status": PlatformModuleStatus.PLANNED,
        "version": "0.0.0",
        "entry_system_key": None,
        "entry_route": "/designer/tenant/{tenant_id}/processes",
        "is_runtime": False,
        "is_tenant_installable": True,
        "is_enabled_by_default": False,
        "is_core": False,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.processes"],
    },
    {
        "module_key": "runtime.org_structure",
        "title": "Оргструктура",
        "description": "Планируемый модуль оргструктуры; сейчас placeholder в tenant admin.",
        "module_type": PlatformModuleType.ADMIN_FEATURE,
        "status": PlatformModuleStatus.PLANNED,
        "version": "0.0.0",
        "entry_system_key": None,
        "entry_route": "/admin/org-structure",
        "is_runtime": False,
        "is_tenant_installable": False,
        "is_enabled_by_default": False,
        "is_core": False,
        "dependencies": PLATFORM_MODULE_DEPENDENCIES["runtime.org_structure"],
    },
]


def resolve_module_dependencies(module_key: str) -> list[str]:
    return list(PLATFORM_MODULE_DEPENDENCIES.get(module_key, []))


def seed_item_without_dependencies(item: PlatformModuleSeedItem) -> dict[str, Any]:
    payload = dict(item)
    payload.pop("dependencies", None)
    return payload
