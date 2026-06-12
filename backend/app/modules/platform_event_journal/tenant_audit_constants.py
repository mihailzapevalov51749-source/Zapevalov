"""Tenant (Studio) event journal — categories and event codes."""

from __future__ import annotations

from enum import Enum


class TenantEventCategory(str, Enum):
    PAGES = "pages"
    NAVIGATION = "navigation"
    OBJECT_TYPES = "object_types"
    OBJECTS = "objects"
    FIELDS = "fields"
    RELATIONS = "relations"
    VIEWS = "views"
    ACTIONS = "actions"
    RULES = "rules"
    WORKSPACES = "workspaces"
    PROCESSES = "processes"
    DOCUMENTS = "documents"
    PUBLICATION = "publication"
    TRASH = "trash"
    SETTINGS = "settings"
    SYSTEM = "system"


class TenantEventCode(str, Enum):
    PAGE_CREATED = "page_created"
    PAGE_UPDATED = "page_updated"
    PAGE_DELETED = "page_deleted"
    PAGE_RESTORED = "page_restored"

    NAVIGATION_UPDATED = "navigation_updated"
    NAVIGATION_MENU_CREATED = "navigation_menu_created"
    NAVIGATION_MENU_DELETED = "navigation_menu_deleted"

    OBJECT_TYPE_CREATED = "object_type_created"
    OBJECT_TYPE_UPDATED = "object_type_updated"
    OBJECT_TYPE_DELETED = "object_type_deleted"

    OBJECT_CREATED = "object_created"
    OBJECT_UPDATED = "object_updated"
    OBJECT_DELETED = "object_deleted"

    FIELD_CREATED = "field_created"
    FIELD_UPDATED = "field_updated"
    FIELD_DELETED = "field_deleted"

    RELATION_CREATED = "relation_created"
    RELATION_UPDATED = "relation_updated"
    RELATION_PUBLISHED = "relation_published"
    RELATION_DELETED = "relation_deleted"

    VIEW_CREATED = "view_created"
    VIEW_UPDATED = "view_updated"
    VIEW_DELETED = "view_deleted"

    ACTION_CREATED = "action_created"
    ACTION_UPDATED = "action_updated"
    ACTION_DELETED = "action_deleted"

    RULE_CREATED = "rule_created"
    RULE_UPDATED = "rule_updated"
    RULE_DELETED = "rule_deleted"

    WORKSPACE_CREATED = "workspace_created"
    WORKSPACE_UPDATED = "workspace_updated"
    WORKSPACE_DELETED = "workspace_deleted"

    PROCESS_CREATED = "process_created"
    PROCESS_UPDATED = "process_updated"
    PROCESS_DELETED = "process_deleted"

    DOCUMENT_CREATED = "document_created"
    DOCUMENT_UPDATED = "document_updated"
    DOCUMENT_DELETED = "document_deleted"

    PUBLICATION_STARTED = "publication_started"
    PUBLICATION_COMPLETED = "publication_completed"

    TRASH_ITEM_RESTORED = "trash_item_restored"
    TRASH_ITEM_PURGED = "trash_item_purged"
    TRASH_BULK_PURGED = "trash_bulk_purged"

    SETTINGS_UPDATED = "settings_updated"

    LEGACY = "legacy"


TENANT_EVENT_CATEGORY_LABELS: dict[str, str] = {
    TenantEventCategory.PAGES.value: "Pages",
    TenantEventCategory.NAVIGATION.value: "Navigation",
    TenantEventCategory.OBJECT_TYPES.value: "Object Types",
    TenantEventCategory.OBJECTS.value: "Objects",
    TenantEventCategory.FIELDS.value: "Fields",
    TenantEventCategory.RELATIONS.value: "Relations",
    TenantEventCategory.VIEWS.value: "Views",
    TenantEventCategory.ACTIONS.value: "Actions",
    TenantEventCategory.RULES.value: "Rules",
    TenantEventCategory.WORKSPACES.value: "Workspaces",
    TenantEventCategory.PROCESSES.value: "Processes",
    TenantEventCategory.DOCUMENTS.value: "Documents",
    TenantEventCategory.PUBLICATION.value: "Publication",
    TenantEventCategory.TRASH.value: "Trash",
    TenantEventCategory.SETTINGS.value: "Settings",
    TenantEventCategory.SYSTEM.value: "System",
}

TENANT_EVENT_CODE_LABELS: dict[str, str] = {
    TenantEventCode.PAGE_CREATED.value: "Создание страницы",
    TenantEventCode.PAGE_UPDATED.value: "Изменение страницы",
    TenantEventCode.PAGE_DELETED.value: "Удаление страницы",
    TenantEventCode.PAGE_RESTORED.value: "Восстановление страницы",
    TenantEventCode.NAVIGATION_UPDATED.value: "Изменение навигации",
    TenantEventCode.NAVIGATION_MENU_CREATED.value: "Создание пункта навигации",
    TenantEventCode.NAVIGATION_MENU_DELETED.value: "Удаление пункта навигации",
    TenantEventCode.OBJECT_TYPE_CREATED.value: "Создание типа объекта",
    TenantEventCode.OBJECT_TYPE_UPDATED.value: "Изменение типа объекта",
    TenantEventCode.OBJECT_TYPE_DELETED.value: "Удаление типа объекта",
    TenantEventCode.OBJECT_CREATED.value: "Создание объекта",
    TenantEventCode.OBJECT_UPDATED.value: "Изменение объекта",
    TenantEventCode.OBJECT_DELETED.value: "Удаление объекта",
    TenantEventCode.FIELD_CREATED.value: "Создание поля",
    TenantEventCode.FIELD_UPDATED.value: "Изменение поля",
    TenantEventCode.FIELD_DELETED.value: "Удаление поля",
    TenantEventCode.RELATION_CREATED.value: "Создание связи",
    TenantEventCode.RELATION_UPDATED.value: "Изменение связи",
    TenantEventCode.RELATION_PUBLISHED.value: "Публикация связи",
    TenantEventCode.RELATION_DELETED.value: "Удаление связи",
    TenantEventCode.VIEW_CREATED.value: "Создание представления",
    TenantEventCode.VIEW_UPDATED.value: "Изменение представления",
    TenantEventCode.VIEW_DELETED.value: "Удаление представления",
    TenantEventCode.ACTION_CREATED.value: "Создание действия",
    TenantEventCode.ACTION_UPDATED.value: "Изменение действия",
    TenantEventCode.ACTION_DELETED.value: "Удаление действия",
    TenantEventCode.RULE_CREATED.value: "Создание правила",
    TenantEventCode.RULE_UPDATED.value: "Изменение правила",
    TenantEventCode.RULE_DELETED.value: "Удаление правила",
    TenantEventCode.WORKSPACE_CREATED.value: "Создание рабочего пространства",
    TenantEventCode.WORKSPACE_UPDATED.value: "Изменение рабочего пространства",
    TenantEventCode.WORKSPACE_DELETED.value: "Удаление рабочего пространства",
    TenantEventCode.PROCESS_CREATED.value: "Создание процесса",
    TenantEventCode.PROCESS_UPDATED.value: "Изменение процесса",
    TenantEventCode.PROCESS_DELETED.value: "Удаление процесса",
    TenantEventCode.DOCUMENT_CREATED.value: "Создание документа",
    TenantEventCode.DOCUMENT_UPDATED.value: "Изменение документа",
    TenantEventCode.DOCUMENT_DELETED.value: "Удаление документа",
    TenantEventCode.PUBLICATION_STARTED.value: "Запуск публикации",
    TenantEventCode.PUBLICATION_COMPLETED.value: "Публикация",
    TenantEventCode.TRASH_ITEM_RESTORED.value: "Восстановление из корзины",
    TenantEventCode.TRASH_ITEM_PURGED.value: "Окончательное удаление",
    TenantEventCode.TRASH_BULK_PURGED.value: "Массовое удаление из корзины",
    TenantEventCode.SETTINGS_UPDATED.value: "Изменение настроек",
    TenantEventCode.LEGACY.value: "legacy",
}

# Legacy Studio seed / development journal types (stored in metadata_json.legacy_event_type).
TENANT_LEGACY_JOURNAL_TYPE_LABELS: dict[str, str] = {
    "development": "Разработка",
    "fix": "Исправление",
    "audit": "Аудит",
    "architecture": "Архитектурное решение",
    "refactoring": "Рефакторинг",
    "publish": "Публикация",
    "settings_change": "Изменение настроек",
    "ux_improvement": "UX улучшение",
}

TENANT_LEGACY_EVENT_TYPE_CATEGORY_MAP: dict[str, str] = {
    "architecture": TenantEventCategory.SYSTEM.value,
    "fix": TenantEventCategory.SYSTEM.value,
    "development": TenantEventCategory.SYSTEM.value,
    "refactoring": TenantEventCategory.SYSTEM.value,
    "audit": TenantEventCategory.SYSTEM.value,
    "ux_improvement": TenantEventCategory.SYSTEM.value,
    "publish": TenantEventCategory.PUBLICATION.value,
    "settings_change": TenantEventCategory.SETTINGS.value,
}

TENANT_EVENT_CATEGORY_VALUES = frozenset(TENANT_EVENT_CATEGORY_LABELS)
PLATFORM_EVENT_CATEGORY_VALUES = frozenset(
    {
        "provisioning",
        "company",
        "license",
        "platform_owner",
        "platform_settings",
        "platform_user",
        "platform_role",
        "template",
        "publication",
        "security",
        "bootstrap",
        "system",
    }
)

TENANT_ONLY_EVENT_CATEGORIES = TENANT_EVENT_CATEGORY_VALUES - PLATFORM_EVENT_CATEGORY_VALUES
PLATFORM_ONLY_EVENT_CATEGORIES = PLATFORM_EVENT_CATEGORY_VALUES - TENANT_EVENT_CATEGORY_VALUES
