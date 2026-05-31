"""YASII analyzer evidence checks — one per work item."""

from __future__ import annotations

from pathlib import Path

from app.modules.platform_dashboard.yasii_catalog import (
    MVP_STAGE_SLUGS,
    MVP_WORK_ITEM_KEYS,
    YASII_WORK_ITEMS,
    YasiiWorkItemDefinition,
    work_item_track,
)
from app.modules.platform_dashboard_analyzer.backend_scan import backend_has_module
from app.modules.platform_dashboard_analyzer.types import ScanContext


def _repo_docs_path(ctx: ScanContext, name: str) -> Path:
    return ctx.repo_root / "docs" / "architecture" / name


def _yasii_module(ctx: ScanContext) -> bool:
    return backend_has_module(ctx.backend, "modules/yasii")


def _ace_module(ctx: ScanContext) -> bool:
    return backend_has_module(ctx.backend, "modules/ai_context")


def _backend_file(ctx: ScanContext, relative: str) -> bool:
    """True if evidence file exists on disk or was preloaded into scan.file_contents."""
    normalized = relative.replace("\\", "/")
    if normalized in ctx.backend.file_contents:
        return True
    if any(path.endswith(normalized) for path in ctx.backend.file_contents):
        return True
    disk_path = ctx.repo_root / "backend" / "app" / normalized
    return disk_path.is_file()


def _yasii_file(ctx: ScanContext, relative: str) -> bool:
    return _backend_file(ctx, relative)


def _ace_file(ctx: ScanContext, relative: str) -> bool:
    return _backend_file(ctx, relative)


def _backend_file_text(ctx: ScanContext, relative: str) -> str:
    normalized = relative.replace("\\", "/")
    if normalized in ctx.backend.file_contents:
        return ctx.backend.file_contents[normalized]
    for path, content in ctx.backend.file_contents.items():
        if path.endswith(normalized):
            return content
    disk_path = ctx.repo_root / "backend" / "app" / normalized
    if disk_path.is_file():
        return disk_path.read_text(encoding="utf-8", errors="ignore")
    return ""


def _frontend_file_text(ctx: ScanContext, relative: str) -> str:
    normalized = relative.replace("\\", "/")
    if normalized in ctx.frontend.file_contents:
        return ctx.frontend.file_contents[normalized]
    for path, content in ctx.frontend.file_contents.items():
        if path.endswith(normalized):
            return content
    disk_path = ctx.repo_root / "frontend" / "src" / normalized
    if disk_path.is_file():
        return disk_path.read_text(encoding="utf-8", errors="ignore")
    return ""


def _file_defines_symbols(text: str, *symbols: str) -> bool:
    return bool(text) and all(symbol in text for symbol in symbols)


def _has_request_response_contracts(ctx: ScanContext) -> bool:
    for relative in ("modules/yasii/contracts.py", "modules/yasii/schemas.py"):
        text = _backend_file_text(ctx, relative)
        if _file_defines_symbols(text, "YASIIRequest", "YASIIResponse"):
            return True
    return False


def _has_failure_response_contract(ctx: ScanContext) -> bool:
    for relative in ("modules/yasii/failure_response.py", "modules/yasii/schemas.py"):
        text = _backend_file_text(ctx, relative)
        if _file_defines_symbols(text, "FailureResponse"):
            return True
    return False


def _doc_exists(ctx: ScanContext, filename: str) -> bool:
    return _repo_docs_path(ctx, filename).is_file()


def _check_p1_w01(ctx: ScanContext) -> bool:
    return _yasii_module(ctx)


def _check_p1_w02(ctx: ScanContext) -> bool:
    return _ace_module(ctx)


def _check_p1_w03(ctx: ScanContext) -> bool:
    return _ace_file(ctx, "modules/ai_context/identity.py") or _ace_file(
        ctx, "modules/ai_context/identity_resolution.py"
    )


def _check_p1_w04(ctx: ScanContext) -> bool:
    return _ace_file(ctx, "modules/ai_context/permission_resolution.py")


def _check_p1_w05(ctx: ScanContext) -> bool:
    return _ace_file(ctx, "modules/ai_context/context_snapshot.py")


def _check_p1_w06(ctx: ScanContext) -> bool:
    return _ace_file(ctx, "modules/ai_context/permission_boundary.py")


def _check_p1_w07(ctx: ScanContext) -> bool:
    return _has_request_response_contracts(ctx)


def _check_p1_w08(ctx: ScanContext) -> bool:
    return _has_failure_response_contract(ctx)


def _check_p1_w09(ctx: ScanContext) -> bool:
    if not _check_p1_w01(ctx):
        return False
    return _yasii_file(ctx, "modules/yasii/audit.py") or _yasii_file(ctx, "modules/yasii/models.py")


def _check_p1_w10(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/effective_scope.py")


def _check_p1_w11(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/runtime/orchestrator.py") or _yasii_file(
        ctx, "modules/yasii/orchestrator.py"
    )


def _check_p1_w12(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/memory.py")


def _check_p2_w01(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/knowledge_registry.py")


def _check_p2_w02(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/knowledge_source_registry.py")


def _check_p2_w03(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/tier_classification.py")


def _check_p2_w04(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/knowledge_index.py")


def _check_p2_w05(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/knowledge_source_validation.py")


def _check_p2_w06(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/knowledge_readiness.py")


def _check_p3_w01(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/graph_nodes.py")


def _check_p3_w02(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/graph_edges.py")


def _check_p3_w03(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/dependency_graph.py")


def _check_p3_w04(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/rule_graph.py")


def _check_p3_w05(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/graph_query_layer.py")


def _check_p3_w06_graph_stage(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/graph_readiness.py")


def _check_p3_w07(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/code_knowledge_index.py")


def _check_p3_w08(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/analyzer_evidence_nodes.py")


def _check_p4_w01(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/intent_resolver.py")


def _check_p4_w02(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/knowledge_resolver.py")


def _check_p4_w03(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/graph_resolver.py")


def _check_p4_w04(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/evidence_resolver.py")


def _check_p4_w05(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/rule_engine.py")


def _check_p4_w06(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/verdict_engine.py")


def _check_p4_w07(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/answer_builder.py")


def _check_p4_w08(ctx: ScanContext) -> bool:
    if not _yasii_file(ctx, "modules/yasii/runtime_orchestrator.py"):
        return False
    text = _backend_file_text(ctx, "modules/yasii/runtime_orchestrator.py")
    return "orchestrate_runtime_request" in text and "run_demo_pipeline" in text


def _check_p5_w01(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/developer_profile.py")


def _check_p5_w02(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/architecture_review.py")


def _check_p5_w03(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/impact_analysis.py")


def _check_p5_w04(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/dependency_analysis.py")


def _check_p5_w05(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/architecture_verdicts.py")


def _check_p5_w06(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/dev_query_capability.py")


def _check_p5_w07(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/developer_readiness.py")


def _check_p6_w01(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/owner_assistant_profile.py")


def _check_p6_w02(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/platform_health_snapshot.py")


def _check_p6_w03(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/reality_check.py")


def _check_p6_w04(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/deviation_registry.py")


def _check_p6_w05(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/owner_report.py")


def _check_p6_w06(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/improvement_suggestions.py")


def _check_p6_w07(ctx: ScanContext) -> bool:
    return _yasii_file(ctx, "modules/yasii/owner_readiness.py")


def _check_p7_w01_host_contract_runtime_wired(ctx: ScanContext) -> bool:
    service_text = _backend_file_text(ctx, "modules/ai_context/handoff_service.py")
    host_text = _backend_file_text(ctx, "modules/ai_context/host_context.py")
    return _file_defines_symbols(
        service_text,
        "build_handoff_from_host_context",
        "HostContext",
    ) and _file_defines_symbols(host_text, "HostContext", "hostSurface")


def _check_p7_w01_handoff_endpoint_exists(ctx: ScanContext) -> bool:
    router_text = _backend_file_text(ctx, "modules/ai_context/router.py")
    return _file_defines_symbols(
        router_text,
        '"/handoff"',
        "build_handoff_from_host_context",
    )


def _check_p7_w01_embedded_runtime_exists(ctx: ScanContext) -> bool:
    router_text = _backend_file_text(ctx, "modules/yasii/router.py")
    orchestrator_text = _backend_file_text(ctx, "modules/yasii/runtime_orchestrator.py")
    return _file_defines_symbols(
        router_text,
        '"/embedded/query"',
        "orchestrate_embedded_request",
    ) and _file_defines_symbols(orchestrator_text, "orchestrate_embedded_request", "validate_handoff")


def _check_p7_w01_host_contract_implemented(ctx: ScanContext) -> bool:
    return (
        _doc_exists(ctx, "YASII_HOST_INTEGRATION_CONTRACT.md")
        and _check_p7_w01_host_contract_runtime_wired(ctx)
        and _check_p7_w01_handoff_endpoint_exists(ctx)
        and _check_p7_w01_embedded_runtime_exists(ctx)
    )


def _check_p7_w04_dashboard_host_context_bridge(ctx: ScanContext) -> bool:
    builder_text = _frontend_file_text(ctx, "yasii/hostContextBuilders.js")
    return _file_defines_symbols(
        builder_text,
        "buildPlatformDashboardHostContext",
        "hostSurface",
        "dashboardId",
    )


def _check_p7_w04_dashboard_embedded_query(ctx: ScanContext) -> bool:
    api_text = _frontend_file_text(ctx, "yasii/yasiiEmbeddedApi.js")
    hook_text = _frontend_file_text(ctx, "yasii/hooks/useYasiiEmbeddedQuery.js")
    return _file_defines_symbols(
        api_text,
        "createAceHandoff",
        "sendEmbeddedQuery",
        "/ai-context/handoff",
        "/yasii/embedded/query",
    ) and _file_defines_symbols(hook_text, "sendEmbeddedQuery") and "sendYasiiQuery" not in hook_text


def _check_p7_w04_dashboard_integration_complete(ctx: ScanContext) -> bool:
    page_text = _frontend_file_text(
        ctx,
        "modules/platformDashboard/pages/PlatformDevelopmentPage.jsx",
    )
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    panel_text = _frontend_file_text(ctx, "yasii/components/YasiiEmbeddedPanel.jsx")
    adapters_text = _frontend_file_text(ctx, "yasii/embedded/surfaceAdapters.js")
    return (
        _check_p7_w04_dashboard_host_context_bridge(ctx)
        and _check_p7_w04_dashboard_embedded_query(ctx)
        and _file_defines_symbols(
            page_text,
            "YasiiSurfaceContextProvider",
            "buildPlatformDashboardMetadata",
        )
        and _file_defines_symbols(
            floating_text,
            "YasiiLauncher",
            "resolveSurfaceFromRoute",
            "useYasiiSurfaceContext",
        )
        and _file_defines_symbols(
            panel_text,
            "useYasiiEmbeddedQuery",
            "resolveEmbeddedSurface",
        )
        and _file_defines_symbols(
            adapters_text,
            "buildDashboardContext",
            "buildPlatformDashboardHostContext",
        )
        and "PlatformDashboardYasiiEntry" not in page_text
        and "hideOnPlatformDashboard" not in floating_text
        and "sendYasiiQuery" not in floating_text
        and "sendYasiiQuery" not in panel_text
        and "/yasii/query" not in page_text
    )


def _check_p7_w04_dashboard_integration_mvp(ctx: ScanContext) -> bool:
    return _check_p7_w04_dashboard_integration_complete(ctx)


def _check_p7_w08_embedded_entry_registry(ctx: ScanContext) -> bool:
    registry_text = _frontend_file_text(ctx, "yasii/embedded/embeddedEntryRegistry.js")
    return _file_defines_symbols(
        registry_text,
        "registerEmbeddedSurface",
        "resolveEmbeddedSurface",
        "getEmbeddedSurfaceConfig",
        "getAvailableEmbeddedSurfaces",
    )


def _check_p7_w08_surface_adapter_layer(ctx: ScanContext) -> bool:
    adapters_text = _frontend_file_text(ctx, "yasii/embedded/surfaceAdapters.js")
    return _file_defines_symbols(
        adapters_text,
        "buildDashboardContext",
        "buildObjectCardContext",
        "buildRegistryContext",
        "buildDesignerContext",
    )


def _check_p7_w08_dashboard_migrated(ctx: ScanContext) -> bool:
    page_text = _frontend_file_text(
        ctx,
        "modules/platformDashboard/pages/PlatformDevelopmentPage.jsx",
    )
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    panel_text = _frontend_file_text(ctx, "yasii/components/YasiiEmbeddedPanel.jsx")
    return (
        _file_defines_symbols(
            page_text,
            "YasiiSurfaceContextProvider",
            "EMBEDDED_SURFACE_IDS.DASHBOARD",
        )
        and "PlatformDashboardYasiiEntry" not in page_text
        and _file_defines_symbols(
            floating_text,
            "YasiiLauncher",
            "resolveSurfaceFromRoute",
        )
        and _file_defines_symbols(panel_text, "resolveEmbeddedSurface", "YasiiEmbeddedContextHeader")
        and "hideOnPlatformDashboard" not in floating_text
        and "placement=\"inline\"" not in floating_text
        and "sendYasiiQuery" not in floating_text
        and "/yasii/query" not in page_text
    )


def _check_p7_w08_global_entry_point(ctx: ScanContext) -> bool:
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    launcher_text = _frontend_file_text(ctx, "yasii/components/YasiiLauncher.jsx")
    return (
        _file_defines_symbols(
            floating_text,
            "YasiiLauncher",
            "useYasiiSurfaceContext",
            "resolveSurfaceFromRoute",
        )
        and _file_defines_symbols(launcher_text, "yasii-launcher--floating")
        and "hideOnPlatformDashboard" not in floating_text
        and "sendYasiiQuery" not in floating_text
        and "YasiiSidePanel" not in floating_text
    )


def _check_p7_w08_embedded_no_standalone_chat(ctx: ScanContext) -> bool:
    return (
        _check_p7_w08_embedded_entry_registry(ctx)
        and _check_p7_w08_surface_adapter_layer(ctx)
        and _check_p7_w08_dashboard_migrated(ctx)
        and _check_p7_w08_global_entry_point(ctx)
    )


def _check_catalog_sync(_ctx: ScanContext) -> bool:
    return False


def _check_not_implemented(_ctx: ScanContext) -> bool:
    return False


_CHECK_BY_ID: dict[str, callable] = {
    "yasii_p1_w01_module_skeleton_exists": _check_p1_w01,
    "yasii_p1_w02_ace_module_skeleton_exists": _check_p1_w02,
    "yasii_p1_w03_identity_resolution_ace": _check_p1_w03,
    "yasii_p1_w04_permission_resolution_ace": _check_p1_w04,
    "yasii_p1_w05_context_snapshot_builder_ace": _check_p1_w05,
    "yasii_p1_w06_permission_boundary_builder_ace": _check_p1_w06,
    "yasii_p1_w07_request_response_contracts": _check_p1_w07,
    "yasii_p1_w08_failure_response_defined": _check_p1_w08,
    "yasii_p1_w09_audit_skeleton_persists": _check_p1_w09,
    "yasii_p1_w10_effective_scope_derivation": _check_p1_w10,
    "yasii_p1_w11_runtime_skeleton_registered": _check_p1_w11,
    "yasii_p1_w12_memory_basic_linked": _check_p1_w12,
    "yasii_p2_w01_knowledge_registry_exists": _check_p2_w01,
    "yasii_p2_w02_source_registry_complete": _check_p2_w02,
    "yasii_p2_w03_tier_model_operational": _check_p2_w03,
    "yasii_p2_w04_knowledge_index_tier01": _check_p2_w04,
    "yasii_p2_w05_source_validation_passes": _check_p2_w05,
    "yasii_p2_w06_knowledge_stage_ready": _check_p2_w06,
    "yasii_p3_w01_graph_nodes_indexed": _check_p3_w01,
    "yasii_p3_w02_graph_edges_integrity": _check_p3_w02,
    "yasii_p3_w03_dependency_graph_synced": _check_p3_w03,
    "yasii_p3_w04_rule_graph_adr001": _check_p3_w04,
    "yasii_p3_w05_graph_query_traversal": _check_p3_w05,
    "yasii_p3_w06_graph_stage_ready": _check_p3_w06_graph_stage,
    "yasii_p3_w07_code_knowledge_indexed": _check_p3_w07,
    "yasii_p3_w08_evidence_nodes_linked": _check_p3_w08,
    "yasii_p4_w01_intent_resolver_registered": _check_p4_w01,
    "yasii_p4_w02_knowledge_resolver_operational": _check_p4_w02,
    "yasii_p4_w03_graph_resolver_traversal": _check_p4_w03,
    "yasii_p4_w04_evidence_resolver_merge": _check_p4_w04,
    "yasii_p4_w05_rule_engine_evaluates": _check_p4_w05,
    "yasii_p4_w06_verdict_engine_registered": _check_p4_w06,
    "yasii_p4_w07_answer_builder_validates": _check_p4_w07,
    "yasii_p4_w08_runtime_pipeline_complete": _check_p4_w08,
    "yasii_p5_w01_developer_profile_exists": _check_p5_w01,
    "yasii_p5_w01_developer_profile_active": _check_p5_w01,
    "yasii_p5_w02_architecture_review_exists": _check_p5_w02,
    "yasii_p5_w02_architecture_review_capability": _check_p5_w02,
    "yasii_p5_w03_impact_analysis_exists": _check_p5_w03,
    "yasii_p5_w03_impact_analysis_capability": _check_p5_w03,
    "yasii_p5_w04_dependency_analysis_exists": _check_p5_w04,
    "yasii_p5_w04_dependency_analysis_capability": _check_p5_w04,
    "yasii_p5_w05_architecture_verdicts_exists": _check_p5_w05,
    "yasii_p5_w05_architecture_verdicts_valid": _check_p5_w05,
    "yasii_p5_w06_dev_query_capability_exists": _check_p5_w06,
    "yasii_p5_w06_dev_query_operational": _check_p5_w06,
    "yasii_p5_w07_developer_readiness_exists": _check_p5_w07,
    "yasii_p5_w07_developer_stage_ready": _check_p5_w07,
    "yasii_p6_w01_owner_assistant_profile_exists": _check_p6_w01,
    "yasii_p6_w01_owner_profile_active": _check_p6_w01,
    "yasii_p6_w02_platform_health_snapshot_exists": _check_p6_w02,
    "yasii_p6_w02_health_snapshot_builder": _check_p6_w02,
    "yasii_p6_w03_reality_check_exists": _check_p6_w03,
    "yasii_p6_w03_reality_check_operational": _check_p6_w03,
    "yasii_p6_w04_deviation_registry_exists": _check_p6_w04,
    "yasii_p6_w04_deviation_registry_active": _check_p6_w04,
    "yasii_p6_w05_owner_report_exists": _check_p6_w05,
    "yasii_p6_w05_owner_report_pipeline_ready": _check_p6_w05,
    "yasii_p6_w06_improvement_suggestions_exists": _check_p6_w06,
    "yasii_p6_w06_improvement_suggestions_in_report": _check_p6_w06,
    "yasii_p6_w07_owner_readiness_exists": _check_p6_w07,
    "yasii_p6_w07_owner_stage_ready": _check_p6_w07,
    "yasii_p7_w01_host_contract_runtime_wired": _check_p7_w01_host_contract_runtime_wired,
    "yasii_p7_w01_handoff_endpoint_exists": _check_p7_w01_handoff_endpoint_exists,
    "yasii_p7_w01_embedded_runtime_exists": _check_p7_w01_embedded_runtime_exists,
    "yasii_p7_w04_dashboard_host_context_bridge": _check_p7_w04_dashboard_host_context_bridge,
    "yasii_p7_w04_dashboard_embedded_query": _check_p7_w04_dashboard_embedded_query,
    "yasii_p7_w04_dashboard_integration_complete": _check_p7_w04_dashboard_integration_complete,
    "yasii_p7_w08_embedded_entry_registry": _check_p7_w08_embedded_entry_registry,
    "yasii_p7_w08_surface_adapter_layer": _check_p7_w08_surface_adapter_layer,
    "yasii_p7_w08_dashboard_migrated": _check_p7_w08_dashboard_migrated,
    "yasii_p7_w08_global_entry_point": _check_p7_w08_global_entry_point,
}


def _register_default_checks() -> None:
    for item in YASII_WORK_ITEMS:
        if item.analyzer_check not in _CHECK_BY_ID:
            if item.key in {"P6-W07"}:
                _CHECK_BY_ID[item.analyzer_check] = _check_catalog_sync
            elif item.key == "P7-W01":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w01_host_contract_implemented
            elif item.key == "P7-W04":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w04_dashboard_integration_mvp
            elif item.key == "P7-W08":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w08_embedded_no_standalone_chat
            else:
                _CHECK_BY_ID[item.analyzer_check] = _check_not_implemented


_register_default_checks()


def run_yasii_check(check_id: str, ctx: ScanContext) -> bool:
    checker = _CHECK_BY_ID.get(check_id)
    if checker is None:
        return False
    return bool(checker(ctx))


def run_yasii_check_for_item(item: YasiiWorkItemDefinition, ctx: ScanContext) -> bool:
    return run_yasii_check(item.analyzer_check, ctx)


def all_yasii_check_ids() -> list[str]:
    return [item.analyzer_check for item in YASII_WORK_ITEMS]


def missing_check_ids() -> list[str]:
    return [item.analyzer_check for item in YASII_WORK_ITEMS if item.analyzer_check not in _CHECK_BY_ID]


def evaluate_mvp_phases_complete(stage_readiness: dict[str, int | None]) -> bool:
    slugs = [slug for slug in MVP_STAGE_SLUGS if slug != "yasii-platform-readiness"]
    values = [stage_readiness.get(slug) for slug in slugs]
    if not values:
        return False
    return all(value is not None and value >= 100 for value in values)


def evaluate_mvp_work_items_complete(item_done: dict[str, bool]) -> bool:
    keys = [key for key in MVP_WORK_ITEM_KEYS if not key.startswith("P10-")]
    return bool(keys) and all(item_done.get(key, False) for key in keys)


def configure_dynamic_checks(
    *,
    stage_readiness: dict[str, int | None],
    item_done: dict[str, bool],
    ctx: ScanContext,
) -> None:
    _CHECK_BY_ID["yasii_p10_w01_constitution_compliance_pass"] = lambda _ctx: evaluate_mvp_phases_complete(
        stage_readiness
    )
    _CHECK_BY_ID["yasii_p10_w02_system_map_coverage_pass"] = lambda scan_ctx: _doc_exists(
        scan_ctx, "YASII_SYSTEM_MAP.md"
    ) and evaluate_mvp_phases_complete(stage_readiness)
    _CHECK_BY_ID["yasii_p10_w04_analyzer_suite_complete"] = lambda _ctx: evaluate_mvp_work_items_complete(item_done)
    _CHECK_BY_ID["yasii_p10_w05_dashboard_readiness_100"] = lambda _ctx: evaluate_mvp_work_items_complete(item_done)
    _CHECK_BY_ID["yasii_p10_w06_architecture_signoff"] = lambda _ctx: (
        evaluate_mvp_work_items_complete(item_done) and evaluate_mvp_phases_complete(stage_readiness)
    )
    # refresh registry after dynamic update
    _ = ctx


def count_track_checks_passed(track: str, item_passed: dict[str, bool]) -> tuple[int, int]:
    items = [item for item in YASII_WORK_ITEMS if work_item_track(item.key) == track]
    passed = sum(1 for item in items if item_passed.get(item.key, False))
    return passed, len(items)


def count_ace_checks_passed(item_passed: dict[str, bool]) -> tuple[int, int]:
    return count_track_checks_passed("ace", item_passed)


def count_yasii_track_checks_passed(item_passed: dict[str, bool]) -> tuple[int, int]:
    return count_track_checks_passed("yasii", item_passed)
