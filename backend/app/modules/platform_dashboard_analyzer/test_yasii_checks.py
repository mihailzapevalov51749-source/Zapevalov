from pathlib import Path
from types import SimpleNamespace

from app.modules.platform_dashboard.yasii_sync import classify_embedded_ai_stage_work_items
from app.modules.platform_dashboard_analyzer.refresh import build_scan_context
from app.modules.platform_dashboard_analyzer.types import ScanContext
from app.modules.platform_dashboard_analyzer.yasii_checks import run_yasii_check


def _ctx_with_yasii_files(file_contents: dict[str, str]) -> ScanContext:
    return ScanContext(
        app_root=Path("/tmp/app"),
        backend=SimpleNamespace(file_contents=file_contents),
        frontend=SimpleNamespace(file_contents={}, manifest_fallback_files=set()),
        docs=SimpleNamespace(
            status_tables={},
            migration_phases={},
            debt_items=[],
            adr_items=[],
            roadmap_milestones=[],
        ),
    )


def test_p11_w01_knowledge_corpus_integration_passes():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p11_w01_knowledge_corpus_integration", ctx) is True


def test_p12_w01_development_intelligence_passes():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p12_w01_development_intelligence", ctx) is True


def test_p13_w02_platform_governance_model_passes():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p13_w02_platform_governance_model", ctx) is True


def test_p13_w03_dual_readiness_model_passes():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p13_w03_dual_readiness_model", ctx) is True


def test_p1_w01_through_w06_checks_pass_with_repo_files():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w01_module_skeleton_exists", ctx) is True
    assert run_yasii_check("yasii_p1_w02_ace_module_skeleton_exists", ctx) is True
    assert run_yasii_check("yasii_p1_w03_identity_resolution_ace", ctx) is True
    assert run_yasii_check("yasii_p1_w04_permission_resolution_ace", ctx) is True
    assert run_yasii_check("yasii_p1_w05_context_snapshot_builder_ace", ctx) is True
    assert run_yasii_check("yasii_p1_w06_permission_boundary_builder_ace", ctx) is True


def test_p1_w06_check_passes_with_permission_boundary_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w06_permission_boundary_builder_ace", ctx) is True


def test_p1_w07_check_passes_with_repo_contracts():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w07_request_response_contracts", ctx) is True


def test_p1_w10_check_passes_with_repo_effective_scope():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w10_effective_scope_derivation", ctx) is True


def test_p1_w11_check_passes_with_repo_runtime_orchestrator():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w11_runtime_skeleton_registered", ctx) is True


def test_p1_w09_check_passes_with_repo_audit_skeleton():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w09_audit_skeleton_persists", ctx) is True


def test_p1_w08_check_passes_with_repo_failure_response():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w08_failure_response_defined", ctx) is True


def test_p1_w12_check_passes_with_repo_memory_layer():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w12_memory_basic_linked", ctx) is True


def test_p2_w01_check_passes_with_repo_knowledge_registry():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p2_w01_knowledge_registry_exists", ctx) is True


def test_p2_w02_check_passes_with_repo_knowledge_source_registry():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p2_w02_source_registry_complete", ctx) is True


def test_p2_w03_check_passes_with_repo_tier_classification():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p2_w03_tier_model_operational", ctx) is True


def test_p2_w04_check_passes_with_repo_knowledge_index():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p2_w04_knowledge_index_tier01", ctx) is True


def test_p2_w05_check_passes_with_repo_knowledge_source_validation():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p2_w05_source_validation_passes", ctx) is True


def test_p2_w06_check_passes_with_repo_knowledge_readiness():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p2_w06_knowledge_stage_ready", ctx) is True


def test_p2_w06_check_does_not_use_catalog_sync_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p2_w06_knowledge_stage_ready"] is yasii_checks._check_p2_w06


def test_p3_w01_check_passes_with_repo_graph_nodes():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p3_w01_graph_nodes_indexed", ctx) is True


def test_p3_w02_check_passes_with_repo_graph_edges():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p3_w02_graph_edges_integrity", ctx) is True


def test_p3_w03_check_passes_with_repo_dependency_graph():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p3_w03_dependency_graph_synced", ctx) is True


def test_p3_w04_check_passes_with_repo_rule_graph():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p3_w04_rule_graph_adr001", ctx) is True


def test_p3_w05_check_passes_with_repo_graph_query_layer():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p3_w05_graph_query_traversal", ctx) is True


def test_p3_w06_check_passes_with_repo_graph_readiness():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p3_w06_graph_stage_ready", ctx) is True


def test_p3_w06_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p3_w06_graph_stage_ready"] is yasii_checks._check_p3_w06_graph_stage


def test_p3_w07_check_passes_with_repo_code_knowledge_index():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p3_w07_code_knowledge_indexed", ctx) is True


def test_p3_w07_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p3_w07_code_knowledge_indexed"] is yasii_checks._check_p3_w07


def test_p3_w08_check_passes_with_repo_analyzer_evidence_nodes():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p3_w08_evidence_nodes_linked", ctx) is True


def test_p3_w08_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p3_w08_evidence_nodes_linked"] is yasii_checks._check_p3_w08


def test_p4_w01_check_passes_with_repo_intent_resolver():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p4_w01_intent_resolver_registered", ctx) is True


def test_p4_w01_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p4_w01_intent_resolver_registered"] is yasii_checks._check_p4_w01


def test_p4_w02_check_passes_with_repo_knowledge_resolver():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p4_w02_knowledge_resolver_operational", ctx) is True


def test_p4_w02_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p4_w02_knowledge_resolver_operational"] is yasii_checks._check_p4_w02


def test_p4_w03_check_passes_with_repo_graph_resolver():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p4_w03_graph_resolver_traversal", ctx) is True


def test_p4_w03_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p4_w03_graph_resolver_traversal"] is yasii_checks._check_p4_w03


def test_p4_w04_check_passes_with_repo_evidence_resolver():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p4_w04_evidence_resolver_merge", ctx) is True


def test_p4_w04_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p4_w04_evidence_resolver_merge"] is yasii_checks._check_p4_w04


def test_p4_w05_check_passes_with_repo_rule_engine():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p4_w05_rule_engine_evaluates", ctx) is True


def test_p4_w05_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p4_w05_rule_engine_evaluates"] is yasii_checks._check_p4_w05


def test_p4_w06_check_passes_with_repo_verdict_engine():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p4_w06_verdict_engine_registered", ctx) is True


def test_p4_w06_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p4_w06_verdict_engine_registered"] is yasii_checks._check_p4_w06


def test_p4_w07_check_passes_with_repo_answer_builder():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p4_w07_answer_builder_validates", ctx) is True


def test_p4_w07_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p4_w07_answer_builder_validates"] is yasii_checks._check_p4_w07


def test_p4_w08_check_passes_with_wired_runtime_orchestrator():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p4_w08_runtime_pipeline_complete", ctx) is True


def test_p4_w08_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert yasii_checks._CHECK_BY_ID["yasii_p4_w08_runtime_pipeline_complete"] is yasii_checks._check_p4_w08


def test_p5_w01_check_passes_with_developer_profile_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p5_w01_developer_profile_exists", ctx) is True
    assert run_yasii_check("yasii_p5_w01_developer_profile_active", ctx) is True


def test_p5_w01_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w01_developer_profile_exists"]
        is yasii_checks._check_p5_w01
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w01_developer_profile_active"]
        is yasii_checks._check_p5_w01
    )


def test_p5_w02_check_passes_with_architecture_review_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p5_w02_architecture_review_exists", ctx) is True
    assert run_yasii_check("yasii_p5_w02_architecture_review_capability", ctx) is True


def test_p5_w02_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w02_architecture_review_exists"]
        is yasii_checks._check_p5_w02
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w02_architecture_review_capability"]
        is yasii_checks._check_p5_w02
    )


def test_p5_w03_check_passes_with_impact_analysis_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p5_w03_impact_analysis_exists", ctx) is True
    assert run_yasii_check("yasii_p5_w03_impact_analysis_capability", ctx) is True


def test_p5_w03_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w03_impact_analysis_exists"]
        is yasii_checks._check_p5_w03
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w03_impact_analysis_capability"]
        is yasii_checks._check_p5_w03
    )


def test_p5_w04_check_passes_with_dependency_analysis_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p5_w04_dependency_analysis_exists", ctx) is True
    assert run_yasii_check("yasii_p5_w04_dependency_analysis_capability", ctx) is True


def test_p5_w04_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w04_dependency_analysis_exists"]
        is yasii_checks._check_p5_w04
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w04_dependency_analysis_capability"]
        is yasii_checks._check_p5_w04
    )


def test_p5_w05_check_passes_with_architecture_verdicts_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p5_w05_architecture_verdicts_exists", ctx) is True
    assert run_yasii_check("yasii_p5_w05_architecture_verdicts_valid", ctx) is True


def test_p5_w05_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w05_architecture_verdicts_exists"]
        is yasii_checks._check_p5_w05
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w05_architecture_verdicts_valid"]
        is yasii_checks._check_p5_w05
    )


def test_p5_w06_check_passes_with_dev_query_capability_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p5_w06_dev_query_capability_exists", ctx) is True
    assert run_yasii_check("yasii_p5_w06_dev_query_operational", ctx) is True


def test_p5_w06_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w06_dev_query_capability_exists"]
        is yasii_checks._check_p5_w06
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w06_dev_query_operational"]
        is yasii_checks._check_p5_w06
    )


def test_p5_w07_check_passes_with_developer_readiness_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p5_w07_developer_readiness_exists", ctx) is True
    assert run_yasii_check("yasii_p5_w07_developer_stage_ready", ctx) is True


def test_p5_w07_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w07_developer_readiness_exists"]
        is yasii_checks._check_p5_w07
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p5_w07_developer_stage_ready"]
        is yasii_checks._check_p5_w07
    )


def test_p6_w01_check_passes_with_owner_assistant_profile_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p6_w01_owner_assistant_profile_exists", ctx) is True
    assert run_yasii_check("yasii_p6_w01_owner_profile_active", ctx) is True


def test_p6_w01_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w01_owner_assistant_profile_exists"]
        is yasii_checks._check_p6_w01
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w01_owner_profile_active"]
        is yasii_checks._check_p6_w01
    )


def test_p6_w02_check_passes_with_platform_health_snapshot_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p6_w02_platform_health_snapshot_exists", ctx) is True
    assert run_yasii_check("yasii_p6_w02_health_snapshot_builder", ctx) is True


def test_p6_w02_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w02_platform_health_snapshot_exists"]
        is yasii_checks._check_p6_w02
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w02_health_snapshot_builder"]
        is yasii_checks._check_p6_w02
    )


def test_p6_w03_check_passes_with_reality_check_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p6_w03_reality_check_exists", ctx) is True
    assert run_yasii_check("yasii_p6_w03_reality_check_operational", ctx) is True


def test_p6_w03_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w03_reality_check_exists"]
        is yasii_checks._check_p6_w03
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w03_reality_check_operational"]
        is yasii_checks._check_p6_w03
    )


def test_p6_w04_check_passes_with_deviation_registry_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p6_w04_deviation_registry_exists", ctx) is True
    assert run_yasii_check("yasii_p6_w04_deviation_registry_active", ctx) is True


def test_p6_w04_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w04_deviation_registry_exists"]
        is yasii_checks._check_p6_w04
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w04_deviation_registry_active"]
        is yasii_checks._check_p6_w04
    )


def test_p6_w05_check_passes_with_owner_report_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p6_w05_owner_report_exists", ctx) is True
    assert run_yasii_check("yasii_p6_w05_owner_report_pipeline_ready", ctx) is True


def test_p6_w05_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w05_owner_report_exists"]
        is yasii_checks._check_p6_w05
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w05_owner_report_pipeline_ready"]
        is yasii_checks._check_p6_w05
    )


def test_p6_w06_check_passes_with_improvement_suggestions_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p6_w06_improvement_suggestions_exists", ctx) is True
    assert run_yasii_check("yasii_p6_w06_improvement_suggestions_in_report", ctx) is True


def test_p6_w06_check_does_not_use_not_implemented_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w06_improvement_suggestions_exists"]
        is yasii_checks._check_p6_w06
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w06_improvement_suggestions_in_report"]
        is yasii_checks._check_p6_w06
    )


def test_p6_w07_check_passes_with_owner_readiness_module():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p6_w07_owner_readiness_exists", ctx) is True
    assert run_yasii_check("yasii_p6_w07_owner_stage_ready", ctx) is True


def test_p6_w07_check_does_not_use_catalog_sync_stub():
    from app.modules.platform_dashboard_analyzer import yasii_checks

    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w07_owner_readiness_exists"]
        is yasii_checks._check_p6_w07
    )
    assert (
        yasii_checks._CHECK_BY_ID["yasii_p6_w07_owner_stage_ready"]
        is yasii_checks._check_p6_w07
    )


def test_health_only_schemas_do_not_pass_w07_or_w08():
    ctx = build_scan_context()
    assert run_yasii_check("yasii_p1_w08_failure_response_defined", ctx) is True

    mocked = _ctx_with_yasii_files(
        {
            "modules/yasii/schemas.py": (
                "class YasiiHealthResponse(BaseModel):\n"
                "    module: str\n"
            ),
        }
    )
    assert run_yasii_check("yasii_p1_w07_request_response_contracts", mocked) is False
    assert run_yasii_check("yasii_p1_w08_failure_response_defined", mocked) is False


def test_schemas_with_request_response_passes_w07():
    mocked = _ctx_with_yasii_files(
        {
            "modules/yasii/schemas.py": (
                "class YASIIRequest(BaseModel):\n"
                "    pass\n\n"
                "class YASIIResponse(BaseModel):\n"
                "    pass\n"
            ),
        }
    )
    assert run_yasii_check("yasii_p1_w07_request_response_contracts", mocked) is True
    assert run_yasii_check("yasii_p1_w08_failure_response_defined", mocked) is False


def test_contracts_module_with_request_response_passes_w07():
    mocked = _ctx_with_yasii_files(
        {
            "modules/yasii/contracts.py": (
                "class YASIIRequest:\n"
                "    pass\n\n"
                "class YASIIResponse:\n"
                "    pass\n"
            ),
        }
    )
    assert run_yasii_check("yasii_p1_w07_request_response_contracts", mocked) is True


def test_failure_response_module_passes_w08():
    mocked = _ctx_with_yasii_files(
        {
            "modules/yasii/failure_response.py": "class FailureResponse(BaseModel):\n    pass\n",
        }
    )
    assert run_yasii_check("yasii_p1_w08_failure_response_defined", mocked) is True


def test_failure_response_in_schemas_passes_w08():
    mocked = _ctx_with_yasii_files(
        {
            "modules/yasii/schemas.py": "class FailureResponse(BaseModel):\n    reason: str\n",
        }
    )
    assert run_yasii_check("yasii_p1_w08_failure_response_defined", mocked) is True


def test_yasii_workspace_modes_check_passes():
    assert run_yasii_check("yasii_workspace_modes", build_scan_context()) is True


def test_yasii_p8_w01_user_memory_store_check_passes():
    assert run_yasii_check("yasii_p8_w01_user_memory_store", build_scan_context()) is True


def test_yasii_p8_w02_tenant_memory_store_check_passes():
    assert run_yasii_check("yasii_p8_w02_tenant_memory_store", build_scan_context()) is True


def test_yasii_p8_w03_decision_memory_linked_check_passes():
    assert run_yasii_check("yasii_p8_w03_decision_memory_linked", build_scan_context()) is True


def test_yasii_p8_w05_process_memory_schema_check_passes():
    assert run_yasii_check("yasii_p8_w05_process_memory_schema", build_scan_context()) is True


def test_yasii_p8_w06_memory_graph_linked_check_passes():
    assert run_yasii_check("yasii_p8_w06_memory_graph_linked", build_scan_context()) is True


def test_yasii_p9_w01_strategy_engine_operational_check_passes():
    assert run_yasii_check("yasii_p9_w01_strategy_engine_operational", build_scan_context()) is True


def test_yasii_p9_w02_unlock_score_ranking_check_passes():
    assert run_yasii_check("yasii_p9_w02_unlock_score_ranking", build_scan_context()) is True


def test_yasii_p9_w03_blocker_detection_check_passes():
    assert run_yasii_check("yasii_p9_w03_blocker_detection", build_scan_context()) is True


def test_yasii_p9_w04_strategy_recommendation_templates_check_passes():
    assert (
        run_yasii_check("yasii_p9_w04_strategy_recommendation_templates", build_scan_context())
        is True
    )


def test_yasii_p9_w05_architect_profile_active_check_passes():
    assert run_yasii_check("yasii_p9_w05_architect_profile_active", build_scan_context()) is True


def test_yasii_p9_w06_improvement_query_standalone_check_passes():
    assert run_yasii_check("yasii_p9_w06_improvement_query_standalone", build_scan_context()) is True


def test_yasii_p10_w03_e2e_mvp_scenarios_pass_check_passes():
    assert run_yasii_check("yasii_p10_w03_e2e_mvp_scenarios_pass", build_scan_context()) is True


def test_yasii_user_identity_integration_check_passes():
    assert run_yasii_check("yasii_user_identity_integration", build_scan_context()) is True


def test_yasii_p8_w04_session_memory_multiturn_check_passes():
    assert run_yasii_check("yasii_p8_w04_session_memory_multiturn", build_scan_context()) is True


def test_current_work_item_after_w01_through_w06_is_p1_w07():
    done = {f"P1-W0{i}" for i in range(1, 7)}
    completed, current, next_items = classify_embedded_ai_stage_work_items(done)

    assert len(completed) == 6
    assert current == ["P1-W07 Request Response Contracts"]
    assert "P1-W10 EffectiveScope Derivation" not in current
    assert "P1-W07 Request Response Contracts" not in next_items
    assert "P1-W08 FailureResponse" in next_items
