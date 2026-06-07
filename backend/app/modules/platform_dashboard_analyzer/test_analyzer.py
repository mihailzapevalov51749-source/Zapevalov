from types import SimpleNamespace

from app.modules.platform_dashboard_analyzer.analyzer import analyze_components, analyze_stages
from app.modules.platform_dashboard_analyzer.refresh import build_scan_context
from app.modules.platform_dashboard_analyzer.stage_works import (
    STAGE_CANONICAL,
    _library_deep_link_supports_document_opening,
    _object_context_menu_complete,
    _object_tab_menu_in_tab_complete,
    _object_type_workspace_actions_menu_complete,
    _object_table_excel_export_complete,
    _object_table_excel_import_complete,
    _object_table_selection_tree_toggle_ux_complete,
    _object_table_studio_preview_parity_complete,
    _studio_preview_business_context_ux_complete,
    _studio_preview_tab_selector_ux_complete,
    _studio_preview_mock_data_complete,
    _studio_preview_demo_data_toolbar_badge_complete,
    _studio_object_type_header_icon_parity_complete,
    _object_table_title_hierarchy_number_ux_complete,
    _platform_modal_footer_layout_complete,
    _platform_modal_resize_handles_complete,
    _platform_accent_zones_complete,
    _platform_modal_help_complete,
    _platform_modal_standard_min_width_complete,
    _studio_object_view_draft_preview_sync_complete,
    _plan_view_renderer_routing_complete,
    _plan_view_publish_runtime_complete,
    _plan_self_relation_universal_complete,
    _office_plan_object_tab_contract_complete,
    _office_plan_view_hooks_complete,
    _plan_view_orphan_records_complete,
    _plan_view_target_ui_complete,
    _office_object_record_create_modal_resize_complete,
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


def test_relation_field_type_stage_marks_contract_done_when_implemented():
    ctx = build_scan_context()
    stages = analyze_stages(ctx, analyze_components(ctx))
    relation_stage = next(item for item in stages if item.slug == "relation-field-type")
    assert "Контракт поля" in relation_stage.completed_items
    assert "Studio" in relation_stage.completed_items
    assert "Runtime API" in relation_stage.completed_items
    assert "Карточка объекта" in relation_stage.completed_items
    assert "Таблица объекта" in relation_stage.completed_items
    assert "Self-relation support" in relation_stage.completed_items
    assert "Спецификация task_subtask" in relation_stage.completed_items
    assert "Доменные ограничения task_subtask" in relation_stage.completed_items
    assert "Parent Section через relation engine" in relation_stage.completed_items
    assert "Подзадачи через relation engine" in relation_stage.completed_items
    assert relation_stage.readiness == round(10 / 15 * 100)
    assert 'Интеграция со "Связанными записями"' in relation_stage.next_tasks


def test_relation_field_type_stage_readiness_is_zero_without_implementation():
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
            migration_phases={},
            debt_items=[],
            adr_items=[],
            roadmap_milestones=[],
        ),
    )

    stages = analyze_stages(ctx, analyze_components(ctx))
    relation_stage = next(item for item in stages if item.slug == "relation-field-type")

    assert relation_stage.readiness == 0
    assert relation_stage.status == "planned"
    assert len(relation_stage.completed_items) == 0
    assert len(relation_stage.next_tasks) == len(STAGE_CANONICAL["relation-field-type"]["works"])


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


def test_object_table_ut_parity_link_field_type_complete():
    ctx = build_scan_context()
    link_work = "Реализовать тип поля Ссылка"

    assert evaluate_stage_work_status("object-table-ut-parity", link_work, ctx) == "done"

    completed, current, next_items, readiness = split_stage_works(
        "object-table-ut-parity",
        resolve_stage_works("object-table-ut-parity", {}),
        ctx,
    )

    assert link_work in completed
    assert link_work not in next_items
    assert readiness == 24


def test_object_table_ut_parity_checklist_in_card_complete():
    ctx = build_scan_context()
    checklist_work = "Реализовать чек-листы в карточке"

    assert evaluate_stage_work_status("object-table-ut-parity", checklist_work, ctx) == "done"

    completed, current, next_items, readiness = split_stage_works(
        "object-table-ut-parity",
        resolve_stage_works("object-table-ut-parity", {}),
        ctx,
    )

    assert checklist_work in completed
    assert checklist_work not in next_items
    assert readiness == 24


def test_object_context_menu_complete():
    ctx = build_scan_context()
    assert _object_context_menu_complete(ctx) is True


def test_object_tab_menu_in_tab_complete():
    ctx = build_scan_context()
    assert _object_tab_menu_in_tab_complete(ctx) is True


def test_object_type_workspace_actions_menu_complete():
    ctx = build_scan_context()
    assert _object_type_workspace_actions_menu_complete(ctx) is True


def test_object_table_title_hierarchy_number_ux_complete():
    ctx = build_scan_context()
    assert _object_table_title_hierarchy_number_ux_complete(ctx) is True


def test_object_table_selection_tree_toggle_ux_complete():
    ctx = build_scan_context()
    assert _object_table_selection_tree_toggle_ux_complete(ctx) is True


def test_object_table_studio_preview_parity_complete():
    ctx = build_scan_context()
    assert _object_table_studio_preview_parity_complete(ctx) is True


def test_studio_preview_business_context_ux_complete():
    ctx = build_scan_context()
    assert _studio_preview_business_context_ux_complete(ctx) is True


def test_studio_preview_tab_selector_ux_complete():
    ctx = build_scan_context()
    assert _studio_preview_tab_selector_ux_complete(ctx) is True


def test_studio_preview_mock_data_complete():
    ctx = build_scan_context()
    assert _studio_preview_mock_data_complete(ctx) is True


def test_studio_preview_demo_data_toolbar_badge_complete():
    ctx = build_scan_context()
    assert _studio_preview_demo_data_toolbar_badge_complete(ctx) is True


def test_studio_object_type_header_icon_parity_complete():
    ctx = build_scan_context()
    assert _studio_object_type_header_icon_parity_complete(ctx) is True


def test_object_table_excel_export_complete():
    ctx = build_scan_context()
    excel_export_work = "Реализовать экспорт Excel"

    assert _object_table_excel_export_complete(ctx) is True
    assert evaluate_stage_work_status("object-table-ut-parity", excel_export_work, ctx) == "done"

    completed, current, next_items, readiness = split_stage_works(
        "object-table-ut-parity",
        resolve_stage_works("object-table-ut-parity", {}),
        ctx,
    )

    assert excel_export_work in completed
    assert excel_export_work not in next_items


def test_object_table_excel_import_complete():
    ctx = build_scan_context()
    excel_import_work = "Реализовать импорт Excel"

    assert _object_table_excel_import_complete(ctx) is True
    assert evaluate_stage_work_status("object-table-ut-parity", excel_import_work, ctx) == "done"

    completed, current, next_items, readiness = split_stage_works(
        "object-table-ut-parity",
        resolve_stage_works("object-table-ut-parity", {}),
        ctx,
    )

    assert excel_import_work in completed
    assert excel_import_work not in next_items
    assert readiness == 32


def test_object_table_ut_parity_relation_filter_complete():
    ctx = build_scan_context()
    relation_filter_work = "Реализовать фильтрацию по связям"

    assert evaluate_stage_work_status("object-table-ut-parity", relation_filter_work, ctx) == "done"

    completed, current, next_items, readiness = split_stage_works(
        "object-table-ut-parity",
        resolve_stage_works("object-table-ut-parity", {}),
        ctx,
    )

    assert relation_filter_work in completed
    assert relation_filter_work not in next_items
    assert readiness == 24


def test_object_table_ut_parity_multi_sort_deferred_post_mvp():
    ctx = build_scan_context()
    works = resolve_stage_works("object-table-ut-parity", {})
    assert len(works) == 16
    completed, current, next_items, readiness = split_stage_works(
        "object-table-ut-parity",
        works,
        ctx,
    )
    assert "Реализовать многоколоночную сортировку" in next_items
    assert "Реализовать многоколоночную сортировку" not in completed
    assert "Реализовать многоколоночную сортировку" not in current
    assert readiness == 24


def test_object_table_ut_parity_work_weights_sum_to_100():
    from app.modules.platform_dashboard_analyzer.stage_works import STAGE_WORK_WEIGHTS

    weights = STAGE_WORK_WEIGHTS["object-table-ut-parity"]
    assert sum(weights.values()) == 100


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
        if ("bridges" in work.lower() and "navigation" in work.lower())
        or "переходы" in work.lower()
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


def test_relation_field_type_tree_view_work_item_completed():
    ctx = build_scan_context()
    phase_doc = ctx.docs.migration_phases.get("relation-field-type", {})
    works = resolve_stage_works("relation-field-type", phase_doc)

    tree_work = next(
        work for work in works if "tree view" in work.lower()
    )

    status = evaluate_stage_work_status("relation-field-type", tree_work, ctx)

    assert status == "done"
    assert ctx.frontend.file_contents.get(
        "modules/objectViews/table/hooks/useObjectTableHierarchyRows.js",
        "",
    )
    assert "listRelationInstancesByKey" in ctx.frontend.file_contents.get(
        "api/runtimeRelationsApi.js",
        "",
    )


def test_platform_modal_footer_layout_complete():
    ctx = build_scan_context()
    assert _platform_modal_footer_layout_complete(ctx) is True


def test_platform_modal_resize_handles_complete():
    ctx = build_scan_context()
    assert _platform_modal_resize_handles_complete(ctx) is True


def test_platform_modal_standard_min_width_complete():
    ctx = build_scan_context()
    assert _platform_modal_standard_min_width_complete(ctx) is True


def test_platform_accent_zones_complete():
    ctx = build_scan_context()
    assert _platform_accent_zones_complete(ctx) is True


def test_platform_modal_help_complete():
    ctx = build_scan_context()
    assert _platform_modal_help_complete(ctx) is True


def test_studio_object_view_draft_preview_sync_complete():
    ctx = build_scan_context()
    assert _studio_object_view_draft_preview_sync_complete(ctx) is True


def test_plan_view_renderer_routing_complete():
    ctx = build_scan_context()
    assert _plan_view_renderer_routing_complete(ctx) is True


def test_plan_view_publish_runtime_complete():
    ctx = build_scan_context()
    assert _plan_view_publish_runtime_complete(ctx) is True


def test_plan_self_relation_universal_complete():
    ctx = build_scan_context()
    assert _plan_self_relation_universal_complete(ctx) is True


def test_office_plan_object_tab_contract_complete():
    ctx = build_scan_context()
    assert _office_plan_object_tab_contract_complete(ctx) is True


def test_office_plan_view_hooks_complete():
    ctx = build_scan_context()
    assert _office_plan_view_hooks_complete(ctx) is True


def test_plan_view_orphan_records_complete():
    ctx = build_scan_context()
    assert _plan_view_orphan_records_complete(ctx) is True


def test_plan_view_target_ui_complete():
    ctx = build_scan_context()
    assert _plan_view_target_ui_complete(ctx) is True


def test_office_object_record_create_modal_resize_complete():
    ctx = build_scan_context()
    assert _office_object_record_create_modal_resize_complete(ctx) is True


def test_object_plan_view_work_item_completed():
    ctx = build_scan_context()
    phase_doc = ctx.docs.migration_phases.get("relation-field-type", {})
    works = resolve_stage_works("relation-field-type", phase_doc)

    plan_work = next(
        work for work in works if "план" in work.lower() and "представлен" in work.lower()
    )

    status = evaluate_stage_work_status("relation-field-type", plan_work, ctx)

    assert status == "done"
    assert ctx.frontend.file_contents.get(
        "modules/objectViews/plan/ObjectPlanView.jsx",
        "",
    )
    assert 'resolvedViewType === "plan"' in ctx.frontend.file_contents.get(
        "modules/objectViews/ObjectViewHost.jsx",
        "",
    )


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
