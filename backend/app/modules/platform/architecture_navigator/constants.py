"""Constants for Architecture Navigator (WI-ARCH-03)."""

from __future__ import annotations

from enum import Enum


class ArchitectureComponentType(str, Enum):
    CONTOUR = "contour"
    SUBSYSTEM = "subsystem"
    CORE_COMPONENT = "core_component"
    PLATFORM_COMPONENT = "platform_component"
    PLATFORM_UI_ELEMENT = "platform_ui_element"
    MODULE = "module"
    SERVICE = "service"
    DATA_TYPE = "data_type"
    ARCHITECTURE_DECISION = "architecture_decision"
    ARCHITECTURE_RESTRICTION = "architecture_restriction"
    DEVIATION = "deviation"
    CONFIGURATION = "configuration"


class ArchitectureLinkType(str, Enum):
    USES = "uses"
    USED_BY = "used_by"
    STORES_DATA = "stores_data"
    PARENT = "parent"


class ArchitectureFindingKind(str, Enum):
    ROUTE = "route"
    TABLE = "table"
    SERVICE = "service"
    DEPENDENCY = "dependency"
    DOCUMENT = "document"
    RULE = "rule"
    BACKEND_FILE = "backend_file"
    FRONTEND_FILE = "frontend_file"


class ArchitectureSourceKind(str, Enum):
    ARCHITECTURE_DOCUMENT = "architecture_document"
    CURSOR_RULE = "cursor_rule"
    DATABASE_SCAN = "database_scan"
    CODE_SCAN = "code_scan"
    API_ROUTE_SCAN = "api_route_scan"
    FRONTEND_ROUTE_SCAN = "frontend_route_scan"
    CATALOG_SEED = "catalog_seed"


SCANNER_VERSION = "1.3.0"

CATEGORY_LABELS: dict[str, str] = {
    "contours": "Контуры",
    "subsystems": "Подсистемы",
    "core": "Ядро платформы",
    "platform_components": "Платформенные компоненты",
    "platform_ui_elements": "Платформенные элементы интерфейса",
    "modules": "Модули",
    "services": "Службы",
    "data": "Данные",
    "decisions": "Архитектурные решения",
    "restrictions": "Архитектурные запреты",
    "deviations": "Отклонения",
}

CATEGORY_ORDER: tuple[str, ...] = (
    "contours",
    "subsystems",
    "core",
    "platform_components",
    "platform_ui_elements",
    "modules",
    "services",
    "data",
    "decisions",
    "restrictions",
    "deviations",
)

COMPONENT_TYPE_LABELS: dict[str, str] = {
    ArchitectureComponentType.CONTOUR.value: "Контур",
    ArchitectureComponentType.SUBSYSTEM.value: "Подсистема",
    ArchitectureComponentType.CORE_COMPONENT.value: "Компонент ядра",
    ArchitectureComponentType.PLATFORM_COMPONENT.value: "Платформенный компонент",
    ArchitectureComponentType.PLATFORM_UI_ELEMENT.value: "Элемент интерфейса",
    ArchitectureComponentType.MODULE.value: "Модуль",
    ArchitectureComponentType.SERVICE.value: "Служба",
    ArchitectureComponentType.DATA_TYPE.value: "Тип данных",
    ArchitectureComponentType.ARCHITECTURE_DECISION.value: "Архитектурное решение",
    ArchitectureComponentType.ARCHITECTURE_RESTRICTION.value: "Архитектурный запрет",
    ArchitectureComponentType.DEVIATION.value: "Отклонение",
    ArchitectureComponentType.CONFIGURATION.value: "Конфигурация",
}
