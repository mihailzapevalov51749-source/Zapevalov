from app.modules.platform_dashboard_analyzer.backend_scan import (
    backend_has_module,
    backend_has_router_marker,
    backend_has_table,
    backend_has_tests,
)
from app.modules.platform_dashboard_analyzer.frontend_scan import (
    frontend_has_marker,
    frontend_has_module,
    frontend_uses_real_api,
)
from app.modules.platform_dashboard_analyzer.stage_works import (
    STAGE_CANONICAL,
    _object_search_complete,
    derive_stage_status,
    resolve_stage_completion_criteria,
    resolve_stage_works,
    split_stage_works,
)
from app.modules.platform_dashboard_analyzer.types import ComponentAnalysis, EvidenceItem, ScanContext, StageAnalysis


COMPONENT_DEFINITIONS = [
    {
        "slug": "object-platform",
        "title": "Объектная платформа",
        "description": "Центральный контур object platform: Designer, Runtime и publish.",
        "doc_keys": ["object platform", "object type", "runtime entity"],
        "dependencies": ["Типы объектов", "Публикация", "Записи объектов"],
        "debt_keywords": ["universal table", "dual sot", "legacy", "object platform"],
    },
    {
        "slug": "object-type",
        "title": "Типы объектов",
        "description": "Конструктор типов объектов в Studio.",
        "doc_keys": ["object type"],
        "dependencies": ["Объектная платформа"],
        "debt_keywords": ["view state", "designer", "object type"],
    },
    {
        "slug": "publish",
        "title": "Публикация",
        "description": "Публикация типов объектов из Studio в runtime.",
        "doc_keys": ["publish", "designer publish"],
        "dependencies": ["Типы объектов", "Записи объектов"],
        "debt_keywords": ["publish", "designer / runtime", "legacy block"],
    },
    {
        "slug": "runtime-entity",
        "title": "Записи объектов",
        "description": "Runtime Entity API для чтения и записи объектов.",
        "doc_keys": ["runtime entity"],
        "dependencies": ["Типы объектов", "Публикация"],
        "debt_keywords": ["runtime", "universal table", "read gateway", "dual sot"],
    },
    {
        "slug": "object-card",
        "title": "Карточки объектов",
        "description": "Object Entity Card для работы с записями.",
        "doc_keys": ["object card", "entity card", "object entity card"],
        "dependencies": ["Записи объектов", "Типы объектов"],
        "debt_keywords": ["entity card", "universal table", "notification"],
    },
    {
        "slug": "relations",
        "title": "Связи объектов",
        "description": "Связи между объектами в Studio и runtime.",
        "doc_keys": ["relation"],
        "dependencies": ["Типы объектов", "Записи объектов", "Карточки объектов"],
        "debt_keywords": ["relation"],
    },
    {
        "slug": "search",
        "title": "Поиск",
        "description": "Поиск по объектам и записям платформы.",
        "doc_keys": ["search"],
        "dependencies": ["Записи объектов", "Объектная платформа"],
        "debt_keywords": ["search"],
    },
    {
        "slug": "permissions",
        "title": "Права доступа",
        "description": "Права доступа к объектам, полям и действиям.",
        "doc_keys": ["permission", "permissions"],
        "dependencies": ["Объектная платформа", "Записи объектов"],
        "debt_keywords": ["permission", "access"],
    },
    {
        "slug": "ai-context",
        "title": "ИИ-контекст",
        "description": "AI Context поверх object platform.",
        "doc_keys": ["ai context", "ai-native"],
        "dependencies": ["Объектная платформа", "Связи объектов", "Поиск"],
        "debt_keywords": ["ai context", "ai-native"],
    },
]

STAGE_DEFINITIONS = [
    {
        "slug": "object-platform-independence",
        "title": "Переход на объектную платформу",
        "order_index": 1,
        "component_slugs": ["object-platform", "runtime-entity", "object-card", "publish"],
        "blocker_codes": ["AD-001"],
    },
    {
        "slug": "legacy-isolation",
        "title": "Изоляция старого контура",
        "order_index": 2,
        "component_slugs": ["object-platform"],
        "blocker_codes": ["AD-002", "AD-003"],
    },
    {
        "slug": "legacy-removal",
        "title": "Удаление старой модели",
        "order_index": 3,
        "component_slugs": ["object-platform", "runtime-entity"],
        "blocker_codes": ["AD-001"],
    },
    {
        "slug": "runtime-foundation",
        "title": "Новая рабочая среда",
        "order_index": 4,
        "component_slugs": ["runtime-entity", "permissions", "search"],
        "blocker_codes": [],
    },
    {
        "slug": "designer-foundation",
        "title": "Новый конструктор",
        "order_index": 5,
        "component_slugs": ["object-type", "publish"],
        "blocker_codes": [],
    },
    {
        "slug": "ai-native-layer",
        "title": "Встроенный ИИ",
        "order_index": 6,
        "component_slugs": ["ai-context", "relations", "search"],
        "blocker_codes": [],
    },
]


def _doc_status_for_component(ctx: ScanContext, doc_keys: list[str]) -> str | None:
    for key in doc_keys:
        for name, status in ctx.docs.status_tables.items():
            if key in name:
                return status
    return None


def _component_checks(ctx: ScanContext, slug: str) -> list[EvidenceItem]:
    backend = ctx.backend
    frontend = ctx.frontend

    checks: list[tuple[str, str, int, bool]] = []

    if slug == "object-platform":
        checks = [
            ("backend_model", "Backend", 20, backend_has_module(backend, "modules/platform")),
            ("api_endpoint", "API", 20, backend_has_router_marker(backend, "platform_designer_router") and backend_has_router_marker(backend, "platform_runtime_router")),
            ("frontend_api", "Frontend API", 15, frontend_uses_real_api(frontend, "platformDashboardApi") or frontend_has_marker(frontend, "designerApi")),
            ("ui_integration", "UI", 20, frontend_has_module(frontend, "modules/designer") and frontend_has_module(frontend, "modules/objectViews")),
            ("persistence", "Persistence", 15, backend_has_table(backend, "runtime_entities") and backend_has_table(backend, "designer_object_types")),
            ("tests", "Tests", 10, backend_has_tests(backend, "platform", "object_view")),
        ]
    elif slug == "object-type":
        checks = [
            ("backend_model", "Backend", 20, backend_has_module(backend, "modules/platform/designer/object_types")),
            ("api_endpoint", "API", 20, backend_has_router_marker(backend, "object_types")),
            ("frontend_api", "Frontend API", 15, frontend_has_marker(frontend, "designerApi")),
            ("ui_integration", "UI", 20, frontend_has_marker(frontend, "ObjectTypeWorkspacePage")),
            ("persistence", "Persistence", 15, backend_has_table(backend, "designer_object_types")),
            ("tests", "Tests", 10, backend_has_tests(backend, "object_types")),
        ]
    elif slug == "publish":
        checks = [
            ("backend_model", "Backend", 20, backend_has_module(backend, "modules/platform/designer/publish")),
            ("api_endpoint", "API", 20, backend_has_router_marker(backend, "publish")),
            ("frontend_api", "Frontend API", 15, frontend_has_marker(frontend, "publishObjectType")),
            ("ui_integration", "UI", 20, frontend_has_marker(frontend, "ObjectTypePublishToMenuDialog")),
            ("persistence", "Persistence", 15, backend_has_table(backend, "designer_publish_records")),
            ("tests", "Tests", 10, backend_has_tests(backend, "publish")),
        ]
    elif slug == "runtime-entity":
        checks = [
            ("backend_model", "Backend", 20, backend_has_module(backend, "modules/platform/runtime/entities")),
            ("api_endpoint", "API", 20, backend_has_router_marker(backend, "platform_runtime_router")),
            ("frontend_api", "Frontend API", 15, frontend_has_marker(frontend, "runtimeReadGateway")),
            ("ui_integration", "UI", 20, frontend_has_marker(frontend, "ObjectViewHost")),
            ("persistence", "Persistence", 15, backend_has_table(backend, "runtime_entities")),
            ("tests", "Tests", 10, backend_has_tests(backend, "runtime")),
        ]
    elif slug == "object-card":
        checks = [
            ("backend_model", "Backend", 20, backend_has_module(backend, "modules/comments") and backend_has_module(backend, "modules/notes")),
            ("api_endpoint", "API", 20, backend_has_router_marker(backend, "comments_router") and backend_has_router_marker(backend, "notes_router")),
            ("frontend_api", "Frontend API", 15, frontend_has_marker(frontend, "useObjectEntityCard")),
            ("ui_integration", "UI", 20, frontend_has_marker(frontend, "ObjectEntityCardView")),
            ("persistence", "Persistence", 15, backend_has_table(backend, "runtime_entities")),
            ("tests", "Tests", 10, backend_has_tests(backend, "object_entity")),
        ]
    elif slug == "relations":
        checks = [
            ("backend_model", "Backend", 20, backend_has_module(backend, "modules/platform/designer/relation_definitions")),
            ("api_endpoint", "API", 20, backend_has_module(backend, "modules/platform/runtime/relation_instances")),
            ("frontend_api", "Frontend API", 15, frontend_has_marker(frontend, "relation")),
            ("ui_integration", "UI", 20, frontend_has_marker(frontend, "ObjectEntityCardView")),
            ("persistence", "Persistence", 15, backend_has_table(backend, "runtime_relation_instances")),
            ("tests", "Tests", 10, backend_has_tests(backend, "relation")),
        ]
    elif slug == "search":
        runtime_search = backend_has_module(backend, "modules/platform/runtime/search")
        platform_search = backend_has_module(backend, "modules/platform/search")
        checks = [
            ("backend_model", "Backend", 20, runtime_search and platform_search),
            (
                "api_endpoint",
                "API",
                20,
                runtime_search and "platform_search_router" in backend.main_py_text,
            ),
            (
                "frontend_api",
                "Frontend API",
                15,
                frontend_has_marker(frontend, "searchPlatform")
                and frontend_has_marker(frontend, "searchExecutionAdapter"),
            ),
            (
                "ui_integration",
                "UI",
                20,
                frontend_has_marker(frontend, "SearchResultsOverlay")
                and frontend_has_marker(frontend, "useHeaderSearchController"),
            ),
            ("persistence", "Persistence", 15, backend_has_table(backend, "runtime_entities")),
            ("tests", "Tests", 10, backend_has_tests(backend, "search")),
        ]
        checks.append(("object_search", "Object Search", 0, _object_search_complete(ctx)))
    elif slug == "permissions":
        checks = [
            ("backend_model", "Backend", 20, "permission" in backend.main_py_text.lower()),
            ("api_endpoint", "API", 20, False),
            ("frontend_api", "Frontend API", 15, frontend_has_marker(frontend, "access")),
            ("ui_integration", "UI", 20, False),
            ("persistence", "Persistence", 15, False),
            ("tests", "Tests", 10, backend_has_tests(backend, "permission")),
        ]
    else:  # ai-context
        checks = [
            ("backend_model", "Backend", 20, backend_has_module(backend, "modules/quality_issues")),
            ("api_endpoint", "API", 20, backend_has_router_marker(backend, "quality_issues_router")),
            ("frontend_api", "Frontend API", 15, frontend_has_marker(frontend, "prepareQualityIssueFix")),
            ("ui_integration", "UI", 20, False),
            ("persistence", "Persistence", 15, backend_has_table(backend, "quality_issues")),
            ("tests", "Tests", 10, backend_has_tests(backend, "ai_fix")),
        ]

    no_fallback = slug != "object-platform" or "platformDevelopmentManifest" not in frontend.file_contents.get(
        "modules/platformDashboard/pages/PlatformDevelopmentPage.jsx",
        "",
    )
    checks.append(("fallback_removed", "Fallback удалён", 0, no_fallback))

    return [EvidenceItem(key=key, label=label, weight=weight, passed=passed) for key, label, weight, passed in checks]


def _derive_component_status(ctx: ScanContext, slug: str, readiness: int | None, evidence: list[EvidenceItem]) -> str:
    doc_status = _doc_status_for_component(ctx, next(item["doc_keys"] for item in COMPONENT_DEFINITIONS if item["slug"] == slug))
    if doc_status:
        if "BLOCKED" in doc_status:
            return "blocked"
        if "DONE" in doc_status or "VERIFIED" in doc_status or "IMPLEMENTED" in doc_status:
            return "done" if readiness and readiness >= 80 else "review"
        if "IN PROGRESS" in doc_status or "ACTIVE" in doc_status or "PARTIAL" in doc_status:
            return "in_progress"

    if readiness is None:
        return "planned"
    if readiness >= 85:
        return "done"
    if readiness >= 50:
        return "in_progress"
    if any(item.key == "fallback_removed" and not item.passed for item in evidence):
        return "review"
    return "planned"


def _debt_for_component(ctx: ScanContext, definition: dict) -> list[str]:
    keywords = [definition["slug"].replace("-", " "), definition["title"].lower()]
    keywords.extend(definition.get("debt_keywords", []))

    items: list[str] = []
    for debt in ctx.docs.debt_items:
        if debt["status"] == "RESOLVED":
            continue
        haystack = f"{debt['code']} {debt['title']}".lower()
        if any(keyword in haystack for keyword in keywords):
            items.append(f"{debt['code']}: {debt['title']} ({debt['status']})")
    return items


def analyze_components(ctx: ScanContext) -> list[ComponentAnalysis]:
    results: list[ComponentAnalysis] = []

    for definition in COMPONENT_DEFINITIONS:
        evidence = _component_checks(ctx, definition["slug"])
        weighted = [item for item in evidence if item.weight > 0]
        if not weighted:
            readiness = None
        else:
            score = sum(item.weight for item in weighted if item.passed)
            readiness = score

        passed = [item.display_passed for item in evidence if item.passed and item.weight > 0]
        failed = [item.display_failed for item in evidence if not item.passed and item.weight > 0]
        status = _derive_component_status(ctx, definition["slug"], readiness, evidence)

        results.append(
            ComponentAnalysis(
                slug=definition["slug"],
                title=definition["title"],
                description=definition["description"],
                status=status,
                readiness=readiness,
                evidence=evidence,
                completed_items=passed,
                remaining_items=failed,
                dependencies=definition.get("dependencies", []),
                architecture_debt=_debt_for_component(ctx, definition),
            )
        )

    return results


def _active_blockers(ctx: ScanContext, codes: list[str]) -> list[str]:
    blockers: list[str] = []
    for debt in ctx.docs.debt_items:
        if debt["code"] not in codes:
            continue
        if debt["status"] not in {"RESOLVED"}:
            blockers.append(f"{debt['code']}: {debt['title']} ({debt['status']})")
    return blockers


def analyze_stages(ctx: ScanContext, components: list[ComponentAnalysis]) -> list[StageAnalysis]:
    results: list[StageAnalysis] = []
    current_assigned = False

    for definition in STAGE_DEFINITIONS:
        phase_doc = ctx.docs.migration_phases.get(definition["slug"], {})
        works = resolve_stage_works(definition["slug"], phase_doc)
        completion_criteria = resolve_stage_completion_criteria(definition["slug"], phase_doc)
        goal = phase_doc.get("goal") or STAGE_CANONICAL.get(definition["slug"], {}).get("goal", "")

        blockers = _active_blockers(ctx, definition["blocker_codes"])

        completed_tasks, current_tasks, next_tasks, readiness = split_stage_works(
            definition["slug"],
            works,
            ctx,
        )

        status = derive_stage_status(
            readiness=readiness,
            blockers=blockers,
            current_tasks=current_tasks,
            completed_count=len(completed_tasks),
            total_count=len(works),
        )

        current_position = False
        if status == "in_progress" and not current_assigned:
            current_position = True
            current_assigned = True

        results.append(
            StageAnalysis(
                slug=definition["slug"],
                title=definition["title"],
                description=goal or f"Этап {definition['title']}.",
                status=status,
                readiness=readiness,
                order_index=definition["order_index"],
                current_position=current_position,
                evidence=[],
                completed_items=completed_tasks,
                remaining_items=next_tasks,
                current_tasks=current_tasks,
                next_tasks=next_tasks,
                completion_criteria=completion_criteria,
                blockers=blockers,
            )
        )

    return results
