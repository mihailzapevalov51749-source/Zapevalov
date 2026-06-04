from app.modules.platform_dashboard_analyzer.backend_scan import (
    backend_has_module,
    backend_has_table,
)
from app.modules.platform_dashboard_analyzer.frontend_scan import frontend_has_marker, frontend_has_module
from app.modules.platform_dashboard_analyzer.types import ScanContext
MAX_STAGE_WORKS = 8

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
            "Запретить создание новых UT blocks",
            "Убрать table/universal_table block types из новых сценариев — already done",
            "Заменить старые table blocks на placeholder",
            "Убрать UT bridges из navigation/sidebar",
            "Отделить PortalPageView от UniversalTableView",
        ],
        "completion_criteria": [
            "Legacy явно отделён от object platform",
            "Новые порталы не предлагают legacy как основной путь",
        ],
    },
    "legacy-removal": {
        "works": [
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
        if "запретить создание" in lower or "ut blocks" in lower:
            return "done" if _legacy_block_creation_blocked(ctx) else "in_progress"
        if "block types" in lower and "placeholder" not in lower:
            return "done" if _legacy_block_types_isolated_from_new_scenarios(ctx) else "in_progress"
        if "placeholder" in lower or ("table blocks" in lower and "заменить" in lower):
            return "done" if _legacy_table_blocks_use_placeholder_boundary(ctx) else "in_progress"
        if ("bridges" in lower and ("navigation" in lower or "sidebar" in lower)) or (
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
        if "universaltable" in lower and "frontend" in lower:
            return "planned" if frontend_has_module(ctx.frontend, "modules/universalTable") else "done"
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
        if "platformmodal" in lower.replace(" ", "") or (
            "ui framework" in lower and "модальн" in lower
        ):
            return "done" if _frontend_has(ctx, "PlatformModal") else "in_progress"
        if "публика" in lower or "preview" in lower:
            return "done" if _frontend_has(ctx, "ObjectTypePublishToMenuDialog") else "in_progress"
        if "studio" in lower and "runtime" in lower:
            return "in_progress"
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
        return "planned"

    return "planned"


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

    for work in works:
        status = evaluate_stage_work_status(slug, work, ctx)
        if status == "done":
            completed.append(work)
        elif status == "in_progress":
            current.append(work)
        else:
            next_items.append(work)

    readiness = round(len(completed) / len(works) * 100)
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
