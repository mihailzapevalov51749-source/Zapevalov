"""Platform Configuration registry seed (WI-ARCH-UI-CONFIG-001).

Source: docs/architecture/YASNOPRO_PLATFORM_CONFIGURATION.md v1.1
"""

from __future__ import annotations

from typing import Any

from app.modules.platform.architecture_navigator.constants import (
    ArchitectureComponentType,
    ArchitectureSourceKind,
)
from app.modules.platform.architecture_navigator.registry_catalog import RegistrySupplementRow, _row
from app.modules.platform.architecture_navigator.registry_constants import REGISTRY_CONFIGURATION

_CONFIG_DOC = {
    "primary": "docs/architecture/YASNOPRO_PLATFORM_CONFIGURATION.md",
    "version": "v1.1",
}

_CONFIG_META: dict[str, Any] = {
    "configuration_group": True,
    "source_document": _CONFIG_DOC["primary"],
}


def _config_row(**kwargs: Any) -> RegistrySupplementRow:
    if "purpose" not in kwargs and kwargs.get("description"):
        kwargs["purpose"] = kwargs["description"]
    base = _row(
        registry_key=REGISTRY_CONFIGURATION,
        category_key="configuration",
        component_type=ArchitectureComponentType.CONFIGURATION.value,
        architecture_zone="configuration",
        documents_json={
            "primary": _CONFIG_DOC["primary"],
            "classification": "docs/architecture/YASNOPRO_ARCHITECTURE_CLASSIFICATION.md",
        },
        **kwargs,
    )
    metadata = dict(base.get("metadata_json") or {})
    metadata.update(kwargs.pop("metadata_json", {}))
    base["metadata_json"] = metadata
    return base


CONFIGURATION_REGISTRY_COMPONENTS: list[RegistrySupplementRow] = [
    # --- Группы (10) ---
    _config_row(
        component_key="config-group-navigation",
        technical_name="Navigation Configuration",
        title="Навигация",
        description="Опубликованная структура бокового меню и точек входа.",
        purpose="Раздел конфигурации: навигация tenant",
        sort_order=10,
        metadata_json={**_CONFIG_META, "group_key": "navigation"},
    ),
    _config_row(
        component_key="config-group-pages",
        technical_name="Pages Configuration",
        title="Страницы",
        description="Каталог страниц, композиция и домашняя страница.",
        purpose="Раздел конфигурации: страницы tenant",
        sort_order=20,
        metadata_json={**_CONFIG_META, "group_key": "pages"},
    ),
    _config_row(
        component_key="config-group-workspaces",
        technical_name="Workspaces Configuration",
        title="Рабочие пространства",
        description="Системные рабочие пространства и вкладки (не персональные).",
        purpose="Раздел конфигурации: рабочие пространства",
        sort_order=30,
        metadata_json={**_CONFIG_META, "group_key": "workspaces"},
    ),
    _config_row(
        component_key="config-group-object-placement",
        technical_name="Object Placement Configuration",
        title="Размещение объектов",
        description="Публикация объектов, представлений и привязка к навигации.",
        purpose="Раздел конфигурации: объекты в runtime UX",
        sort_order=40,
        metadata_json={**_CONFIG_META, "group_key": "object_placement"},
    ),
    _config_row(
        component_key="config-group-module-placement",
        technical_name="Module Placement Configuration",
        title="Размещение модулей",
        description="Install модулей и tenant settings модулей.",
        purpose="Раздел конфигурации: модули в UX",
        sort_order=50,
        metadata_json={**_CONFIG_META, "group_key": "module_placement"},
    ),
    _config_row(
        component_key="config-group-ui-placement",
        technical_name="UI Placement Configuration",
        title="Размещение элементов интерфейса",
        description="Оболочка приложения, top bar, visibility, branding.",
        purpose="Раздел конфигурации: placement UI-зон",
        sort_order=60,
        metadata_json={**_CONFIG_META, "group_key": "ui_placement"},
    ),
    _config_row(
        component_key="config-group-action-placement",
        technical_name="Action Placement Configuration",
        title="Размещение действий",
        description="Toolbar, card actions, context menu, ordering.",
        purpose="Раздел конфигурации: действия в UX",
        sort_order=70,
        metadata_json={**_CONFIG_META, "group_key": "action_placement"},
    ),
    _config_row(
        component_key="config-group-startup-roles",
        technical_name="Startup Roles Configuration",
        title="Стартовые роли и доступ",
        description="Начальный набор ролей компании из Эталона.",
        purpose="Стартовый RBAC snapshot",
        sort_order=80,
        metadata_json={**_CONFIG_META, "group_key": "startup_roles"},
    ),
    _config_row(
        component_key="config-group-startup-company",
        technical_name="Startup Company Configuration",
        title="Стартовая конфигурация компании",
        description="Профиль новой компании при provisioning из Эталона.",
        purpose="Baseline tenant при создании",
        sort_order=90,
        metadata_json={**_CONFIG_META, "group_key": "startup_company"},
    ),
    _config_row(
        component_key="config-group-published-catalog",
        technical_name="Published Platform Catalog",
        title="Опубликованный каталог платформы",
        description="Materialized publish snapshot структуры tenant.",
        purpose="Итоговая опубликованная конфигурация",
        sort_order=100,
        metadata_json={**_CONFIG_META, "group_key": "published_catalog"},
    ),
    # --- Навигация (5) ---
    _config_row(
        component_key="config-nav-structure",
        technical_name="Navigation Structure",
        title="Структура навигации",
        description="Опубликованное дерево разделов tenant.",
        parent_key="config-group-navigation",
        sort_order=11,
    ),
    _config_row(
        component_key="config-nav-menu-items",
        technical_name="Navigation Menu Items",
        title="Пункты меню",
        description="Entries: страница, объект, модуль, системный раздел.",
        parent_key="config-group-navigation",
        sort_order=12,
    ),
    _config_row(
        component_key="config-nav-order-hierarchy",
        technical_name="Navigation Order And Hierarchy",
        title="Порядок и иерархия",
        description="Sort order, parent/child, группы меню.",
        parent_key="config-group-navigation",
        sort_order=13,
    ),
    _config_row(
        component_key="config-nav-icons-labels",
        technical_name="Navigation Icons And Labels",
        title="Иконки и подписи",
        description="Display-атрибуты пункта меню.",
        parent_key="config-group-navigation",
        sort_order=14,
    ),
    _config_row(
        component_key="config-nav-module-entry-points",
        technical_name="Module Entry Points",
        title="Точки входа модулей",
        description="Menu entries и routes модулей в навигации.",
        parent_key="config-group-navigation",
        sort_order=15,
    ),
    # --- Страницы (4) ---
    _config_row(
        component_key="config-pages-catalog",
        technical_name="Pages Catalog",
        title="Каталог страниц",
        description="Опубликованный список страниц tenant.",
        parent_key="config-group-pages",
        sort_order=21,
    ),
    _config_row(
        component_key="config-pages-composition",
        technical_name="Page Composition",
        title="Композиция страницы",
        description="Sections, blocks, layout страницы.",
        parent_key="config-group-pages",
        sort_order=22,
    ),
    _config_row(
        component_key="config-pages-home",
        technical_name="Home Page",
        title="Домашняя страница",
        description="Стартовая страница tenant после входа.",
        parent_key="config-group-pages",
        sort_order=23,
    ),
    _config_row(
        component_key="config-pages-layout-templates",
        technical_name="Layout Templates",
        title="Шаблоны компоновки",
        description="Переиспользуемые layout patterns страниц.",
        parent_key="config-group-pages",
        sort_order=24,
    ),
    # --- Рабочие пространства (3) ---
    _config_row(
        component_key="config-workspaces",
        technical_name="Workspaces",
        title="Рабочие пространства",
        description="Опубликованные workspace definitions tenant.",
        parent_key="config-group-workspaces",
        sort_order=31,
    ),
    _config_row(
        component_key="config-workspace-tabs",
        technical_name="Workspace Tabs",
        title="Вкладки рабочих пространств",
        description="Системные вкладки workspace (не персональные).",
        parent_key="config-group-workspaces",
        sort_order=32,
    ),
    _config_row(
        component_key="config-system-tabs",
        technical_name="System Tabs",
        title="Системные вкладки",
        description="Platform-defined tabs в workspace shell.",
        parent_key="config-group-workspaces",
        sort_order=33,
    ),
    # --- Размещение объектов (4) ---
    _config_row(
        component_key="config-object-type-publication",
        technical_name="Object Type Publication",
        title="Публикация объектов",
        description="Какие объекты (виды сущностей) доступны в runtime tenant.",
        parent_key="config-group-object-placement",
        sort_order=41,
    ),
    _config_row(
        component_key="config-view-publication",
        technical_name="View Publication",
        title="Публикация представлений",
        description="Table/card/custom views в runtime.",
        parent_key="config-group-object-placement",
        sort_order=42,
    ),
    _config_row(
        component_key="config-object-nav-binding",
        technical_name="Object Navigation Binding",
        title="Привязка объектов к навигации",
        description="Пункты меню на объекты и представления.",
        parent_key="config-group-object-placement",
        sort_order=43,
    ),
    _config_row(
        component_key="config-quick-forms",
        technical_name="Published Quick Forms",
        title="Опубликованные быстрые формы",
        description="Quick-create forms в UX tenant.",
        parent_key="config-group-object-placement",
        sort_order=44,
    ),
    # --- Размещение модулей (2) ---
    _config_row(
        component_key="config-module-publication",
        technical_name="Module Publication",
        title="Публикация модулей",
        description="Installed/enabled modules для tenant.",
        parent_key="config-group-module-placement",
        sort_order=51,
    ),
    _config_row(
        component_key="config-module-tenant-settings",
        technical_name="Module Tenant Settings",
        title="Настройки модулей компании",
        description="Tenant-level module configuration snapshot.",
        parent_key="config-group-module-placement",
        sort_order=52,
    ),
    # --- Размещение UI (4) ---
    _config_row(
        component_key="config-shell-layout",
        technical_name="Application Shell Layout",
        title="Компоновка оболочки приложения",
        description="Sidebar, header, content zones layout.",
        parent_key="config-group-ui-placement",
        sort_order=61,
    ),
    _config_row(
        component_key="config-top-bar-zones",
        technical_name="Top Bar Zones",
        title="Размещение зон верхней панели",
        description="Search, notifications, user menu, breadcrumbs placement.",
        parent_key="config-group-ui-placement",
        sort_order=62,
    ),
    _config_row(
        component_key="config-ui-visibility",
        technical_name="UI Element Visibility",
        title="Видимость элементов интерфейса",
        description="Show/hide UX zones в shell.",
        parent_key="config-group-ui-placement",
        sort_order=63,
    ),
    _config_row(
        component_key="config-portal-branding",
        technical_name="Portal Branding",
        title="Брендинг портала",
        description="Logo, colors, tenant branding в shell.",
        parent_key="config-group-ui-placement",
        sort_order=64,
    ),
    # --- Размещение действий (4) ---
    _config_row(
        component_key="config-list-toolbar-actions",
        technical_name="List Toolbar Actions",
        title="Действия панели списка",
        description="Actions на list/table toolbar.",
        parent_key="config-group-action-placement",
        sort_order=71,
    ),
    _config_row(
        component_key="config-card-actions",
        technical_name="Card Actions",
        title="Действия карточки объекта",
        description="Actions на object card/detail.",
        parent_key="config-group-action-placement",
        sort_order=72,
    ),
    _config_row(
        component_key="config-context-actions",
        technical_name="Context Actions",
        title="Контекстные действия",
        description="Context menu и row actions.",
        parent_key="config-group-action-placement",
        sort_order=73,
    ),
    _config_row(
        component_key="config-action-groups-order",
        technical_name="Action Groups And Order",
        title="Группы и порядок действий",
        description="Grouping, separators, sort order actions.",
        parent_key="config-group-action-placement",
        sort_order=74,
    ),
]
