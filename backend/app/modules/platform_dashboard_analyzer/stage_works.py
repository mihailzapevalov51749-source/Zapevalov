from app.modules.platform_dashboard_analyzer.backend_scan import (
    backend_has_module,
    backend_has_table,
)
from app.modules.platform_dashboard_analyzer.frontend_scan import frontend_has_marker, frontend_has_module
from app.modules.platform_dashboard_analyzer.types import ScanContext
MAX_STAGE_WORKS = 24

# Веса work items (сумма по slug с весами = 100, где задано). P0 > P1 > P2 > P3.
STAGE_WORK_WEIGHTS: dict[str, dict[str, int]] = {
    "legacy-isolation": {
        "Завершить перевод legacy страниц на объектную платформу": 20,
    },
    "legacy-removal": {
        "Подготовить стратегию миграции данных Universal Tables": 20,
    },
    "object-table-ut-parity": {
        "Реализовать чек-листы в карточке": 10,
        "Реализовать многоколоночную сортировку": 10,
        "Реализовать фильтрацию по связям": 10,
        "Реализовать перетаскивание строк": 10,
        "Реализовать режим дерева": 10,
        "Реализовать поиск по таблице": 5,
        "Реализовать дублирование записей": 5,
        "Реализовать массовое изменение записей": 5,
        "Сохранять выбранный быстрый фильтр": 5,
        "Вернуть номер строки таблицы": 5,
        "Реализовать редактирование связей в таблице": 5,
        "Реализовать экспорт Excel": 4,
        "Реализовать импорт Excel": 4,
        "Реализовать закрепление колонок": 4,
        "Реализовать виртуализацию строк": 4,
        "Реализовать тип поля Ссылка": 4,
    },
}

STAGE_CANONICAL: dict[str, dict[str, list[str]]] = {
    "object-platform-independence": {
        "works": [
            "Перенести entity card layout в shared/entityCardShell",
            "Переписать objectEntities на entityCardShell",
            "Убрать legacy notification path",
            "Убрать runtimeReadGateway legacy fallback — already done",
            "Убрать runtimeLegacyWriteAdapter — already done",
        ],
        "completion_criteria": [
            "Новые записи создаются только через object platform",
            "Таблицы и карточки читают данные через Runtime Entity API",
        ],
    },
    "legacy-isolation": {
        "works": [
            "Завершить перевод legacy страниц на объектную платформу",
            "Запретить создание новых UT blocks",
            "Убрать table/universal_table block types из новых сценариев — already done",
            "Заменить старые table blocks на placeholder",
            "Убрать переходы в Universal Tables",
            "Отделить PortalPageView от UniversalTableView",
        ],
        "completion_criteria": [
            "Legacy явно отделён от object platform",
            "Новые порталы не предлагают legacy как основной путь",
        ],
    },
    "legacy-removal": {
        "works": [
            "Подготовить стратегию миграции данных Universal Tables",
            "Удалить modules/universalTable из frontend",
            "Удалить universal_tables backend router",
            "Удалить universal_views backend router",
            "Удалить legacy API clients",
            "Создать Alembic DROP migration для UT storage",
        ],
        "completion_criteria": [
            "Legacy-табличный модуль удалён из продукта",
            "Критичные сценарии переведены на object platform",
        ],
    },
    "object-table-ut-parity": {
        "goal": (
            "Закрыть функциональные пробелы Object Table относительно Universal Tables "
            "перед полным отказом от legacy-контура."
        ),
        "works": [
            "Реализовать чек-листы в карточке",
            "Реализовать многоколоночную сортировку",
            "Реализовать фильтрацию по связям",
            "Реализовать перетаскивание строк",
            "Реализовать режим дерева",
            "Реализовать поиск по таблице",
            "Реализовать дублирование записей",
            "Реализовать массовое изменение записей",
            "Сохранять выбранный быстрый фильтр",
            "Вернуть номер строки таблицы",
            "Реализовать редактирование связей в таблице",
            "Реализовать экспорт Excel",
            "Реализовать импорт Excel",
            "Реализовать закрепление колонок",
            "Реализовать виртуализацию строк",
            "Реализовать тип поля Ссылка",
        ],
        "completion_criteria": [
            "Object Table покрывает пользовательский функционал Universal Tables",
            "Universal Tables можно отключить без потери ключевых возможностей",
        ],
    },
    "runtime-foundation": {
        "works": [
            "Runtime auth",
            "Object-level permissions",
            "Field/group permissions",
            "Object search",
            "Relation engine foundation",
        ],
        "completion_criteria": [
            "Права доступа работают на уровне объектов",
            "Поиск доступен из ключевых разделов портала",
        ],
    },
    "designer-foundation": {
        "works": [
            "Сценарии публикации и preview в Studio",
            "Понятная граница Studio и runtime",
            "Управление жизненным циклом типа объекта",
            "UI Framework: единый стандарт модальных окон (PlatformModal)",
            "Корзина платформы: soft delete, восстановление и окончательное удаление",
            "Runtime-контракт статусов страниц (draft/published/hidden)",
            "Места публикации страниц и скрытие hidden в пользовательских меню",
            "Единый источник истины видимости страниц (pages.status)",
            "Нормализация существующих страниц под новый контракт публикации",
        ],
        "completion_criteria": [
            "Studio — единая точка настройки object platform",
            "Публикация и preview предсказуемы для владельца продукта",
        ],
    },
    "ai-native-layer": {
        "works": [
            "Контур AI Context для типов объектов и связей",
            "Согласование событий платформы для AI",
            "Пилотный сценарий AI поверх object platform",
        ],
        "completion_criteria": [
            "AI использует object platform как источник контекста",
            "Связи и события доступны для AI-сценариев",
        ],
    },
    "relation-field-type": {
        "goal": (
            "Реализация field_type relation как UI-представления над "
            "runtime_relation_instances (ADR-Object-Relation-Field)."
        ),
        "works": [
            "Контракт поля",
            "Studio",
            "Runtime API",
            "Карточка объекта",
            "Таблица объекта",
            "Self-relation support",
            "Спецификация task_subtask",
            "Доменные ограничения task_subtask",
            "Parent Section через relation engine",
            "Подзадачи через relation engine",
            'Интеграция со "Связанными записями"',
            "Фильтрация связей",
            "Аналитика связей",
            "Миграция UT parent_row_id",
            "Tree View для Object Platform",
            "Безопасное удаление с подзадачами (Object Table)",
            "ViewEngineRowMenu (строковое меню Object Table)",
            "Терминология иерархической связи (Studio + Object Table)",
            "Массовое выделение строк Object Table",
            "Массовое удаление записей Object Table",
            "Пользовательские представления Object Table (стиль фильтров)",
        ],
        "completion_criteria": [
            "Поле relation существует в контракте платформы",
            "Пользователь может создать relation field через Studio",
            "Relation field полностью работает через relation engine",
            "Связи работают в карточке объекта",
            "Связи корректно отображаются в таблице",
            'Поле "Связи" и вкладка "Связанные записи" используют один relation engine',
            "Relation field участвует в механизмах анализа данных",
        ],
    },
}


def _frontend_has(ctx: ScanContext, marker: str) -> bool:
    return frontend_has_marker(ctx.frontend, marker)


def _legacy_block_creation_blocked(ctx: ScanContext) -> bool:
    registry = ctx.frontend.file_contents.get("shared/legacy/legacyStorageRegistry.ts", "")
    blocks_api = ctx.frontend.file_contents.get("api/blocksApi.js", "")
    return (
        bool(registry)
        and "allowNewSourceCreation: false" in registry
        and bool(blocks_api)
        and "assertLegacyStorageBlockCreationAllowed" in blocks_api
    )


def _legacy_block_types_isolated_from_new_scenarios(ctx: ScanContext) -> bool:
    page_types = ctx.frontend.file_contents.get("portal/constants/pageCanvasBlockTypes.js", "")
    widget_library = ctx.frontend.file_contents.get("modules/editor/components/WidgetLibrary.jsx", "")
    blocks_api = ctx.frontend.file_contents.get("api/blocksApi.js", "")
    return (
        bool(page_types)
        and "isLegacyStorageBlockType" in page_types
        and bool(widget_library)
        and 'type: "universal_table"' not in widget_library
        and bool(blocks_api)
        and "assertLegacyStorageBlockCreationAllowed" in blocks_api
    )


def _legacy_table_blocks_use_placeholder_boundary(ctx: ScanContext) -> bool:
    placeholder = ctx.frontend.file_contents.get(
        "shared/legacy/components/LegacyStorageBlockPlaceholderView.jsx",
        "",
    )
    boundary = ctx.frontend.file_contents.get(
        "shared/legacy/support/LegacyStorageSupportModeBoundary.jsx",
        "",
    )
    registry = ctx.frontend.file_contents.get("modules/blocks/registry/blockRegistry.js", "")

    if not placeholder or not boundary or not registry:
        return False

    if "UniversalTableView" in registry or "modules/universalTable" in registry:
        return False

    if "LegacyStorageBlockPlaceholderView" not in registry:
        return False

    if "LEGACY_STORAGE_BLOCK_PLACEHOLDER" not in registry:
        return False

    required_keys = ("table:", "universal_table:")
    if not all(key in registry for key in required_keys):
        return False

    alias_keys = ("tableBlock:", "table_block:")
    for alias_key in alias_keys:
        if alias_key in registry and "LEGACY_STORAGE_BLOCK_PLACEHOLDER" not in registry:
            return False

    return (
        "lazy(" in boundary
        and "modules/universalTable" in boundary
        and "LegacyStorageSupportModeBoundary" in placeholder
    )


_LEGACY_NAV_SIDEBAR_BRIDGE_FILES = (
    "shared/shell/sidebar/usePlatformSidebarControls.js",
    "modules/navigation/components/LeftSidebar.jsx",
    "portal/PortalPageView.jsx",
)

_LEGACY_NAV_SIDEBAR_FORBIDDEN_UT_MARKERS = (
    "modules/universalTable/services/tableApi",
    "modules/universalTable/session/tableDirtySaveCompat",
    "modules/universalTable/utils/syncUniversalTableTitle",
    "modules/universalTable/utils/universalTableTitleEvents",
    "modules/universalTable/utils/resolvePrimaryTableId",
)


def _legacy_nav_sidebar_bridges_use_adapter(ctx: ScanContext) -> bool:
    adapter = ctx.frontend.file_contents.get("shared/legacy/adapters/legacyStorageAdapter.js", "")

    if not adapter:
        return False

    required_adapter_exports = (
        "renameLegacyStorage",
        "renameLegacyStorageForPage",
        "requestLegacyLeaveConfirmation",
        "syncLegacyStorageTitleAcrossUi",
        "subscribeToLegacyStorageTitle",
    )
    if not all(marker in adapter for marker in required_adapter_exports):
        return False

    for rel_path in _LEGACY_NAV_SIDEBAR_BRIDGE_FILES:
        content = ctx.frontend.file_contents.get(rel_path, "")
        if not content:
            return False
        if "legacyStorageAdapter" not in content:
            return False
        if any(marker in content for marker in _LEGACY_NAV_SIDEBAR_FORBIDDEN_UT_MARKERS):
            return False

    return True


_LEGACY_PORTAL_PAGE_VIEW_PATH = "portal/PortalPageView.jsx"
_LEGACY_SYSTEM_ROUTE_VIEW_PATH = "shared/legacy/components/LegacyStorageSystemRouteView.jsx"

_LEGACY_PORTAL_PAGE_VIEW_FORBIDDEN_UT_MARKERS = (
    "UniversalTableView",
    "modules/universalTable",
)


def _legacy_portal_page_view_decoupled_from_universal_table_view(ctx: ScanContext) -> bool:
    system_route_view = ctx.frontend.file_contents.get(_LEGACY_SYSTEM_ROUTE_VIEW_PATH, "")
    portal_page_view = ctx.frontend.file_contents.get(_LEGACY_PORTAL_PAGE_VIEW_PATH, "")

    if not system_route_view or not portal_page_view:
        return False

    if "LegacyStorageSupportModeBoundary" not in system_route_view:
        return False

    if "LegacyStorageSystemRouteView" not in portal_page_view:
        return False

    if any(marker in portal_page_view for marker in _LEGACY_PORTAL_PAGE_VIEW_FORBIDDEN_UT_MARKERS):
        return False

    return True


_RELATION_INSTANCES_ROUTER = "modules/platform/runtime/relation_instances/router.py"
_RELATION_INSTANCES_TESTS = "modules/platform/runtime/relation_instances/test_relation_instances.py"

_RELATION_RUNTIME_API_MARKERS = (
    "@relations_router.post",
    "@relations_router.delete",
    "@relations_router.get",
)

_RELATION_FRONTEND_API_PATH = "api/runtimeRelationsApi.js"
_RELATION_FRONTEND_UI_FILES = (
    "modules/objectEntities/components/ObjectEntityRelatedEntities.jsx",
    "modules/objectEntities/hooks/useObjectEntityRelations.js",
    "modules/objectEntities/components/ObjectEntityCardTabsBlock.jsx",
    "modules/objectEntities/services/resolveCreatableRelationOptions.js",
)

_RELATION_BACKEND_TEST_MARKERS = (
    "validation",
    "duplicate",
    "delete",
    "create",
)


def _backend_evidence_text(ctx: ScanContext, rel_path: str) -> str:
    return ctx.backend.file_contents.get(rel_path, "")


def _frontend_evidence_text(ctx: ScanContext, rel_path: str) -> str:
    return ctx.frontend.file_contents.get(rel_path, "")


def _relation_engine_foundation_complete(ctx: ScanContext) -> bool:
    if not backend_has_table(ctx.backend, "designer_relation_definitions"):
        return False
    if not backend_has_table(ctx.backend, "runtime_relation_instances"):
        return False
    if not backend_has_module(ctx.backend, "modules/platform/runtime/relation_instances"):
        return False

    router_text = _backend_evidence_text(ctx, _RELATION_INSTANCES_ROUTER)
    if not router_text:
        return False
    if not all(marker in router_text for marker in _RELATION_RUNTIME_API_MARKERS):
        return False

    api_text = _frontend_evidence_text(ctx, _RELATION_FRONTEND_API_PATH)
    if not api_text or "createRelation" not in api_text or "deleteRelation" not in api_text:
        return False

    ui_texts = [_frontend_evidence_text(ctx, rel_path) for rel_path in _RELATION_FRONTEND_UI_FILES]
    if not all(ui_texts):
        return False

    related_entities, relations_hook, tabs_block, creatable_options = ui_texts

    if "Добавить связь" not in related_entities:
        return False
    if "createRelation" not in relations_hook:
        return False
    if "deleteRelation" not in relations_hook:
        return False
    if "ObjectEntityRelatedEntities" not in tabs_block:
        return False
    if "resolveCreatableRelationOptions" not in creatable_options:
        return False
    if "resolveCreatableRelationOptions" not in relations_hook:
        return False

    tests_text = _backend_evidence_text(ctx, _RELATION_INSTANCES_TESTS)
    if not tests_text:
        return False
    tests_lower = tests_text.lower()
    if not all(marker in tests_lower for marker in _RELATION_BACKEND_TEST_MARKERS):
        return False

    return True


_OBJECT_SEARCH_RUNTIME_SERVICE = "modules/platform/runtime/search/service.py"
_OBJECT_SEARCH_RUNTIME_ROUTER = "modules/platform/runtime/search/router.py"
_OBJECT_SEARCH_RUNTIME_RANKING = "modules/platform/runtime/search/ranking.py"
_OBJECT_SEARCH_RUNTIME_TESTS = "modules/platform/runtime/search/test_search.py"
_OBJECT_SEARCH_PLATFORM_SERVICE = "modules/platform/search/service.py"
_OBJECT_SEARCH_PLATFORM_PERMISSIONS = "modules/platform/search/permissions.py"
_OBJECT_SEARCH_PLATFORM_TESTS = "modules/platform/search/test_platform_search.py"

_OBJECT_SEARCH_RUNTIME_SCOPE_MARKERS = (
    "runtime.company",
    "runtime.object_type",
    "runtime.document_library",
    "runtime.document_folder",
)

_OBJECT_SEARCH_RANKING_MARKERS = (
    "exact match",
    "starts with",
    "contains query",
)

_OBJECT_SEARCH_PLATFORM_DESIGNER_MARKERS = (
    "designer.object_type",
    "designer.field",
    "designer.view",
    "designer.relation",
)


def _page_status_runtime_contract_complete(ctx: ScanContext) -> bool:
    runtime_access_text = _backend_evidence_text(ctx, "modules/pages/runtime_access.py")
    nav_filter_text = _backend_evidence_text(ctx, "modules/navigation/page_status_filter.py")
    nav_reload_text = _frontend_evidence_text(ctx, "modules/designer/utils/navigationReload.js")
    pages_page_text = _frontend_evidence_text(ctx, "modules/designer/pages/DesignerPagesPage.jsx")
    if not runtime_access_text or not nav_filter_text or not nav_reload_text or not pages_page_text:
        return False
    return (
        "OFFICE_RUNTIME_STATUSES = frozenset({PAGE_STATUS_PUBLISHED})" in runtime_access_text
        and "resolve_navigation_page_id" in nav_filter_text
        and "dispatchPageStatusNavigationRefresh" in nav_reload_text
        and "dispatchPageStatusNavigationRefresh" in pages_page_text
    )


def _page_visibility_single_source_complete(ctx: ScanContext) -> bool:
    visibility_text = _backend_evidence_text(ctx, "modules/navigation/page_navigation_visibility.py")
    nav_service_text = _backend_evidence_text(ctx, "modules/navigation/service.py")
    menu_editor_text = _frontend_evidence_text(ctx, "modules/navigation/components/MenuItemEditor.jsx")
    nav_tree_text = _frontend_evidence_text(ctx, "modules/navigation/hooks/useNavigationTree.js")
    if not visibility_text or not nav_service_text or not menu_editor_text or not nav_tree_text:
        return False
    return (
        "apply_page_status_visibility_update" in visibility_text
        and "for_edit_mode" in nav_service_text
        and "page_status" in menu_editor_text
        and "forEditMode" in nav_tree_text
    )


def _page_publication_places_complete(ctx: ScanContext) -> bool:
    pages_service_text = _backend_evidence_text(ctx, "modules/platform/designer/pages/service.py")
    nav_service_text = _backend_evidence_text(ctx, "modules/navigation/service.py")
    pages_panel_text = _frontend_evidence_text(ctx, "modules/designer/components/pages/PageDetailPanel.jsx")
    pages_utils_text = _frontend_evidence_text(ctx, "modules/designer/utils/pagesRegistryUtils.js")
    if not pages_service_text or not nav_service_text or not pages_panel_text or not pages_utils_text:
        return False
    return (
        "_build_publication_path_segments" in pages_service_text
        and "_collect_placement_maps" in pages_service_text
        and "filter_navigation_for_user_menu" in nav_service_text
        and "Места публикации" in pages_panel_text
        and "collectPublicationPaths" in pages_utils_text
    )


def _page_status_normalization_complete(ctx: ScanContext) -> bool:
    normalization_text = _backend_evidence_text(
        ctx,
        "modules/platform/designer/pages/page_status_normalization.py",
    )
    script_text = _backend_evidence_text(ctx, "scripts/normalize_page_statuses.py")
    tests_text = _backend_evidence_text(
        ctx,
        "modules/navigation/test_page_status_normalization.py",
    )
    if not normalization_text or not script_text or not tests_text:
        return False
    return (
        "normalize_page_statuses" in normalization_text
        and "plan_page_status_changes" in normalization_text
        and "--dry-run" in script_text
        and "--apply" in script_text
        and "test_page_navigation_is_visible_false_moves_to_hidden_and_reset" in tests_text
    )


def _platform_trash_bin_complete(ctx: ScanContext) -> bool:
    backend_text = _backend_evidence_text(ctx, "platform/designer/trash/service.py")
    if not backend_text:
        return False
    if "restore_trash_item" not in backend_text or "purge_trash_item" not in backend_text:
        return False
    frontend_text = _frontend_evidence_text(ctx, "modules/designer/pages/DesignerTrashPage.jsx")
    api_text = _frontend_evidence_text(ctx, "modules/designer/api/designerApi.js")
    if not frontend_text or not api_text:
        return False
    return (
        "listDesignerTrash" in api_text
        and "restoreDesignerTrashItems" in api_text
        and "purgeDesignerTrashItems" in api_text
        and "Восстановить" in frontend_text
    )

_OBJECT_SEARCH_RUNTIME_TEST_MARKERS = (
    "runtime.company",
    "compute_text_match_rank",
    "search_documents_in_libraries",
    "open=document",
)

_OBJECT_SEARCH_PLATFORM_TEST_MARKERS = (
    "resolve_allowed_domains_for_regular_user",
    "designer.object_type",
    "resolve_allowed_domains_for_admin",
)

_OBJECT_SEARCH_CONTEXT_RESOLVER = "shared/search/searchContextResolver.js"
_OBJECT_SEARCH_SCOPES = "shared/search/searchScopes.js"
_OBJECT_SEARCH_CONTROLLER = "shared/search/useHeaderSearchController.js"
_OBJECT_SEARCH_OVERLAY = "shared/search/SearchResultsOverlay.jsx"
_OBJECT_SEARCH_EXECUTION_ADAPTER = "shared/search/searchExecutionAdapter.js"
_OBJECT_SEARCH_ROLE_UTILS = "shared/search/searchRoleUtils.js"
_OBJECT_SEARCH_PLATFORM_API = "api/platformSearchApi.js"
_OBJECT_SEARCH_LIBRARY_DEEPLINK = "modules/documentLibraries/utils/libraryDeepLink.js"
_OBJECT_SEARCH_LIBRARY_RUNTIME_PAGE = "portal/PortalLibraryRuntimePage.jsx"
_OBJECT_SEARCH_DESIGNER_SHELL = "modules/designer/components/shell/DesignerShell.jsx"

_OBJECT_SEARCH_FRONTEND_TEST_FILES = (
    "shared/search/searchContextResolver.test.js",
    "shared/search/searchExecutionAdapter.test.js",
    "shared/search/useHeaderSearchController.test.js",
    "shared/search/SearchResultsOverlay.test.js",
    "shared/search/searchRoleUtils.test.js",
)


def _library_deep_link_supports_document_opening(deeplink_text: str) -> bool:
    if not deeplink_text:
        return False

    markers = (
        "open=document",
        "LIBRARY_OPEN_DOCUMENT",
        'params.set("open"',
        "params.set('open'",
        "shouldOpenDocument",
        "buildLibraryDeepLinkSearchParams",
        "resolveDeepLinkFolderTarget",
    )
    return any(marker in deeplink_text for marker in markers)


def _object_search_has_progress(ctx: ScanContext) -> bool:
    return (
        backend_has_module(ctx.backend, "modules/platform/runtime/search")
        or backend_has_module(ctx.backend, "modules/platform/search")
        or frontend_has_module(ctx.frontend, "shared/search")
    )


def _object_search_complete(ctx: ScanContext) -> bool:
    if not backend_has_module(ctx.backend, "modules/platform/runtime/search"):
        return False
    if not backend_has_module(ctx.backend, "modules/platform/search"):
        return False
    if not frontend_has_module(ctx.frontend, "shared/search"):
        return False

    service_text = _backend_evidence_text(ctx, _OBJECT_SEARCH_RUNTIME_SERVICE)
    if not service_text:
        return False
    if "execute_runtime_search" not in service_text:
        return False
    if not all(marker in service_text for marker in _OBJECT_SEARCH_RUNTIME_SCOPE_MARKERS):
        return False
    if "search_documents_in_libraries" not in service_text:
        return False
    if "open=document" not in service_text:
        return False

    router_text = _backend_evidence_text(ctx, _OBJECT_SEARCH_RUNTIME_ROUTER)
    if not router_text or "runtime_search" not in router_text:
        return False

    ranking_text = _backend_evidence_text(ctx, _OBJECT_SEARCH_RUNTIME_RANKING)
    if not ranking_text or not all(marker in ranking_text for marker in _OBJECT_SEARCH_RANKING_MARKERS):
        return False

    platform_service = _backend_evidence_text(ctx, _OBJECT_SEARCH_PLATFORM_SERVICE)
    if not platform_service or "execute_platform_search" not in platform_service:
        return False
    if not all(marker in platform_service for marker in _OBJECT_SEARCH_PLATFORM_DESIGNER_MARKERS):
        return False

    permissions_text = _backend_evidence_text(ctx, _OBJECT_SEARCH_PLATFORM_PERMISSIONS)
    if not permissions_text:
        return False
    if "CROSS_MODE_SEARCH_ROLES" not in permissions_text:
        return False
    if "resolve_allowed_search_domains" not in permissions_text:
        return False

    if "platform_search_router" not in ctx.backend.main_py_text:
        return False

    runtime_tests = _backend_evidence_text(ctx, _OBJECT_SEARCH_RUNTIME_TESTS)
    if not runtime_tests:
        return False
    runtime_tests_lower = runtime_tests.lower()
    if not all(marker.lower() in runtime_tests_lower for marker in _OBJECT_SEARCH_RUNTIME_TEST_MARKERS):
        return False

    platform_tests = _backend_evidence_text(ctx, _OBJECT_SEARCH_PLATFORM_TESTS)
    if not platform_tests:
        return False
    platform_tests_lower = platform_tests.lower()
    if not all(marker.lower() in platform_tests_lower for marker in _OBJECT_SEARCH_PLATFORM_TEST_MARKERS):
        return False

    scopes_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_SCOPES)
    if not scopes_text:
        return False
    if not all(
        marker in scopes_text
        for marker in (
            "runtime.company",
            "runtime.section",
            "runtime.object_type",
            "runtime.document_library",
            "runtime.document_folder",
        )
    ):
        return False

    resolver_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_CONTEXT_RESOLVER)
    if not resolver_text or "buildSearchContextResult" not in resolver_text:
        return False

    controller_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_CONTROLLER)
    if not controller_text:
        return False
    if "openFirstResult" not in controller_text:
        return False
    if "setTimeout" not in controller_text:
        return False
    if "SEARCH_DEBOUNCE_MS" not in controller_text and "debounceMs" not in controller_text:
        return False

    overlay_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_OVERLAY)
    if not overlay_text or "SearchResultsOverlay" not in overlay_text:
        return False

    adapter_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_EXECUTION_ADAPTER)
    if not adapter_text or "searchPlatform" not in adapter_text:
        return False

    api_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_PLATFORM_API)
    if not api_text or "searchPlatform" not in api_text:
        return False

    role_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_ROLE_UTILS)
    if not role_text:
        return False
    if "isCrossModeSearchUser" not in role_text:
        return False
    if "resolveRequestedSearchDomains" not in role_text:
        return False
    if "Backend is the source of truth" not in role_text:
        return False

    deeplink_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_LIBRARY_DEEPLINK)
    if not _library_deep_link_supports_document_opening(deeplink_text):
        return False

    library_page_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_LIBRARY_RUNTIME_PAGE)
    if not library_page_text:
        return False
    if "PortalLayout" not in library_page_text:
        return False
    if "DocumentWorkspaceView" not in library_page_text:
        return False
    if "SearchResultsOverlay" not in library_page_text:
        return False

    designer_shell_text = _frontend_evidence_text(ctx, _OBJECT_SEARCH_DESIGNER_SHELL)
    if not designer_shell_text:
        return False
    if "canUseHeaderSearch" not in designer_shell_text:
        return False
    if "useHeaderSearchController" not in designer_shell_text:
        return False

    for rel_path in _OBJECT_SEARCH_FRONTEND_TEST_FILES:
        if rel_path not in ctx.frontend.file_contents:
            return False

    return True


def evaluate_stage_work_status(slug: str, work: str, ctx: ScanContext) -> str:
    lower = work.lower()

    if slug == "object-platform-independence":
        if "entitycardshell" in lower or "entity card layout" in lower:
            return "done" if _frontend_has(ctx, "entityCardShell") else "in_progress"
        if "objectentities" in lower:
            return "done" if _frontend_has(ctx, "ObjectEntityCardView") else "in_progress"
        if "notification" in lower:
            mapper = ctx.frontend.file_contents.get(
                "modules/notifications/navigation/notificationNavigationMapper.js",
                "",
            )
            if mapper and "notification_unavailable" in mapper and "universal_table_row_" not in mapper:
                return "done"
            return "in_progress"
        if "runtimereadgateway" in lower or "legacy fallback" in lower:
            gateway = ctx.frontend.file_contents.get(
                "modules/runtimeReadGateway/gateway/runtimeReadGateway.js",
                "",
            )
            if (
                gateway
                and "legacyTableReadProvider" not in gateway
                and "legacyViewReadProvider" not in gateway
                and "getLegacyTable" not in gateway
                and "canUseLegacyFallback" not in gateway
            ):
                return "done"
            return "in_progress"
        if "runtimelegacywriteadapter" in lower:
            return (
                "done"
                if not frontend_has_module(ctx.frontend, "modules/runtimeLegacyWriteAdapter")
                else "in_progress"
            )
        return "planned"

    if slug == "legacy-isolation":
        if "завершить перевод legacy страниц" in lower:
            if _legacy_portal_page_view_decoupled_from_universal_table_view(ctx):
                return "in_progress"
            return "planned"
        if "запретить создание" in lower or "ut blocks" in lower:
            return "done" if _legacy_block_creation_blocked(ctx) else "in_progress"
        if "block types" in lower and "placeholder" not in lower:
            return "done" if _legacy_block_types_isolated_from_new_scenarios(ctx) else "in_progress"
        if "placeholder" in lower or ("table blocks" in lower and "заменить" in lower):
            return "done" if _legacy_table_blocks_use_placeholder_boundary(ctx) else "in_progress"
        if ("bridges" in lower and ("navigation" in lower or "sidebar" in lower)) or (
            "переходы" in lower and "universal tables" in lower
        ) or (
            "ut bridges" in lower
        ):
            return "done" if _legacy_nav_sidebar_bridges_use_adapter(ctx) else "in_progress"
        if "portalpageview" in lower.replace(" ", "") and "universaltableview" in lower.replace(
            " ", ""
        ):
            return (
                "done"
                if _legacy_portal_page_view_decoupled_from_universal_table_view(ctx)
                else "in_progress"
            )
        return "planned"

    if slug == "legacy-removal":
        if "стратегию миграции" in lower or "миграции данных" in lower:
            return "planned"
        if "universaltable" in lower and "frontend" in lower:
            return "planned" if frontend_has_module(ctx.frontend, "modules/universalTable") else "done"
        return "planned"

    if slug == "object-table-ut-parity":
        if "чек-лист" in lower:
            return (
                "done"
                if _object_entity_card_checklist_complete(ctx)
                else "planned"
            )
        if "многоколоноч" in lower and "сортиров" in lower:
            # Post-MVP backlog: multi-column sort removed from Object Table MVP.
            return "planned"
        if "ссылка" in lower and "пол" in lower:
            return (
                "done"
                if _object_platform_link_field_type_complete(ctx)
                else "planned"
            )
        if "фильтрац" in lower and "связ" in lower:
            return (
                "done"
                if _object_table_relation_filter_complete(ctx)
                else "planned"
            )
        if "экспорт" in lower and "excel" in lower:
            return (
                "done"
                if _object_table_excel_export_complete(ctx)
                else "planned"
            )
        if "импорт" in lower and "excel" in lower:
            return (
                "done"
                if _object_table_excel_import_complete(ctx)
                else "planned"
            )
        return "planned"

    if slug == "runtime-foundation":
        if "object search" in lower:
            return (
                "done"
                if _object_search_complete(ctx)
                else "in_progress" if _object_search_has_progress(ctx) else "planned"
            )
        if "relation engine" in lower:
            return (
                "done"
                if _relation_engine_foundation_complete(ctx)
                else "in_progress" if _frontend_has(ctx, "relation") else "planned"
            )
        if "permission" in lower or "auth" in lower:
            return "planned"
        return "planned"

    if slug == "designer-foundation":
        if "единый источник" in lower and "pages.status" in lower:
            return "done" if _page_visibility_single_source_complete(ctx) else "in_progress"
        if "единый источник" in lower and "видимост" in lower:
            return "done" if _page_visibility_single_source_complete(ctx) else "in_progress"
        if "места публикации" in lower or (
            "публикац" in lower and "пользовательских меню" in lower
        ):
            return "done" if _page_publication_places_complete(ctx) else "in_progress"
        if "нормализац" in lower and "страниц" in lower:
            return "done" if _page_status_normalization_complete(ctx) else "in_progress"
        if "статус" in lower and "страниц" in lower:
            return "done" if _page_status_runtime_contract_complete(ctx) else "in_progress"
        if "корзин" in lower:
            return "done" if _platform_trash_bin_complete(ctx) else "in_progress"
        if "platformmodal" in lower.replace(" ", "") or (
            "ui framework" in lower and "модальн" in lower
        ):
            return "done" if _frontend_has(ctx, "PlatformModal") else "in_progress"
        if "preview" in lower:
            return (
                "done"
                if _studio_preview_tab_selector_ux_complete(ctx)
                and _studio_preview_mock_data_complete(ctx)
                and _studio_preview_demo_data_toolbar_badge_complete(ctx)
                else "in_progress"
            )
        if "публика" in lower:
            return "done" if _frontend_has(ctx, "ObjectTypePublishToMenuDialog") else "in_progress"
        if "studio" in lower and "runtime" in lower:
            return (
                "done"
                if _studio_object_type_header_icon_parity_complete(ctx)
                else "in_progress"
            )
        return "planned"

    if slug == "ai-native-layer":
        return "planned"

    if slug == "relation-field-type":
        if "контракт поля" in lower:
            return "done" if _relation_field_contract_complete(ctx) else "planned"
        if "studio" in lower:
            return "done" if _relation_field_studio_complete(ctx) else "planned"
        if "runtime api" in lower:
            return "done" if _relation_field_runtime_api_complete(ctx) else "planned"
        if "карточка объекта" in lower:
            return "done" if _relation_field_card_complete(ctx) else "planned"
        if "таблица объекта" in lower:
            return "done" if _relation_field_table_complete(ctx) else "planned"
        if "self-relation" in lower:
            return "done" if _relation_field_self_relation_complete(ctx) else "planned"
        if "спецификация" in lower and "task_subtask" in lower:
            return "done" if _relation_field_task_subtask_spec_complete(ctx) else "planned"
        if "доменные ограничения" in lower and "task_subtask" in lower:
            return "done" if _relation_field_task_subtask_domain_complete(ctx) else "planned"
        if "parent section" in lower:
            return "done" if _relation_field_parent_section_complete(ctx) else "planned"
        if "подзадачи" in lower and "relation engine" in lower:
            return "done" if _relation_field_subtasks_relation_engine_complete(ctx) else "planned"
        if "безопасное удаление" in lower and "подзадач" in lower:
            return (
                "done"
                if _object_engine_safe_hierarchy_delete_complete(ctx)
                else "planned"
            )
        if "массов" in lower and "выделен" in lower and "object table" in lower:
            return (
                "done"
                if _object_table_bulk_selection_complete(ctx)
                else "planned"
            )
        if "массов" in lower and "удален" in lower and "object table" in lower:
            return (
                "done"
                if _object_table_bulk_delete_complete(ctx)
                else "planned"
            )
        if "пользовательск" in lower and "представлен" in lower and "object table" in lower:
            return (
                "done"
                if _object_table_representation_chip_style_complete(ctx)
                else "planned"
            )
        if "терминолог" in lower and "иерархич" in lower:
            return (
                "done"
                if _hierarchy_relation_terminology_complete(ctx)
                else "planned"
            )
        if "viewenginerowmenu" in lower.replace(" ", "") or (
            "строковое меню" in lower and "object table" in lower
        ):
            return (
                "done"
                if _view_engine_row_menu_complete(ctx)
                else "planned"
            )
        if "tree view" in lower:
            return (
                "done"
                if _relation_field_object_table_tree_view_complete(ctx)
                else "planned"
            )
        if "фильтрац" in lower and "связ" in lower:
            return (
                "done"
                if _object_table_relation_filter_complete(ctx)
                else "planned"
            )
        return "planned"

    return "planned"


def _view_engine_row_menu_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    row_menu = frontend / "shared" / "viewEngine" / "components" / "ViewEngineRowMenu.jsx"
    title_chrome = (
        frontend / "shared" / "viewEngine" / "components" / "ViewEngineTitleFieldChrome.jsx"
    )
    table_view = frontend / "modules" / "objectViews" / "table" / "ObjectTableView.jsx"
    cell = frontend / "shared" / "viewEngine" / "ViewEngineCell.jsx"
    table = frontend / "shared" / "viewEngine" / "ViewEngineTable.jsx"
    row_menu_test = (
        frontend / "shared" / "viewEngine" / "components" / "ViewEngineRowMenu.test.js"
    )

    if not all(
        path.is_file()
        for path in (row_menu, title_chrome, table_view, cell, table, row_menu_test)
    ):
        return False

    row_menu_text = row_menu.read_text(encoding="utf-8", errors="ignore")
    table_view_text = table_view.read_text(encoding="utf-8", errors="ignore")
    cell_text = cell.read_text(encoding="utf-8", errors="ignore")
    table_text = table.read_text(encoding="utf-8", errors="ignore")

    return (
        "createChildMenuLabel" in row_menu_text
        and "Удалить" in row_menu_text
        and "rowActions" in table_view_text
        and "handleCreateSubtaskFromRow" in table_view_text
        and "rendererContext?.rowActions" in cell_text
        and "hoveredRowId" in table_text
        and "isRowHovered" in table_text
    )


def _object_platform_link_field_type_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    backend = ctx.repo_root / "backend" / "app" / "modules" / "platform"

    paths = (
        backend / "shared" / "enums.py",
        backend / "shared" / "link_value.py",
        backend / "runtime" / "entities" / "validators.py",
        frontend / "shared" / "fieldEditors" / "editors" / "LinkFieldEditor.jsx",
        frontend / "shared" / "fieldTypes" / "link" / "LinkValueRenderer.jsx",
        frontend / "shared" / "fieldTypes" / "link" / "linkUtils.js",
        frontend / "modules" / "designer" / "components" / "fields" / "CreateFieldModal.jsx",
        frontend / "shared" / "fieldEditors" / "fieldEditorRegistry.js",
    )

    if not all(path.is_file() for path in paths):
        return False

    enums_text = paths[0].read_text(encoding="utf-8", errors="ignore")
    link_value_text = paths[1].read_text(encoding="utf-8", errors="ignore")
    validators_text = paths[2].read_text(encoding="utf-8", errors="ignore")
    editor_text = paths[3].read_text(encoding="utf-8", errors="ignore")
    renderer_text = paths[4].read_text(encoding="utf-8", errors="ignore")
    link_utils_text = paths[5].read_text(encoding="utf-8", errors="ignore")
    create_field_text = paths[6].read_text(encoding="utf-8", errors="ignore")
    registry_text = paths[7].read_text(encoding="utf-8", errors="ignore")

    return (
        'LINK = "link"' in enums_text
        and "validate_link_field_value" in validators_text
        and "FieldType.LINK" in validators_text
        and "isBlockedLinkScheme" in link_utils_text
        and "resolveLinkHref" in link_utils_text
        and "noopener noreferrer" in renderer_text
        and "LinkFieldEditor" in editor_text
        and '"link"' in create_field_text
        and "FIELD_EDITOR_TYPE_LINK" in registry_text
        and "javascript" in link_value_text
    )


def _object_context_menu_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    paths = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectContextMenu"
        / "ObjectContextMenuTrigger.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectContextMenu"
        / "objectContextMenuActions.js",
        root
        / "frontend"
        / "src"
        / "portal"
        / "components"
        / "PortalObjectRuntimeHeader.jsx",
    )

    if not all(path.is_file() for path in paths):
        return False

    trigger = paths[0].read_text(encoding="utf-8", errors="ignore")
    actions = paths[1].read_text(encoding="utf-8", errors="ignore")
    header = paths[2].read_text(encoding="utf-8", errors="ignore")

    return (
        "object-context-menu-trigger__chevron" in trigger
        and "buildObjectContextMenuActions" in actions
        and "IMPORT_EXCEL" in actions
        and "EXPORT_EXCEL" in actions
        and "ObjectContextMenuTrigger" in header
    )


def _object_table_excel_export_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    paths = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "export"
        / "exportObjectTableToExcel.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "export"
        / "exportRuntimeQuery.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "export"
        / "objectTableExportBridge.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectContextMenu"
        / "objectContextMenuActions.js",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "ObjectTableView.jsx",
    )

    if not all(path.is_file() for path in paths):
        return False

    prepare_rows = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "export"
        / "prepareExportTableRows.js"
    )
    order_hierarchy_rows = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "export"
        / "orderExportHierarchyRows.js"
    )
    choice_utils = (
        root / "frontend" / "src" / "shared" / "fieldTypes" / "choice" / "choiceUtils.js"
    )
    format_value = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "export"
        / "formatExportCellValue.js"
    )

    if not all(
        path.is_file()
        for path in (prepare_rows, order_hierarchy_rows, choice_utils, format_value)
    ):
        return False

    export_service = paths[0].read_text(encoding="utf-8", errors="ignore")
    runtime_query = paths[1].read_text(encoding="utf-8", errors="ignore")
    bridge = paths[2].read_text(encoding="utf-8", errors="ignore")
    actions = paths[3].read_text(encoding="utf-8", errors="ignore")
    table_view = paths[4].read_text(encoding="utf-8", errors="ignore")
    prepare_rows_text = prepare_rows.read_text(encoding="utf-8", errors="ignore")
    order_hierarchy_rows_text = order_hierarchy_rows.read_text(
        encoding="utf-8", errors="ignore"
    )
    choice_utils_text = choice_utils.read_text(encoding="utf-8", errors="ignore")
    format_value_text = format_value.read_text(encoding="utf-8", errors="ignore")

    return (
        "exportObjectTableToExcel" in export_service
        and "OBJECT_TABLE_EXPORT_SCOPES" in export_service
        and "prepareExportTableRows" in export_service
        and "buildExportColumnsWithHierarchy" in export_service
        and "fetchExportTableRows" in export_service
        and "RUNTIME_QUERY_MAX_LIMIT" in runtime_query
        and "mapObjectViewQueryToRuntimeParams" in runtime_query
        and "Excel export fallback: runtime sort rejected" in runtime_query
        and "registerObjectTableExportProvider" in bridge
        and "runExportExcel" in actions
        and "exportObjectTableToExcel" in actions
        and "registerObjectTableExportProvider" in table_view
        and "catalog: query.catalog" in table_view
        and "prepareExportTableRows" in prepare_rows_text
        and "orderFlatRowsForHierarchyExport" in order_hierarchy_rows_text
        and 'label: "Иерархия"' in order_hierarchy_rows_text
        and "isTableRowNumberPresentationFieldKey" in order_hierarchy_rows_text
        and "buildObjectTableHierarchyDisplayRows" in order_hierarchy_rows_text
        and "readChoiceOptionsSource" in choice_utils_text
        and "fieldDef?.options" in choice_utils_text
        and "normalizeChoiceValue" in format_value_text
    )


def _object_table_excel_import_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    paths = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "runObjectExcelImport.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "objectTableImportBridge.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectContextMenu"
        / "objectContextMenuActions.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectExcelImport"
        / "ObjectExcelImportModal.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectExcelImport"
        / "ObjectExcelImportHost.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectExcelImport"
        / "ObjectExcelImportStepper.jsx",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "ObjectTableView.jsx",
        root
        / "frontend"
        / "src"
        / "portal"
        / "pages"
        / "PortalObjectDataPage.jsx",
    )

    if not all(path.is_file() for path in paths):
        return False

    service_paths = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "parseObjectExcelImportFile.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "buildObjectExcelColumnMappings.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "validateObjectExcelImportRows.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "normalizeObjectExcelImportValue.js",
    )

    if not all(path.is_file() for path in service_paths):
        return False

    run_import = paths[0].read_text(encoding="utf-8", errors="ignore")
    bridge = paths[1].read_text(encoding="utf-8", errors="ignore")
    actions = paths[2].read_text(encoding="utf-8", errors="ignore")
    modal = paths[3].read_text(encoding="utf-8", errors="ignore")
    host = paths[4].read_text(encoding="utf-8", errors="ignore")
    stepper = paths[5].read_text(encoding="utf-8", errors="ignore")
    table_view = paths[6].read_text(encoding="utf-8", errors="ignore")
    portal_page = paths[7].read_text(encoding="utf-8", errors="ignore")
    parse_file = service_paths[0].read_text(encoding="utf-8", errors="ignore")
    mappings = service_paths[1].read_text(encoding="utf-8", errors="ignore")
    validate_rows = service_paths[2].read_text(encoding="utf-8", errors="ignore")
    normalize_value = service_paths[3].read_text(encoding="utf-8", errors="ignore")

    return (
        "runObjectExcelImport" in run_import
        and "runtimeWriteGateway.createEntity" in run_import
        and "OBJECT_EXCEL_IMPORT_CHUNK_SIZE" in run_import
        and "registerObjectTableImportProvider" in bridge
        and "requestObjectExcelImportOpen" in bridge
        and "runImportExcel" in actions
        and "requestObjectExcelImportOpen" in actions
        and "PlatformModal" in modal
        and "validateObjectExcelImportRows" in modal
        and "ObjectExcelImportStepper" in modal
        and "FileSpreadsheet" in modal
        and "object-excel-import__dropzone" in modal
        and "object-excel-import__btn--primary" in modal
        and "object-excel-import__footer--end" in modal
        and "UNSUPPORTED_FILE_MESSAGE" in modal
        and "subtitle={objectName}" in modal
        and "FILE_STEP_CONTENT_STYLE" in modal
        and "Создание записей из Excel-файла" not in modal
        and "Поддерживается формат: .xlsx" not in modal
        and "canProceedFromFile" in modal
        and "Далее →" in modal
        and "designer-btn" not in modal
        and "ObjectExcelImportValueMappingPanel" in modal
        and "ObjectExcelImportDefaultValuesPanel" in modal
        and "importDefaultValues" in modal
        and "ObjectExcelImportReviewPanel" in modal
        and "Исправить сопоставление" in modal
        and "handleFixMapping" in modal
        and "buildImportValueMappings" in modal
        and "handleProceedFromValueMapping" in modal
        and 'step === "valueMapping"' in modal
        and "ObjectExcelImportHost" in host
        and 'marker: "①"' in stepper
        and "valueMapping" in stepper
        and 'marker: "⑤"' in stepper
        and "Импорт" in stepper
        and "subscribeObjectExcelImportOpen" in host
        and "registerObjectTableImportProvider" in table_view
        and "resolveImportableFields" in table_view
        and "ObjectExcelImportHost" in portal_page
        and "parseObjectExcelImportFile" in parse_file
        and "buildObjectExcelColumnMappings" in mappings
        and "validateObjectExcelImportRows" in validate_rows
        and "normalizeObjectExcelImportValue" in normalize_value
        and "resolveChoiceImportKey" in normalize_value
        and "applyImportValueMappings" in normalize_value
        and _object_table_excel_import_value_mapping_complete(ctx)
        and _object_table_excel_import_default_values_complete(ctx)
    )


def _object_table_excel_import_default_values_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    paths = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "defaultValues"
        / "buildImportDefaultValues.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "defaultValues"
        / "applyImportDefaultValues.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "defaultValues"
        / "validateImportDefaultValue.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectExcelImport"
        / "ObjectExcelImportDefaultValuesPanel.jsx",
    )

    if not all(path.is_file() for path in paths):
        return False

    build_defaults = paths[0].read_text(encoding="utf-8", errors="ignore")
    apply_defaults = paths[1].read_text(encoding="utf-8", errors="ignore")
    panel = paths[3].read_text(encoding="utf-8", errors="ignore")
    validate_rows = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "validateObjectExcelImportRows.js"
    ).read_text(encoding="utf-8", errors="ignore")
    ensure_rules = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "defaultValues"
        / "ensureImportDefaultFieldRules.js"
    ).read_text(encoding="utf-8", errors="ignore")
    validate_default_rules = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "defaultValues"
        / "validateImportDefaultFieldRules.js"
    ).read_text(encoding="utf-8", errors="ignore")
    resolve_current_user = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "defaultValues"
        / "resolveImportDefaultUserId.js"
    ).read_text(encoding="utf-8", errors="ignore")
    modal = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectExcelImport"
        / "ObjectExcelImportModal.jsx"
    ).read_text(encoding="utf-8", errors="ignore")

    return (
        "IMPORT_DATA_SOURCE_DEFAULT_VALUE" in build_defaults
        and "supportsImportDefaultValue" in build_defaults
        and "applyImportDefaultValues" in apply_defaults
        and "applyImportDefaultValues" in validate_rows
        and "ensureImportDefaultFieldRules" in ensure_rules
        and "validateImportDefaultFieldRules" in validate_default_rules
        and "IMPORT_DEFAULT_CURRENT_USER_VALUE" in resolve_current_user
        and "importContext" in modal
        and "Значение по умолчанию" in panel
        and "Колонка Excel" in panel
        and "IMPORT_DEFAULT_CURRENT_USER_LABEL" in panel
    )


def _object_table_excel_import_value_mapping_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    paths = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "valueMapping"
        / "collectUnresolvedImportValues.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "valueMapping"
        / "buildImportValueMappings.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "valueMapping"
        / "applyImportValueMappings.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "valueMapping"
        / "resolveImportValueCandidates.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "objectExcelImport"
        / "ObjectExcelImportValueMappingPanel.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "import"
        / "valueMapping"
        / "loadImportUsersForSelect.js",
    )

    if not all(path.is_file() for path in paths):
        return False

    load_users = paths[5].read_text(encoding="utf-8", errors="ignore")
    if "../../../../../api/authApi" not in load_users:
        return False

    collect = paths[0].read_text(encoding="utf-8", errors="ignore")
    apply = paths[2].read_text(encoding="utf-8", errors="ignore")
    panel = paths[4].read_text(encoding="utf-8", errors="ignore")

    return (
        "needsUserMapping" in collect
        and "VALUE_MAPPING_CANDIDATE_ERRORS" in collect
        and "IMPORT_VALUE_SKIP_OPTION" in apply
        and "withSkipMappingOption" in panel
        and "VALUE_MAPPING_SECTION_LABELS" in panel
    )


def _object_table_title_hierarchy_number_ux_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    paths = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "utils"
        / "resolveTitleFieldDisplayNumber.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "components"
        / "ViewEngineTitleFieldChrome.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "components"
        / "ViewEngineTitleHierarchyNumber.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "ViewEngineCell.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "viewEngineTable.css",
    )

    if not all(path.is_file() for path in paths):
        return False

    resolver = paths[0].read_text(encoding="utf-8", errors="ignore")
    chrome = paths[1].read_text(encoding="utf-8", errors="ignore")
    number = paths[2].read_text(encoding="utf-8", errors="ignore")
    cell = paths[3].read_text(encoding="utf-8", errors="ignore")
    css = paths[4].read_text(encoding="utf-8", errors="ignore")

    return (
        "hierarchyNumber" in resolver
        and "ViewEngineTitleHierarchyNumber" in chrome
        and "view-engine-title-hierarchy-number" in number
        and "resolveTitleFieldDisplayNumber" in cell
        and "displayNumber" in cell
        and "grid-template-columns: 24px" in css
        and "min-width: 36px" in css
        and "ViewEngineTitleExpandToggle" not in chrome
    )


def _object_table_selection_tree_toggle_ux_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    paths = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "components"
        / "ViewEngineSelectionCell.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "components"
        / "ViewEngineSelectionTreeToggle.jsx",
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "ViewEngineTable.jsx",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "ObjectTableView.jsx",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "hooks"
        / "useObjectTableHierarchyExpanded.js",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "hooks"
        / "useObjectTableHierarchyRows.js",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "services"
        / "resolveExpandableHierarchyRowIds.js",
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "viewEngineTable.css",
    )

    if not all(path.is_file() for path in paths):
        return False

    selection_cell = paths[0].read_text(encoding="utf-8", errors="ignore")
    tree_toggle = paths[1].read_text(encoding="utf-8", errors="ignore")
    table = paths[2].read_text(encoding="utf-8", errors="ignore")
    table_view = paths[3].read_text(encoding="utf-8", errors="ignore")
    expanded_hook = paths[4].read_text(encoding="utf-8", errors="ignore")
    hierarchy_hook = paths[5].read_text(encoding="utf-8", errors="ignore")
    expandable_resolver = paths[6].read_text(encoding="utf-8", errors="ignore")
    css = paths[7].read_text(encoding="utf-8", errors="ignore")

    return (
        "ViewEngineSelectionTreeToggle" in selection_cell
        and "onToggleTreeHeader" in selection_cell
        and "hasChildren" in tree_toggle
        and "hierarchyTree?.onToggleRowExpanded" in table
        and "expandableRowIds" in table_view
        and "expandAll" in expanded_hook
        and "collapseAll" in expanded_hook
        and "resolveExpandableHierarchyRowIds" in hierarchy_hook
        and "childrenByParent.entries" in expandable_resolver
        and "view-engine-table-selection-tree-toggle" in css
    )


def _object_table_studio_preview_parity_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    table_view = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "ObjectTableView.jsx"
    )
    views_bar = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "components"
        / "ObjectTableViewsBar.jsx"
    )
    row_menu = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "viewEngine"
        / "components"
        / "ViewEngineRowMenu.jsx"
    )
    preview_tab = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "tabs"
        / "RuntimePreviewTab.jsx"
    )
    css = root / "frontend" / "src" / "shared" / "viewEngine" / "viewEngineTable.css"

    if not all(path.is_file() for path in (table_view, views_bar, row_menu, preview_tab, css)):
        return False

    table_text = table_view.read_text(encoding="utf-8", errors="ignore")
    views_bar_text = views_bar.read_text(encoding="utf-8", errors="ignore")
    row_menu_text = row_menu.read_text(encoding="utf-8", errors="ignore")
    preview_tab_text = preview_tab.read_text(encoding="utf-8", errors="ignore")
    css_text = css.read_text(encoding="utf-8", errors="ignore")

    return (
        'mode === "studio-preview"' in table_text
        and "enabled: hierarchyDataEnabled" in table_text
        and "mode !== \"studio-preview\"" not in table_text
        and "readOnly: isPreviewMode" in table_text
        and "previewShowCreateButton" in views_bar_text
        and "readOnly" in row_menu_text
        and 'mode="studio-preview"' in preview_tab_text
    )


def _studio_preview_tab_selector_ux_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    preview_tab = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "tabs"
        / "RuntimePreviewTab.jsx"
    )
    tab_trigger = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "objectTypes"
        / "ObjectTypePreviewTabTrigger.jsx"
    )
    object_type_tabs = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "objectTypes"
        / "ObjectTypeTabs.jsx"
    )
    preview_context = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "context"
        / "ObjectTypePreviewTabContext.jsx"
    )
    context_block = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "preview"
        / "StudioPreviewContextBlock.jsx"
    )
    status_presentation = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "utils"
        / "resolveObjectViewTabStatusPresentation.js"
    )
    usage_resolver = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "utils"
        / "resolveObjectViewUsagePaths.js"
    )
    tabs = root / "frontend" / "src" / "modules" / "designer" / "constants" / "tabs.js"

    if not all(
        path.is_file()
        for path in (
            preview_tab,
            tab_trigger,
            object_type_tabs,
            preview_context,
            context_block,
            status_presentation,
            usage_resolver,
            tabs,
        )
    ):
        return False

    preview_text = preview_tab.read_text(encoding="utf-8", errors="ignore")
    context_text = context_block.read_text(encoding="utf-8", errors="ignore")
    tab_trigger_text = tab_trigger.read_text(encoding="utf-8", errors="ignore")
    object_type_tabs_text = object_type_tabs.read_text(encoding="utf-8", errors="ignore")
    usage_text = usage_resolver.read_text(encoding="utf-8", errors="ignore")
    tabs_text = tabs.read_text(encoding="utf-8", errors="ignore")

    return (
        "useObjectTypePreviewTab" in preview_text
        and "resolveObjectViewTabStatusPresentation" in preview_text
        and "resolveObjectViewTypeLabel" in preview_text
        and "designer-preview-tab__view-meta" in preview_text
        and "StudioPreviewTabDropdown" not in preview_text
        and 'mode="studio-preview"' in preview_text
        and "ObjectTypePreviewTabTrigger" in object_type_tabs_text
        and "Предпросмотр" in tab_trigger_text
        and "Используется:" in context_text
        and "Отображается:" not in context_text
        and "Статус:" not in context_text
        and "Студия" not in usage_text
        and "Офис" in usage_text
        and "GET /runtime/query" not in preview_text
        and '"runtime-preview", label: "Предпросмотр"' in tabs_text
    )


def _studio_preview_mock_data_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    query_hook = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "hooks"
        / "useObjectViewQuery.js"
    )
    view_host = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "ObjectViewHost.jsx"
    )
    table_view = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "ObjectTableView.jsx"
    )
    preview_tab = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "tabs"
        / "RuntimePreviewTab.jsx"
    )
    mock_rows = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "preview"
        / "buildObjectTabPreviewMockRows.js"
    )
    mock_list = (
        root
        / "frontend"
        / "src"
        / "shared"
        / "objectPlatform"
        / "services"
        / "preview"
        / "buildStudioPreviewListResult.js"
    )

    if not all(
        path.is_file()
        for path in (
            query_hook,
            view_host,
            table_view,
            preview_tab,
            mock_rows,
            mock_list,
        )
    ):
        return False

    query_text = query_hook.read_text(encoding="utf-8", errors="ignore")
    host_text = view_host.read_text(encoding="utf-8", errors="ignore")
    table_text = table_view.read_text(encoding="utf-8", errors="ignore")
    preview_text = preview_tab.read_text(encoding="utf-8", errors="ignore")

    return (
        "previewMode" in query_text
        and "buildStudioPreviewListResult" in query_text
        and 'previewMode: mode === "studio-preview"' in host_text
        and "previewHierarchyInstances" in table_text
        and "runtimeReadGateway.getObjectList" in query_text
    )


def _studio_preview_demo_data_toolbar_badge_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    views_bar = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "components"
        / "ObjectTableViewsBar.jsx"
    )
    preview_tab = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "tabs"
        / "RuntimePreviewTab.jsx"
    )
    toolbar_css = root / "frontend" / "src" / "shared" / "viewEngine" / "viewEngineTable.css"

    if not all(path.is_file() for path in (views_bar, preview_tab, toolbar_css)):
        return False

    views_bar_text = views_bar.read_text(encoding="utf-8", errors="ignore")
    preview_text = preview_tab.read_text(encoding="utf-8", errors="ignore")
    toolbar_css_text = toolbar_css.read_text(encoding="utf-8", errors="ignore")

    return (
        "{previewMode ? (" in views_bar_text
        and "view-engine-toolbar__demo-badge" in views_bar_text
        and "Демо-данные" in views_bar_text
        and "Отображаются демонстрационные данные." in views_bar_text
        and "view-engine-toolbar--with-demo-badge" in views_bar_text
        and "view-engine-toolbar__demo-badge" in toolbar_css_text
        and "designer-preview-tab__demo-note" not in preview_text
        and "Показаны демонстрационные данные" not in preview_text
    )


def _studio_preview_business_context_ux_complete(ctx: ScanContext) -> bool:
    """Backward-compatible alias for older analyzer imports."""
    return _studio_preview_tab_selector_ux_complete(ctx)


def _studio_object_type_header_icon_parity_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    icon_utils = root / "frontend" / "src" / "shared" / "icons" / "iconFileUtils.js"
    workspace_page = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "pages"
        / "ObjectTypeWorkspacePage.jsx"
    )
    workspace_header = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "objectTypes"
        / "ObjectTypeWorkspaceHeader.jsx"
    )
    portal_page = (
        root / "frontend" / "src" / "portal" / "pages" / "PortalObjectDataPage.jsx"
    )

    if not all(
        path.is_file()
        for path in (icon_utils, workspace_page, workspace_header, portal_page)
    ):
        return False

    icon_utils_text = icon_utils.read_text(encoding="utf-8", errors="ignore")
    workspace_page_text = workspace_page.read_text(encoding="utf-8", errors="ignore")
    workspace_header_text = workspace_header.read_text(encoding="utf-8", errors="ignore")
    portal_page_text = portal_page.read_text(encoding="utf-8", errors="ignore")

    return (
        "displayIcons.icon_type ?? baseIcons.icon_type" in icon_utils_text
        and "mergeObjectTypeAppearance" in workspace_page_text
        and "findObjectTypeNavigationItem" in workspace_page_text
        and "ObjectTypeIcon" in workspace_header_text
        and "mergeObjectTypeAppearance" in portal_page_text
    )


def _object_table_relation_filter_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    root = ctx.repo_root
    backend_files = (
        root
        / "backend"
        / "app"
        / "modules"
        / "platform"
        / "runtime"
        / "query"
        / "filter_operators.py",
        root
        / "backend"
        / "app"
        / "modules"
        / "platform"
        / "runtime"
        / "query"
        / "repository.py",
    )
    frontend_files = (
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "services"
        / "catalogFieldsForTableQueryUi.js",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "services"
        / "tableFilterOperators.js",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "viewSettings"
        / "RelationFilterPeerSelect.jsx",
        root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "viewSettings"
        / "ObjectTableFilterValueEditor.jsx",
    )

    if not all(path.is_file() for path in (*backend_files, *frontend_files)):
        return False

    filter_ops = backend_files[0].read_text(encoding="utf-8", errors="ignore")
    repository = backend_files[1].read_text(encoding="utf-8", errors="ignore")
    catalog_ui = frontend_files[0].read_text(encoding="utf-8", errors="ignore")
    table_ops = frontend_files[1].read_text(encoding="utf-8", errors="ignore")
    peer_select = frontend_files[2].read_text(encoding="utf-8", errors="ignore")
    value_editor = frontend_files[3].read_text(encoding="utf-8", errors="ignore")

    return (
        "RELATION_OPERATORS" in filter_ops
        and "FieldType.RELATION" in filter_ops
        and "_apply_relation_field_filter" in repository
        and "RuntimeRelationInstance" in repository
        and 'fieldType: "relation"' in catalog_ui
        and "peerObjectTypeKey" in catalog_ui
        and "RELATION_OPERATORS" in table_ops
        and "queryRuntimeEntities" in peer_select
        and "getRuntimeEntity" in peer_select
        and "RelationFilterPeerSelect" in value_editor
        and 'fieldType === "relation"' in value_editor
    )


def _object_entity_card_checklist_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    paths = (
        frontend / "shared" / "checklists" / "EntityChecklistPanel.jsx",
        frontend / "modules" / "objectEntities" / "components" / "ObjectEntityChecklist.jsx",
        frontend / "modules" / "objectEntities" / "components" / "ObjectEntityCardTabsBlock.jsx",
        frontend / "modules" / "objectEntities" / "services" / "objectEntityCardSectionsLayout.js",
    )

    if not all(path.is_file() for path in paths):
        return False

    panel_text = paths[0].read_text(encoding="utf-8", errors="ignore")
    adapter_text = paths[1].read_text(encoding="utf-8", errors="ignore")
    tabs_block_text = paths[2].read_text(encoding="utf-8", errors="ignore")
    layout_text = paths[3].read_text(encoding="utf-8", errors="ignore")

    return (
        "createChecklistItem" in panel_text
        and "completedCount" in panel_text
        and "resolveRuntimeEntityCommunicationIdentity" in adapter_text
        and "EntityChecklistPanel" in adapter_text
        and "ObjectEntityChecklist" in tabs_block_text
        and 'tabId === "checklist"' in tabs_block_text
        and "getChecklist" in tabs_block_text
        and "checklistCount" in tabs_block_text
        and '"checklist"' in layout_text
        and "OBJECT_ENTITY_INNER_TAB_IDS" in layout_text
    )


def _object_table_representation_chip_style_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    views_bar = (
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "components"
        / "ObjectTableViewsBar.jsx"
    )

    if not views_bar.is_file():
        return False

    source = views_bar.read_text(encoding="utf-8", errors="ignore")

    left_marker = 'className="view-engine-toolbar__left"'
    right_marker = 'className="view-engine-toolbar__right"'
    left_index = source.find(left_marker)
    right_index = source.find(right_marker)
    representations_on_right = (
        left_index >= 0
        and right_index > left_index
        and "pinnedRepresentationViews.map" in source[right_index:]
        and "pinnedRepresentationViews.map" not in source[left_index:right_index]
    )

    return (
        "renderRepresentationButton" in source
        and "view-engine-toolbar__quick-filter-btn" in source
        and representations_on_right
        and "view-engine-toolbar__views-group" not in source
        and "view-engine-toolbar__rep" not in source
    )


def _object_table_bulk_delete_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    paths = (
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "hooks"
        / "useObjectEntitiesBulkDelete.js",
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "services"
        / "objectEntityBulkDeletePresentation.js",
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "ObjectTableView.jsx",
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "components"
        / "ObjectTableBulkActionsBar.jsx",
    )

    if not all(path.is_file() for path in paths):
        return False

    hook_text = paths[0].read_text(encoding="utf-8", errors="ignore")
    presentation_text = paths[1].read_text(encoding="utf-8", errors="ignore")
    table_view_text = paths[2].read_text(encoding="utf-8", errors="ignore")
    bulk_bar_text = paths[3].read_text(encoding="utf-8", errors="ignore")

    labels_text = (
        frontend / "shared" / "relation" / "hierarchyLabels.js"
    ).read_text(encoding="utf-8", errors="ignore")
    scenario_modal_text = (
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "components"
        / "ObjectEntityDeleteScenarioModal.jsx"
    ).read_text(encoding="utf-8", errors="ignore")

    if not (frontend / "shared" / "relation" / "hierarchyLabels.js").is_file():
        return False

    return (
        "aggregateBulkDeletePreview" in presentation_text
        and "getRuntimeEntityDeletePreview" in hook_text
        and "deleteRuntimeEntityWithScenario" in hook_text
        and "useObjectEntitiesBulkDelete" in table_view_text
        and "handleBulkDeleteClick" in table_view_text
        and "mode={isBulkDeleteFlowActive ? \"bulk\" : \"single\"}" in table_view_text
        and "disabled={deleting" in bulk_bar_text
        and "Удаление…" in bulk_bar_text
        and "buildBulkDeleteLabels" in labels_text
        and "buildBulkDeleteStatsBadges" in labels_text
        and "ObjectEntityDeleteBulkBadges" in scenario_modal_text
    )


def _object_table_multi_sort_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    backend = ctx.repo_root / "backend" / "app" / "modules" / "platform" / "runtime" / "query"

    paths = (
        frontend / "modules" / "objectViews" / "services" / "sortRulesUtils.js",
        frontend / "modules" / "objectViews" / "table" / "components" / "ObjectTableActiveSortsBar.jsx",
        frontend / "modules" / "objectViews" / "table" / "hooks" / "useObjectTableSort.js",
        frontend / "shared" / "viewEngine" / "ViewEngineTable.jsx",
        backend / "repository.py",
        backend / "validators.py",
        backend / "test_sort_specs.py",
    )

    if not all(path.is_file() for path in paths):
        return False

    sort_utils = paths[0].read_text(encoding="utf-8", errors="ignore")
    sort_bar = paths[1].read_text(encoding="utf-8", errors="ignore")
    sort_hook = paths[2].read_text(encoding="utf-8", errors="ignore")
    table = paths[3].read_text(encoding="utf-8", errors="ignore")
    repository = paths[4].read_text(encoding="utf-8", errors="ignore")
    validators = paths[5].read_text(encoding="utf-8", errors="ignore")

    return (
        "getNextSortRulesAppend" in sort_utils
        and "resolveRuntimeListSorts" in sort_utils
        and "ObjectTableActiveSortsBar" in sort_bar
        and "reorderSort" in sort_hook
        and "sortRules" in table
        and "_apply_sort_specs" in repository
        and "parse_sort_specs" in validators
    )


def _object_table_bulk_selection_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    paths = (
        frontend / "modules" / "objectViews" / "table" / "hooks" / "useObjectTableSelection.js",
        frontend / "modules" / "objectViews" / "table" / "components" / "ObjectTableBulkActionsBar.jsx",
        frontend / "modules" / "objectViews" / "table" / "ObjectTableView.jsx",
        frontend / "shared" / "viewEngine" / "ViewEngineTable.jsx",
        frontend / "shared" / "viewEngine" / "components" / "ViewEngineSelectionCell.jsx",
    )

    if not all(path.is_file() for path in paths):
        return False

    hook_text = paths[0].read_text(encoding="utf-8", errors="ignore")
    table_view_text = paths[2].read_text(encoding="utf-8", errors="ignore")
    view_engine_text = paths[3].read_text(encoding="utf-8", errors="ignore")
    selection_cell_text = paths[4].read_text(encoding="utf-8", errors="ignore")

    return (
        "toggleAllVisible" in hook_text
        and "headerIndeterminate" in hook_text
        and "useObjectTableSelection" in table_view_text
        and "ObjectTableBulkActionsBar" in table_view_text
        and "rowSelection" in view_engine_text
        and "stopPropagation" in selection_cell_text
    )


def _hierarchy_relation_terminology_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    backend = ctx.repo_root / "backend" / "app" / "modules" / "platform"

    paths = (
        frontend / "shared" / "relation" / "hierarchyLabels.js",
        frontend / "shared" / "relation" / "hierarchyLabels.test.js",
        frontend / "modules" / "designer" / "components" / "relations" / "RelationHierarchyLabelsEditor.jsx",
        frontend / "modules" / "designer" / "components" / "tabs" / "RelationsTab.jsx",
        frontend / "modules" / "objectViews" / "table" / "components" / "ObjectEntityDeleteScenarioModal.jsx",
        backend / "shared" / "hierarchy_labels.py",
        ctx.repo_root / "backend" / "tests" / "test_hierarchy_labels.py",
        backend / "runtime" / "entities" / "schemas.py",
    )

    if not all(path.is_file() for path in paths):
        return False

    labels_js = (frontend / "shared" / "relation" / "hierarchyLabels.js").read_text(
        encoding="utf-8",
        errors="ignore",
    )
    relations_tab = (frontend / "modules" / "designer" / "components" / "tabs" / "RelationsTab.jsx").read_text(
        encoding="utf-8",
        errors="ignore",
    )
    scenario_modal = (
        frontend / "modules" / "objectViews" / "table" / "components" / "ObjectEntityDeleteScenarioModal.jsx"
    ).read_text(encoding="utf-8", errors="ignore")
    table_view = (frontend / "modules" / "objectViews" / "table" / "ObjectTableView.jsx").read_text(
        encoding="utf-8",
        errors="ignore",
    )
    schemas = (backend / "runtime" / "entities" / "schemas.py").read_text(
        encoding="utf-8",
        errors="ignore",
    )

    return (
        "suggestRussianHierarchyInflection" in labels_js
        and "DEFAULT_HIERARCHY_LABELS" in labels_js
        and "RelationHierarchyLabelsEditor" in relations_tab
        and "hierarchy_labels" in relations_tab
        and "hierarchyLabels" in scenario_modal
        and "createChildMenuLabel" in table_view
        and "hierarchy_labels" in schemas
        and "Подзадача" not in scenario_modal
    )


def _object_engine_safe_hierarchy_delete_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    backend_service = (
        ctx.repo_root
        / "backend"
        / "app"
        / "modules"
        / "platform"
        / "runtime"
        / "entities"
        / "hierarchy_delete.py"
    )
    backend_test = (
        ctx.repo_root
        / "backend"
        / "app"
        / "modules"
        / "platform"
        / "runtime"
        / "entities"
        / "test_hierarchy_delete.py"
    )
    frontend_hook = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "hooks"
        / "useObjectEntityDelete.js"
    )
    frontend_confirm = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "components"
        / "ObjectEntityDeleteConfirmModal.jsx"
    )
    frontend_scenario = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "components"
        / "ObjectEntityDeleteScenarioModal.jsx"
    )
    entities_api = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "runtimeWriteGateway"
        / "api"
        / "runtimeEntitiesApi.js"
    )

    if not all(
        path.is_file()
        for path in (
            backend_service,
            backend_test,
            frontend_hook,
            frontend_confirm,
            frontend_scenario,
            entities_api,
        )
    ):
        return False

    router_path = (
        ctx.repo_root
        / "backend"
        / "app"
        / "modules"
        / "platform"
        / "runtime"
        / "entities"
        / "router.py"
    )
    router_text = (
        router_path.read_text(encoding="utf-8", errors="ignore")
        if router_path.is_file()
        else ""
    )
    api_text = entities_api.read_text(encoding="utf-8", errors="ignore")
    hook_text = frontend_hook.read_text(encoding="utf-8", errors="ignore")
    table_view = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "table"
        / "ObjectTableView.jsx"
    )
    table_text = (
        table_view.read_text(encoding="utf-8", errors="ignore")
        if table_view.is_file()
        else ""
    )

    return (
        "delete-preview" in router_text
        and "delete_entity_with_scenario" in router_text
        and "getRuntimeEntityDeletePreview" in api_text
        and "deleteRuntimeEntityWithScenario" in api_text
        and "beginDelete" in hook_text
        and "onBeginDeleteEntity" in table_text
        and "ObjectEntityDeleteScenarioModal" in table_text
    )


def _relation_field_object_table_tree_view_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src"
    hook = (
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "hooks"
        / "useObjectTableHierarchyRows.js"
    )
    display_builder = (
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "services"
        / "buildObjectTableHierarchyDisplayRows.js"
    )
    relations_api = frontend / "api" / "runtimeRelationsApi.js"
    selection_cell = (
        frontend / "shared" / "viewEngine" / "components" / "ViewEngineSelectionCell.jsx"
    )
    table_engine = frontend / "shared" / "viewEngine" / "ViewEngineTable.jsx"
    display_test = (
        frontend
        / "modules"
        / "objectViews"
        / "table"
        / "services"
        / "buildObjectTableHierarchyDisplayRows.test.js"
    )
    table_view = frontend / "modules" / "objectViews" / "table" / "ObjectTableView.jsx"

    if not all(
        path.is_file()
        for path in (
            hook,
            display_builder,
            relations_api,
            selection_cell,
            table_engine,
            display_test,
            table_view,
        )
    ):
        return False

    hook_text = hook.read_text(encoding="utf-8", errors="ignore")
    api_text = relations_api.read_text(encoding="utf-8", errors="ignore")
    table_text = table_view.read_text(encoding="utf-8", errors="ignore")
    selection_text = selection_cell.read_text(encoding="utf-8", errors="ignore")
    table_engine_text = table_engine.read_text(encoding="utf-8", errors="ignore")

    return (
        "listRelationInstancesByKey" in hook_text
        and "buildObjectTableHierarchyDisplayRows" in hook_text
        and "listRelationInstancesByKey" in api_text
        and "useObjectTableHierarchyRows" in table_text
        and "hierarchyTree" in table_text
        and "ViewEngineSelectionTreeToggle" in selection_text
        and "hierarchyTree?.onToggleRowExpanded" in table_engine_text
        and "parent_row_id" not in hook_text
        and "parent_row_id" not in display_builder.read_text(encoding="utf-8", errors="ignore")
    )


def _relation_field_task_subtask_spec_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    spec_path = (
        ctx.repo_root / "docs" / "architecture" / "ADR_TASK_SUBTASK_RELATION_SPEC.md"
    )
    return spec_path.is_file()


def _relation_field_parent_section_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    frontend = ctx.repo_root / "frontend" / "src" / "modules" / "objectEntities"
    hook_path = frontend / "hooks" / "useObjectEntityParentContext.js"
    resolve_path = frontend / "services" / "resolveParentContextFromRelations.js"
    hierarchy_path = frontend / "services" / "hierarchyParentRelation.js"
    card_view_path = frontend / "ObjectEntityCardView.jsx"
    parent_test = frontend / "services" / "resolveParentContextFromRelations.test.js"

    if not all(
        path.is_file()
        for path in (
            hook_path,
            resolve_path,
            hierarchy_path,
            card_view_path,
            parent_test,
        )
    ):
        return False

    card_view_text = card_view_path.read_text(encoding="utf-8", errors="ignore")
    resolve_text = resolve_path.read_text(encoding="utf-8", errors="ignore")
    hook_text = hook_path.read_text(encoding="utf-8", errors="ignore")

    return (
        "useObjectEntityParentContext" in card_view_text
        and "parentState.parent" in card_view_text
        and "parentContext={null}" not in card_view_text
        and "listRuntimeEntityRelations" in hook_text
        and "findHierarchyParentInstance" in resolve_text
        and "resolveEntityTitle" in resolve_text
        and "parent_row_id" not in card_view_text
        and "parent_row_id" not in hook_text
        and "parent_row_id" not in resolve_text
    )


def _relation_field_subtasks_relation_engine_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    object_entities = ctx.repo_root / "frontend" / "src" / "modules" / "objectEntities"
    layout_fields = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "entity"
        / "getEntityCardLayoutFields.js"
    )
    profile = ctx.repo_root / "frontend" / "src" / "shared" / "relation" / "hierarchyRelationProfile.js"
    hierarchy_group = object_entities / "components" / "HierarchyChildRelationsGroup.jsx"
    related_entities = object_entities / "components" / "ObjectEntityRelatedEntities.jsx"
    display_labels = (
        ctx.repo_root / "frontend" / "src" / "shared" / "relation" / "hierarchyRelationDisplayLabels.js"
    )
    resolve_subtasks = object_entities / "services" / "resolveSubtasksFromRelations.js"
    map_groups = object_entities / "services" / "mapRelationInstancesToGroups.js"
    card_view = object_entities / "ObjectEntityCardView.jsx"
    card_hook = object_entities / "hooks" / "useObjectEntityCard.js"
    layout_test = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "objectViews"
        / "entity"
        / "getEntityCardLayoutFields.test.js"
    )
    subtasks_test = object_entities / "services" / "resolveSubtasksFromRelations.test.js"
    sections_layout = object_entities / "services" / "objectEntityCardSectionsLayout.js"
    tabs_block = object_entities / "components" / "ObjectEntityCardTabsBlock.jsx"

    required = (
        layout_fields,
        profile,
        hierarchy_group,
        related_entities,
        display_labels,
        resolve_subtasks,
        map_groups,
        card_view,
        card_hook,
        layout_test,
        subtasks_test,
        sections_layout,
        tabs_block,
    )

    if not all(path.is_file() for path in required):
        return False

    layout_text = layout_fields.read_text(encoding="utf-8", errors="ignore")
    profile_text = profile.read_text(encoding="utf-8", errors="ignore")
    hierarchy_text = hierarchy_group.read_text(encoding="utf-8", errors="ignore")
    related_text = related_entities.read_text(encoding="utf-8", errors="ignore")
    labels_text = display_labels.read_text(encoding="utf-8", errors="ignore")
    map_text = map_groups.read_text(encoding="utf-8", errors="ignore")
    card_view_text = card_view.read_text(encoding="utf-8", errors="ignore")
    card_hook_text = card_hook.read_text(encoding="utf-8", errors="ignore")
    sections_text = sections_layout.read_text(encoding="utf-8", errors="ignore")
    tabs_text = tabs_block.read_text(encoding="utf-8", errors="ignore")

    return (
        "isHierarchyRelationFieldForCard" in layout_text
        and "isHierarchySubtaskParentRelationDefinition" in profile_text
        and "resolveHierarchyChildUiLabels" in labels_text
        and "hierarchy-children" in map_text
        and "HierarchyChildRelationsGroup" in related_text
        and "Подзадачу" in hierarchy_text
        and "Убрать из подзадач" in hierarchy_text
        and "hierarchyChildGroups" in tabs_text
        and "beginCreateSubtask" in card_hook_text
        and "useObjectEntityRelations" in card_view_text
        and not (object_entities / "components" / "ObjectEntityCardSubtasksSection.jsx").is_file()
        and subtasks_test.is_file()
    )


def _relation_field_task_subtask_domain_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    constraints_path = (
        ctx.repo_root
        / "backend"
        / "app"
        / "modules"
        / "platform"
        / "runtime"
        / "relation_instances"
        / "task_subtask_constraints.py"
    )
    test_path = ctx.repo_root / "backend" / "tests" / "test_task_subtask_constraints.py"
    validators_path = (
        ctx.repo_root
        / "backend"
        / "app"
        / "modules"
        / "platform"
        / "runtime"
        / "relation_instances"
        / "validators.py"
    )

    if not constraints_path.is_file() or not test_path.is_file() or not validators_path.is_file():
        return False

    constraints_text = constraints_path.read_text(encoding="utf-8", errors="ignore")
    validators_text = validators_path.read_text(encoding="utf-8", errors="ignore")

    return (
        "validate_task_subtask_instance_create" in constraints_text
        and "would_create_task_subtask_cycle" in constraints_text
        and "validate_relation_instance_domain_rules" in validators_text
        and test_path.is_file()
    )


def _relation_field_self_relation_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    backend = ctx.repo_root / "backend" / "app" / "modules" / "platform"
    test_file = ctx.repo_root / "backend" / "tests" / "test_self_relation.py"
    modal = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "relations"
        / "CreateRelationDefinitionModal.jsx"
    )
    validators_path = backend / "runtime" / "relation_instances" / "validators.py"
    schemas_path = backend / "designer" / "relation_definitions" / "schemas.py"
    relation_field_service = backend / "runtime" / "relation_field" / "service.py"

    if not all(
        path.is_file()
        for path in (
            test_file,
            modal,
            validators_path,
            schemas_path,
            relation_field_service,
        )
    ):
        return False

    modal_text = modal.read_text(encoding="utf-8", errors="ignore")
    validators_text = validators_path.read_text(encoding="utf-8", errors="ignore")
    schemas_text = schemas_path.read_text(encoding="utf-8", errors="ignore")
    relation_field_text = relation_field_service.read_text(encoding="utf-8", errors="ignore")

    return (
        "test_relation_definition_allows_same_object_type" in test_file.read_text(encoding="utf-8", errors="ignore")
        and "String(item.id) !== sourceId" not in modal_text
        and "source_entity_id и target_entity_id не могут совпадать" not in validators_text
        and "не могут совпадать (MVP)" not in schemas_text
        and "target_entity_id не может совпадать с entity_id" not in relation_field_text
    )


def _relation_field_studio_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    from app.modules.platform_dashboard_analyzer.frontend_scan import frontend_has_marker

    studio_component = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "fields"
        / "RelationFieldSettings.jsx"
    )
    studio_utils = (
        ctx.repo_root
        / "frontend"
        / "src"
        / "modules"
        / "designer"
        / "components"
        / "fields"
        / "relationFieldFormUtils.js"
    )

    if not studio_component.is_file() or not studio_utils.is_file():
        return False

    component_text = studio_component.read_text(encoding="utf-8", errors="ignore")
    utils_text = studio_utils.read_text(encoding="utf-8", errors="ignore")

    return (
        "relation_key" in component_text
        and "RELATION_ROLE_OPTIONS" in utils_text
        and frontend_has_marker(ctx.frontend, "RelationFieldSettings")
        and frontend_has_marker(ctx.frontend, "relationFieldFormUtils")
    )


def _relation_field_table_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    from app.modules.platform_dashboard_analyzer.frontend_scan import frontend_has_marker

    frontend = ctx.repo_root / "frontend" / "src"
    table_renderer = frontend / "shared" / "fieldTypes" / "relation" / "RelationTableCellRenderer.jsx"
    enrichment_hook = (
        frontend / "modules" / "objectViews" / "table" / "hooks" / "useRelationTableEnrichment.js"
    )
    preload = (
        frontend
        / "modules"
        / "objectViews"
        / "services"
        / "preloadRelationFieldStatesForPage.js"
    )
    table_value_test = (
        frontend / "modules" / "objectViews" / "services" / "relationTableValue.test.js"
    )
    query_ui_test = (
        frontend
        / "modules"
        / "objectViews"
        / "services"
        / "catalogFieldsForTableQueryUi.test.js"
    )
    renderer_test = (
        frontend
        / "shared"
        / "fieldTypes"
        / "relation"
        / "RelationTableCellRenderer.test.js"
    )

    if (
        not table_renderer.is_file()
        or not enrichment_hook.is_file()
        or not preload.is_file()
        or not table_value_test.is_file()
        or not query_ui_test.is_file()
        or not renderer_test.is_file()
    ):
        return False

    renderer_text = table_renderer.read_text(encoding="utf-8", errors="ignore")
    preload_text = preload.read_text(encoding="utf-8", errors="ignore")
    view_cell = frontend / "shared" / "viewEngine" / "ViewEngineCell.jsx"

    if not view_cell.is_file():
        return False

    view_cell_text = view_cell.read_text(encoding="utf-8", errors="ignore")

    return (
        "RelationTableCellRenderer" in renderer_text
        and "onOpenRelatedEntity" in renderer_text
        and "getRelationFieldState" in preload_text
        and "RelationTableCellRenderer" in view_cell_text
        and "useRelationTableEnrichment" in enrichment_hook.read_text(encoding="utf-8", errors="ignore")
        and frontend_has_marker(ctx.frontend, "useRelationTableEnrichment")
        and "formatRelationTableDisplayLabel" in table_value_test.read_text(encoding="utf-8", errors="ignore")
        and "isRelationFieldType" in query_ui_test.read_text(encoding="utf-8", errors="ignore")
        and "onOpenRelatedEntity" in renderer_test.read_text(encoding="utf-8", errors="ignore")
    )


def _relation_field_card_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    from app.modules.platform_dashboard_analyzer.frontend_scan import frontend_has_marker

    frontend = ctx.repo_root / "frontend" / "src"
    renderer = frontend / "shared" / "fieldTypes" / "relation" / "RelationFieldRenderer.jsx"
    editor = frontend / "shared" / "fieldEditors" / "editors" / "RelationFieldEditor.jsx"
    cell = (
        frontend
        / "modules"
        / "objectEntities"
        / "components"
        / "RelationFieldCell.jsx"
    )
    api = frontend / "api" / "runtimeRelationFieldsApi.js"
    card_test = (
        frontend / "shared" / "fieldTypes" / "relation" / "relationFieldCardLabels.test.js"
    )

    if (
        not renderer.is_file()
        or not editor.is_file()
        or not cell.is_file()
        or not card_test.is_file()
    ):
        return False

    renderer_text = renderer.read_text(encoding="utf-8", errors="ignore")
    editor_text = editor.read_text(encoding="utf-8", errors="ignore")
    cell_text = cell.read_text(encoding="utf-8", errors="ignore")

    return (
        "RelationFieldRenderer" in renderer_text
        and "RelationFieldEditor" in editor_text
        and "useRelationFieldState" in cell_text
        and api.is_file()
        and frontend_has_marker(ctx.frontend, "runtimeRelationFieldsApi")
        and frontend_has_marker(ctx.frontend, "RelationFieldCell")
        and "resolveRelationFieldAddLabel" in card_test.read_text(encoding="utf-8", errors="ignore")
    )


def _relation_field_runtime_api_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    from app.modules.platform_dashboard_analyzer.backend_scan import backend_has_tests

    runtime = ctx.repo_root / "backend" / "app" / "modules" / "platform" / "runtime"
    service_path = runtime / "relation_field" / "service.py"
    router_path = runtime / "relation_field" / "router.py"
    if not service_path.is_file() or not router_path.is_file():
        return False

    service_text = service_path.read_text(encoding="utf-8", errors="ignore")
    router_text = router_path.read_text(encoding="utf-8", errors="ignore")

    return (
        "create_relation_field_link" in service_text
        and "delete_relation_field_link" in service_text
        and "get_relation_field_state" in service_text
        and "relation_instances_service.create_relation_instance" in service_text
        and "relation-fields" in router_text
        and backend_has_tests(ctx.backend, "relation_field")
    )


def _relation_field_contract_complete(ctx: ScanContext) -> bool:
    if ctx.repo_root is None:
        return False

    from app.modules.platform_dashboard_analyzer.backend_scan import backend_has_tests

    shared = ctx.repo_root / "backend" / "app" / "modules" / "platform" / "shared"
    enums_path = shared / "enums.py"
    contract_path = shared / "relation_field_contract.py"
    if not enums_path.is_file() or not contract_path.is_file():
        return False

    enums_text = enums_path.read_text(encoding="utf-8", errors="ignore")
    contract_text = contract_path.read_text(encoding="utf-8", errors="ignore")
    return (
        'RELATION = "relation"' in enums_text
        and "validate_relation_field_settings" in contract_text
        and backend_has_tests(ctx.backend, "relation_field")
    )


def resolve_stage_works(slug: str, phase_doc: dict) -> list[str]:
    canonical = STAGE_CANONICAL.get(slug, {}).get("works", [])
    doc_works = phase_doc.get("works", [])

    if not doc_works:
        return canonical

    if len(doc_works) > MAX_STAGE_WORKS:
        return canonical

    return doc_works


def resolve_stage_completion_criteria(slug: str, phase_doc: dict) -> list[str]:
    canonical = STAGE_CANONICAL.get(slug, {}).get("completion_criteria", [])
    return canonical


def _work_item_weight(slug: str, work: str, *, works: list[str]) -> int:
    slug_weights = STAGE_WORK_WEIGHTS.get(slug, {})
    if work in slug_weights:
        return slug_weights[work]

    if slug in STAGE_WORK_WEIGHTS and slug_weights:
        # Распределить оставшийся вес поровну между work items без явного веса.
        assigned = sum(slug_weights.values())
        unassigned = [item for item in works if item not in slug_weights]
        if unassigned and work in unassigned:
            remainder = max(0, 100 - assigned)
            return max(1, remainder // len(unassigned)) if remainder else 1

    return 1


def split_stage_works(
    slug: str,
    works: list[str],
    ctx: ScanContext,
) -> tuple[list[str], list[str], list[str], int | None]:
    if not works:
        return [], [], [], None

    completed: list[str] = []
    current: list[str] = []
    next_items: list[str] = []
    total_weight = 0
    done_weight = 0

    for work in works:
        weight = _work_item_weight(slug, work, works=works)
        total_weight += weight
        status = evaluate_stage_work_status(slug, work, ctx)
        if status == "done":
            completed.append(work)
            done_weight += weight
        elif status == "in_progress":
            current.append(work)
        else:
            next_items.append(work)

    readiness = round(done_weight / total_weight * 100) if total_weight else None
    return completed, current, next_items, readiness


def derive_stage_status(
    *,
    readiness: int | None,
    blockers: list[str],
    current_tasks: list[str],
    completed_count: int,
    total_count: int,
) -> str:
    if blockers and completed_count == 0:
        return "blocked"
    if readiness is not None and readiness >= 100:
        return "done"
    if current_tasks or (readiness is not None and readiness > 0):
        return "in_progress"
    if total_count == 0:
        return "planned"
    return "planned"
