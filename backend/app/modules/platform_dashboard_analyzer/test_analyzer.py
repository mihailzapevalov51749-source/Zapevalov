from types import SimpleNamespace

from app.modules.platform_dashboard_analyzer.analyzer import analyze_components, analyze_stages
from app.modules.platform_dashboard_analyzer.refresh import build_scan_context
from app.modules.platform_dashboard_analyzer.stage_works import (
    STAGE_CANONICAL,
    _library_deep_link_supports_document_opening,
    evaluate_stage_work_status,
    resolve_stage_works,
    split_stage_works,
)
from app.modules.platform_dashboard_analyzer.types import ScanContext


def test_analyze_components_uses_evidence_weights():
    ctx = ScanContext(
        repo_root=None,  # type: ignore[arg-type]
        backend=SimpleNamespace(
            module_paths={"modules/platform/designer/object_types"},
            router_markers={"object_types"},
            model_tables={"designer_object_types"},
            test_paths={"modules/platform/designer/object_types/test_service.py"},
            main_py_text="include_router(object_types_router)",
        ),
        frontend=SimpleNamespace(
            module_paths={"modules/designer"},
            file_contents={
                "modules/designer/pages/ObjectTypeWorkspacePage.jsx": "ObjectTypeWorkspacePage",
                "modules/designer/api/designerApi.js": "designerApi",
            },
            manifest_fallback_files=set(),
        ),
        docs=SimpleNamespace(
            status_tables={"object type": "IMPLEMENTED / ACTIVE"},
            migration_phases={},
            debt_items=[],
            adr_items=[],
            roadmap_milestones=[],
        ),
    )

    components = analyze_components(ctx)
    object_type = next(item for item in components if item.slug == "object-type")
    assert object_type.readiness is not None
    assert object_type.readiness >= 50
    assert object_type.dependencies == ["Объектная платформа"]


def test_analyze_stages_reads_migration_map_without_components():
    ctx = ScanContext(
        repo_root=None,  # type: ignore[arg-type]
        backend=SimpleNamespace(
            module_paths=set(),
            router_markers=set(),
            model_tables=set(),
            test_paths={"test_x.py"},
            main_py_text="",
        ),
        frontend=SimpleNamespace(
            module_paths={"modules/objectViews"},
            file_contents={},
            manifest_fallback_files=set(),
        ),
        docs=SimpleNamespace(
            status_tables={},
            migration_phases={
                "object-platform-independence": {
                    "goal": "Object Platform работает без UT",
                    "works": ["убрать fallback", "удалить legacy fallback", "проверить сценарии"],
                }
            },
            debt_items=[{"code": "AD-001", "title": "UT debt", "status": "PARTIAL", "risk": "HIGH"}],
            adr_items=[],
            roadmap_milestones=[],
        ),
    )
    components = analyze_components(ctx)
    stages = analyze_stages(ctx, components)
    first_stage = stages[0]
    assert first_stage.slug == "object-platform-independence"
    assert first_stage.completion_criteria == STAGE_CANONICAL["object-platform-independence"]["completion_criteria"]
    assert not any("Объектная платформа" in item for item in first_stage.completed_items)
    assert first_stage.blockers


def test_ai_native_stage_readiness_is_zero_without_implementation():
    ctx = ScanContext(
        repo_root=None,  # type: ignore[arg-type]
        backend=SimpleNamespace(
            module_paths=set(),
            router_markers=set(),
            model_tables=set(),
            test_paths=set(),
            main_py_text="",
        ),
        frontend=SimpleNamespace(
            module_paths=set(),
            file_contents={},
            manifest_fallback_files=set(),
        ),
        docs=SimpleNamespace(
            status_tables={},
            migration_phases={
                "ai-native-layer": {
                    "goal": "AI Context строится только вокруг Object Model",
                    "works": [],
                }
            },
            debt_items=[],
            adr_items=[],
            roadmap_milestones=[],
        ),
    )

    stages = analyze_stages(ctx, analyze_components(ctx))
    ai_stage = next(item for item in stages if item.slug == "ai-native-layer")

    assert ai_stage.readiness == 0
    assert ai_stage.status == "planned"
    assert len(ai_stage.completed_items) == 0
    assert len(ai_stage.current_tasks) == 0
    assert len(ai_stage.next_tasks) == len(STAGE_CANONICAL["ai-native-layer"]["works"])


def test_legacy_isolation_readiness_uses_code_guards_not_doc_markers():
    ctx = build_scan_context()
    phase_doc = ctx.docs.migration_phases.get("legacy-isolation", {})
    works = resolve_stage_works("legacy-isolation", phase_doc)

    completed, current, next_items, readiness = split_stage_works("legacy-isolation", works, ctx)

    assert readiness == 100
    assert len(completed) == 5
    assert len(current) == 0
    assert len(next_items) == 0

    for work in works:
        assert evaluate_stage_work_status("legacy-isolation", work, ctx) != "done" or work in completed


def test_legacy_placeholder_work_item_completed():
    ctx = build_scan_context()
    placeholder_work = next(
        work
        for work in resolve_stage_works(
            "legacy-isolation",
            ctx.docs.migration_phases.get("legacy-isolation", {}),
        )
        if "placeholder" in work.lower()
    )

    status = evaluate_stage_work_status("legacy-isolation", placeholder_work, ctx)
    registry = ctx.frontend.file_contents.get("modules/blocks/registry/blockRegistry.js", "")

    assert status == "done"
    assert ctx.frontend.file_contents.get(
        "shared/legacy/components/LegacyStorageBlockPlaceholderView.jsx",
        "",
    )
    assert ctx.frontend.file_contents.get(
        "shared/legacy/support/LegacyStorageSupportModeBoundary.jsx",
        "",
    )
    assert "LegacyStorageBlockPlaceholderView" in registry
    assert "table:" in registry
    assert "universal_table:" in registry
    assert "UniversalTableView" not in registry
    assert "modules/universalTable" not in registry


def test_legacy_nav_sidebar_bridges_work_item_completed():
    ctx = build_scan_context()
    bridges_work = next(
        work
        for work in resolve_stage_works(
            "legacy-isolation",
            ctx.docs.migration_phases.get("legacy-isolation", {}),
        )
        if "bridges" in work.lower() and "navigation" in work.lower()
    )

    status = evaluate_stage_work_status("legacy-isolation", bridges_work, ctx)

    assert status == "done"
    assert ctx.frontend.file_contents.get("shared/legacy/adapters/legacyStorageAdapter.js", "")
    assert "legacyStorageAdapter" in ctx.frontend.file_contents.get(
        "shared/shell/sidebar/usePlatformSidebarControls.js",
        "",
    )
    assert "legacyStorageAdapter" in ctx.frontend.file_contents.get(
        "modules/navigation/components/LeftSidebar.jsx",
        "",
    )
    assert "legacyStorageAdapter" in ctx.frontend.file_contents.get(
        "portal/PortalPageView.jsx",
        "",
    )
    assert "modules/universalTable/services/tableApi" not in ctx.frontend.file_contents.get(
        "shared/shell/sidebar/usePlatformSidebarControls.js",
        "",
    )


def test_legacy_portal_page_view_decoupled_work_item_completed():
    ctx = build_scan_context()
    decouple_work = next(
        work
        for work in resolve_stage_works(
            "legacy-isolation",
            ctx.docs.migration_phases.get("legacy-isolation", {}),
        )
        if "portalpageview" in work.lower().replace(" ", "")
        and "universaltableview" in work.lower().replace(" ", "")
    )

    status = evaluate_stage_work_status("legacy-isolation", decouple_work, ctx)
    portal_page_view = ctx.frontend.file_contents.get("portal/PortalPageView.jsx", "")
    system_route_view = ctx.frontend.file_contents.get(
        "shared/legacy/components/LegacyStorageSystemRouteView.jsx",
        "",
    )

    assert status == "done"
    assert system_route_view
    assert "LegacyStorageSupportModeBoundary" in system_route_view
    assert "LegacyStorageSystemRouteView" in portal_page_view
    assert "UniversalTableView" not in portal_page_view
    assert "modules/universalTable" not in portal_page_view


def test_runtime_foundation_relation_engine_work_item_completed():
    ctx = build_scan_context()
    phase_doc = ctx.docs.migration_phases.get("runtime-foundation", {})
    works = resolve_stage_works("runtime-foundation", phase_doc)

    relation_work = next(
        work for work in works if "relation engine" in work.lower()
    )

    status = evaluate_stage_work_status("runtime-foundation", relation_work, ctx)
    completed, current, next_items, readiness = split_stage_works(
        "runtime-foundation",
        works,
        ctx,
    )

    assert status == "done"
    assert relation_work in completed

    for work in works:
        lower = work.lower()
        if "permission" in lower or "auth" in lower:
            assert evaluate_stage_work_status("runtime-foundation", work, ctx) == "planned"


def test_library_deep_link_document_opening_evidence_accepts_constant_based_impl():
    ctx = build_scan_context()
    deeplink_source = ctx.frontend.file_contents.get(
        "modules/documentLibraries/utils/libraryDeepLink.js",
        "",
    )

    assert deeplink_source
    assert "LIBRARY_OPEN_DOCUMENT" in deeplink_source
    assert _library_deep_link_supports_document_opening(deeplink_source) is True
    assert _library_deep_link_supports_document_opening('params.set("open", value)') is True
    assert _library_deep_link_supports_document_opening("open=document") is True
    assert _library_deep_link_supports_document_opening("") is False


def test_runtime_foundation_object_search_work_item_completed():
    ctx = build_scan_context()
    phase_doc = ctx.docs.migration_phases.get("runtime-foundation", {})
    works = resolve_stage_works("runtime-foundation", phase_doc)

    search_work = next(work for work in works if "object search" in work.lower())

    status = evaluate_stage_work_status("runtime-foundation", search_work, ctx)
    completed, current, next_items, readiness = split_stage_works(
        "runtime-foundation",
        works,
        ctx,
    )

    assert status == "done"
    assert search_work in completed
    assert readiness == 40
    assert len(completed) == 2
    assert len(current) == 0
    assert len(next_items) == 3

    open_works = [
        work
        for work in works
        if evaluate_stage_work_status("runtime-foundation", work, ctx) != "done"
    ]
    assert len(open_works) == 3
    assert all(
        any(marker in work.lower() for marker in ("auth", "permission"))
        for work in open_works
    )
