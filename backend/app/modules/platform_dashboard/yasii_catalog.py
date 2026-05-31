"""YASII Dashboard catalog — stages, components, work items (from YASII_DASHBOARD_WORK_ITEMS.md)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class YasiiStageDefinition:
    slug: str
    title: str
    order_index: int
    description: str
    component_slug: str
    mvp: bool | str  # True, False, or "partial"
    completion_criteria: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class YasiiWorkItemDefinition:
    key: str
    stage_slug: str
    title: str
    weight: int
    depends_on: tuple[str, ...]
    enables: tuple[str, ...]
    analyzer_check: str
    mvp: bool | str
    phase_id: str
    constitution_ref: tuple[str, ...] = ()
    system_map_ref: tuple[str, ...] = ()


def _phase_id(stage_slug: str) -> str:
    mapping = {
        "yasii-core-foundation": "yasii-phase-1",
        "yasii-knowledge-foundation": "yasii-phase-2",
        "yasii-graph-foundation": "yasii-phase-3",
        "yasii-runtime-foundation": "yasii-phase-4",
        "yasii-developer-mvp": "yasii-phase-5",
        "yasii-owner-mvp": "yasii-phase-6",
        "yasii-embedded-intelligence": "yasii-phase-7",
        "yasii-memory-foundation": "yasii-phase-8",
        "yasii-strategy-layer": "yasii-phase-9",
        "yasii-platform-readiness": "yasii-phase-10",
    }
    return mapping[stage_slug]


YASII_STAGES: tuple[YasiiStageDefinition, ...] = (
    YasiiStageDefinition(
        slug="yasii-core-foundation",
        title="YASII Core Foundation",
        order_index=100,
        description="Identity, Context, Permission, Runtime skeleton, Audit",
        component_slug="yasii-core",
        mvp=True,
        completion_criteria=[
            "Request without session rejected",
            "Identity + Context + Permission resolve",
            "Audit trail persists",
        ],
    ),
    YasiiStageDefinition(
        slug="yasii-knowledge-foundation",
        title="YASII Knowledge Foundation",
        order_index=101,
        description="Knowledge registry, tier model, platform knowledge index",
        component_slug="yasii-knowledge",
        mvp=True,
        completion_criteria=["Tier 0–3 indexed", "Tier selection rules operational"],
    ),
    YasiiStageDefinition(
        slug="yasii-graph-foundation",
        title="YASII Knowledge Graph Foundation",
        order_index=102,
        description="Graph nodes, edges, rule graph, code knowledge, analyzer evidence",
        component_slug="yasii-graph",
        mvp=True,
        completion_criteria=["ADR-001 graph traversal succeeds", "Evidence nodes linked"],
    ),
    YasiiStageDefinition(
        slug="yasii-runtime-foundation",
        title="YASII Runtime Engine Foundation",
        order_index=103,
        description="Full deterministic pipeline Intent → Verdict → Answer",
        component_slug="yasii-runtime",
        mvp=True,
        completion_criteria=["Normative query returns verdict + citation", "Zero LLM in path"],
    ),
    YasiiStageDefinition(
        slug="yasii-developer-mvp",
        title="YASII Developer MVP",
        order_index=104,
        description="Developer role, Architecture Review, Impact, Dependency analysis",
        component_slug="yasii-developer",
        mvp=True,
        completion_criteria=["Architecture Review operational", "Legacy violation → fail + rule id"],
    ),
    YasiiStageDefinition(
        slug="yasii-owner-mvp",
        title="YASII Owner Assistant MVP",
        order_index=105,
        description="Owner role, Reality Check, Owner Report, Deviations",
        component_slug="yasii-owner",
        mvp=True,
        completion_criteria=["Owner Report with paper-done section", "Reality Check operational"],
    ),
    YasiiStageDefinition(
        slug="yasii-embedded-intelligence",
        title="YASII Embedded Intelligence",
        order_index=106,
        description="Host surfaces integration, context auto-capture",
        component_slug="yasii-embedded",
        mvp="partial",
        completion_criteria=["Platform Dev + Owner Dashboard embedded", "No standalone chat primary route"],
    ),
    YasiiStageDefinition(
        slug="yasii-memory-foundation",
        title="YASII Memory Foundation",
        order_index=107,
        description="Extended memory: user, tenant, decision, session",
        component_slug="yasii-memory",
        mvp=False,
        completion_criteria=["Memory linked to graph nodes"],
    ),
    YasiiStageDefinition(
        slug="yasii-strategy-layer",
        title="YASII Strategy Layer",
        order_index=108,
        description="Strategy capability, ranked actions, blocker detection",
        component_slug="yasii-strategy",
        mvp=False,
        completion_criteria=["DO NEXT verdict with graph citations"],
    ),
    YasiiStageDefinition(
        slug="yasii-platform-readiness",
        title="YASII Platform Readiness",
        order_index=109,
        description="MVP gate: Constitution compliance, E2E scenarios, sign-off",
        component_slug="yasii-readiness",
        mvp=True,
        completion_criteria=["All 9 MVP success criteria verified", "Architecture sign-off"],
    ),
)

YASII_COMPONENTS: tuple[dict[str, str], ...] = tuple(
    {
        "slug": stage.component_slug,
        "title": f"YASII — {stage.title}",
        "description": stage.description,
        "stage_slug": stage.slug,
    }
    for stage in YASII_STAGES
)

# fmt: off
YASII_WORK_ITEMS: tuple[YasiiWorkItemDefinition, ...] = (
    # Phase 1 — ACE Foundation (W02–W06) + YASII Core Foundation (W01, W07–W12, W10)
    YasiiWorkItemDefinition("P1-W01", "yasii-core-foundation", "YASII Module Skeleton", 8, (), ("P1-W02", "P1-W07", "P1-W11"), "yasii_p1_w01_module_skeleton_exists", True, "yasii-phase-1", ("P3", "P2"), ("§2 YASII Core",)),
    YasiiWorkItemDefinition("P1-W02", "yasii-core-foundation", "ACE Module Skeleton", 10, ("P1-W01",), ("P1-W03", "P1-W04", "P1-W05", "P1-W06"), "yasii_p1_w02_ace_module_skeleton_exists", True, "yasii-phase-1", ("P4", "P5"), ("§ACE Layer",)),
    YasiiWorkItemDefinition("P1-W03", "yasii-core-foundation", "Identity Resolution", 9, ("P1-W02",), ("P1-W04", "P1-W05", "P1-W06"), "yasii_p1_w03_identity_resolution_ace", True, "yasii-phase-1", ("P4", "P12", "P15"), ("§ACE Identity Resolution",)),
    YasiiWorkItemDefinition("P1-W04", "yasii-core-foundation", "Permission Resolution", 9, ("P1-W03",), ("P1-W05", "P1-W06"), "yasii_p1_w04_permission_resolution_ace", True, "yasii-phase-1", ("P5",), ("§ACE Permission Resolution",)),
    YasiiWorkItemDefinition("P1-W05", "yasii-core-foundation", "ContextSnapshot Builder", 11, ("P1-W04",), ("P1-W06", "P7-W01"), "yasii_p1_w05_context_snapshot_builder_ace", True, "yasii-phase-1", ("P4", "P13"), ("§ACE ContextSnapshot",)),
    YasiiWorkItemDefinition("P1-W06", "yasii-core-foundation", "PermissionBoundary Builder", 11, ("P1-W04", "P1-W05"), ("P1-W07", "P2-W01"), "yasii_p1_w06_permission_boundary_builder_ace", True, "yasii-phase-1", ("P5",), ("§ACE PermissionBoundary",)),
    YasiiWorkItemDefinition("P1-W07", "yasii-core-foundation", "Request Response Contracts", 9, ("P1-W01", "P1-W06"), ("P1-W08", "P1-W10", "P1-W11"), "yasii_p1_w07_request_response_contracts", True, "yasii-phase-1", ("P4",), ("§2 YASII Core",)),
    YasiiWorkItemDefinition("P1-W08", "yasii-core-foundation", "FailureResponse", 7, ("P1-W07",), ("P1-W09",), "yasii_p1_w08_failure_response_defined", True, "yasii-phase-1", ("P12",), ("§2 Runtime",)),
    YasiiWorkItemDefinition("P1-W09", "yasii-core-foundation", "Audit Skeleton", 8, ("P1-W10", "P1-W11"), ("P4-W08", "P10-W03"), "yasii_p1_w09_audit_skeleton_persists", True, "yasii-phase-1", ("P15",), ("§2 Audit Trail",)),
    YasiiWorkItemDefinition("P1-W10", "yasii-core-foundation", "EffectiveScope Derivation", 8, ("P1-W06", "P1-W07"), ("P1-W09", "P1-W11"), "yasii_p1_w10_effective_scope_derivation", True, "yasii-phase-1", ("P5",), ("§EffectiveScope",)),
    YasiiWorkItemDefinition("P1-W11", "yasii-core-foundation", "Runtime Orchestrator Skeleton", 6, ("P1-W07", "P1-W10"), ("P1-W09", "P4-W08"), "yasii_p1_w11_runtime_skeleton_registered", True, "yasii-phase-1", ("P3", "P9"), ("§5 Runtime",)),
    YasiiWorkItemDefinition("P1-W12", "yasii-core-foundation", "Memory Layer Basic", 4, ("P1-W09",), ("P8-W01",), "yasii_p1_w12_memory_basic_linked", True, "yasii-phase-1", ("P16",), ("§2 Memory Layer",)),
    # Phase 2
    YasiiWorkItemDefinition("P2-W01", "yasii-knowledge-foundation", "Knowledge Registry", 18, ("P1-W06",), ("P2-W02", "P3-W01"), "yasii_p2_w01_knowledge_registry_exists", True, "yasii-phase-2", ("P8",), ("§3 Knowledge",)),
    YasiiWorkItemDefinition("P2-W02", "yasii-knowledge-foundation", "Knowledge Source Registry", 15, ("P2-W01",), ("P2-W04", "P2-W05"), "yasii_p2_w02_source_registry_complete", True, "yasii-phase-2", ("P8",), ("§3 Knowledge",)),
    YasiiWorkItemDefinition("P2-W03", "yasii-knowledge-foundation", "Tier Classification", 18, ("P2-W01",), ("P2-W04", "P2-W06", "P4-W02"), "yasii_p2_w03_tier_model_operational", True, "yasii-phase-2", ("P8", "P11"), ("§3 Knowledge",)),
    YasiiWorkItemDefinition("P2-W04", "yasii-knowledge-foundation", "Knowledge Index", 22, ("P2-W02", "P2-W03"), ("P3-W03", "P3-W04"), "yasii_p2_w04_knowledge_index_tier01", True, "yasii-phase-2", ("P6", "P8"), ("§3 Knowledge",)),
    YasiiWorkItemDefinition("P2-W05", "yasii-knowledge-foundation", "Knowledge Source Validation", 12, ("P2-W02", "P2-W04"), ("P2-W06",), "yasii_p2_w05_source_validation_passes", True, "yasii-phase-2", ("P8",), ("§3 Knowledge",)),
    YasiiWorkItemDefinition("P2-W06", "yasii-knowledge-foundation", "Knowledge Readiness", 15, ("P2-W03", "P2-W04", "P2-W05"), ("P3-W01",), "yasii_p2_w06_knowledge_stage_ready", True, "yasii-phase-2", ("P8",), ("§3 Knowledge",)),
    # Phase 3
    YasiiWorkItemDefinition("P3-W01", "yasii-graph-foundation", "Graph Nodes", 14, ("P2-W06",), ("P3-W02", "P3-W03", "P3-W04", "P3-W07"), "yasii_p3_w01_graph_nodes_indexed", True, "yasii-phase-3", ("P19",), ("§4 Graph",)),
    YasiiWorkItemDefinition("P3-W02", "yasii-graph-foundation", "Graph Edges", 10, ("P3-W01",), ("P3-W03", "P3-W04", "P3-W05"), "yasii_p3_w02_graph_edges_integrity", True, "yasii-phase-3", ("P19",), ("§4 Graph",)),
    YasiiWorkItemDefinition("P3-W03", "yasii-graph-foundation", "Dependency Graph", 14, ("P3-W01", "P3-W02"), ("P5-W04", "P9-W03"), "yasii_p3_w03_dependency_graph_synced", True, "yasii-phase-3", ("P20",), ("§4 Graph",)),
    YasiiWorkItemDefinition("P3-W04", "yasii-graph-foundation", "Rule Graph", 14, ("P3-W01", "P3-W02"), ("P4-W05", "P5-W02"), "yasii_p3_w04_rule_graph_adr001", True, "yasii-phase-3", ("P19",), ("§4 Graph",)),
    YasiiWorkItemDefinition("P3-W05", "yasii-graph-foundation", "Graph Query Layer", 14, ("P3-W03", "P3-W04"), ("P4-W03", "P3-W08"), "yasii_p3_w05_graph_query_traversal", True, "yasii-phase-3", ("P20",), ("§4 Graph",)),
    YasiiWorkItemDefinition("P3-W06", "yasii-graph-foundation", "Graph Readiness", 10, ("P3-W05",), ("P4-W03",), "yasii_p3_w06_graph_stage_ready", True, "yasii-phase-3", ("P19",), ("§4 Graph",)),
    YasiiWorkItemDefinition("P3-W07", "yasii-graph-foundation", "Code Knowledge Index", 12, ("P3-W01",), ("P5-W03", "P5-W05"), "yasii_p3_w07_code_knowledge_indexed", True, "yasii-phase-3", ("P10",), ("§3 Code Knowledge",)),
    YasiiWorkItemDefinition("P3-W08", "yasii-graph-foundation", "Analyzer Evidence Nodes", 12, ("P3-W01", "P3-W05"), ("P4-W04", "P6-W02"), "yasii_p3_w08_evidence_nodes_linked", True, "yasii-phase-3", ("P10",), ("§4 Graph",)),
    # Phase 4
    YasiiWorkItemDefinition("P4-W01", "yasii-runtime-foundation", "Intent Resolver", 10, ("P1-W11", "P3-W06"), ("P4-W02", "P5-W02"), "yasii_p4_w01_intent_resolver_registered", True, "yasii-phase-4", ("P9",), ("§5 Runtime",)),
    YasiiWorkItemDefinition("P4-W02", "yasii-runtime-foundation", "Knowledge Resolver", 10, ("P2-W06", "P4-W01"), ("P4-W03",), "yasii_p4_w02_knowledge_resolver_operational", True, "yasii-phase-4", ("P8",), ("§5 Runtime",)),
    YasiiWorkItemDefinition("P4-W03", "yasii-runtime-foundation", "Graph Resolver", 14, ("P3-W05", "P4-W02"), ("P4-W04", "P5-W03"), "yasii_p4_w03_graph_resolver_traversal", True, "yasii-phase-4", ("P20",), ("§5 Runtime",)),
    YasiiWorkItemDefinition("P4-W04", "yasii-runtime-foundation", "Evidence Resolver", 14, ("P3-W08", "P4-W03"), ("P4-W05", "P6-W02"), "yasii_p4_w04_evidence_resolver_merge", True, "yasii-phase-4", ("P10",), ("§5 Runtime",)),
    YasiiWorkItemDefinition("P4-W05", "yasii-runtime-foundation", "Rule Engine", 14, ("P3-W04", "P4-W04"), ("P4-W06", "P5-W02"), "yasii_p4_w05_rule_engine_evaluates", True, "yasii-phase-4", ("P9",), ("§5 Runtime",)),
    YasiiWorkItemDefinition("P4-W06", "yasii-runtime-foundation", "Verdict Engine", 12, ("P4-W05",), ("P4-W07", "P5-W05", "P6-W03"), "yasii_p4_w06_verdict_engine_registered", True, "yasii-phase-4", ("P12",), ("§5 Runtime",)),
    YasiiWorkItemDefinition("P4-W07", "yasii-runtime-foundation", "Answer Builder", 14, ("P4-W06",), ("P5-W06", "P6-W07"), "yasii_p4_w07_answer_builder_validates", True, "yasii-phase-4", ("P14",), ("§5 Runtime",)),
    YasiiWorkItemDefinition("P4-W08", "yasii-runtime-foundation", "Runtime Orchestrator Wiring", 12, ("P1-W11", "P1-W09", "P4-W01", "P4-W02", "P4-W03", "P4-W04", "P4-W05", "P4-W06", "P4-W07"), ("P5-W01", "P6-W01"), "yasii_p4_w08_runtime_pipeline_complete", True, "yasii-phase-4", ("P8", "P9", "P12", "P14"), ("§5 Runtime",)),
    # Phase 5
    YasiiWorkItemDefinition("P5-W01", "yasii-developer-mvp", "Developer Profile", 14, ("P4-W08",), ("P5-W02", "P5-W03", "P5-W04", "P5-W06"), "yasii_p5_w01_developer_profile_active", True, "yasii-phase-5", ("P2", "P17"), ("§6 Developer",)),
    YasiiWorkItemDefinition("P5-W02", "yasii-developer-mvp", "Architecture Review", 22, ("P5-W01", "P4-W05"), ("P5-W06", "P10-W03"), "yasii_p5_w02_architecture_review_capability", True, "yasii-phase-5", ("P18",), ("§7 Review",)),
    YasiiWorkItemDefinition("P5-W03", "yasii-developer-mvp", "Impact Analysis", 16, ("P5-W01", "P4-W03"), ("P5-W07",), "yasii_p5_w03_impact_analysis_capability", True, "yasii-phase-5", ("P18",), ("§7 Impact",)),
    YasiiWorkItemDefinition("P5-W04", "yasii-developer-mvp", "Dependency Analysis", 14, ("P5-W01", "P3-W03"), ("P5-W07",), "yasii_p5_w04_dependency_analysis_capability", True, "yasii-phase-5", ("P18",), ("§7 Dependency",)),
    YasiiWorkItemDefinition("P5-W05", "yasii-developer-mvp", "Architecture Verdicts", 14, ("P5-W02", "P4-W06"), ("P5-W07",), "yasii_p5_w05_architecture_verdicts_valid", True, "yasii-phase-5", ("P14",), ("§6 Developer",)),
    YasiiWorkItemDefinition("P5-W06", "yasii-developer-mvp", "Dev Query Capability", 10, ("P5-W01", "P4-W07"), ("P7-W04",), "yasii_p5_w06_dev_query_operational", True, "yasii-phase-5", ("P18",), ("§6 Developer",)),
    YasiiWorkItemDefinition("P5-W07", "yasii-developer-mvp", "Developer Readiness", 10, ("P5-W02", "P5-W03", "P5-W04", "P5-W05", "P5-W06"), ("P7-W04", "P10-W03"), "yasii_p5_w07_developer_stage_ready", True, "yasii-phase-5", ("P17",), ("§6 Developer",)),
    # Phase 6
    YasiiWorkItemDefinition("P6-W01", "yasii-owner-mvp", "Owner Assistant Profile", 10, ("P4-W08",), ("P6-W02", "P6-W03", "P6-W04"), "yasii_p6_w01_owner_profile_active", True, "yasii-phase-6", ("P17",), ("§6 Owner",)),
    YasiiWorkItemDefinition("P6-W02", "yasii-owner-mvp", "Platform Health Snapshot", 14, ("P6-W01", "P3-W08"), ("P6-W05",), "yasii_p6_w02_health_snapshot_builder", True, "yasii-phase-6", ("P10", "P11"), ("§12 Reports",)),
    YasiiWorkItemDefinition("P6-W03", "yasii-owner-mvp", "Reality Check", 20, ("P6-W01", "P4-W04"), ("P6-W05", "P10-W03"), "yasii_p6_w03_reality_check_operational", True, "yasii-phase-6", ("P10", "P11"), ("§7 Reality Check",)),
    YasiiWorkItemDefinition("P6-W04", "yasii-owner-mvp", "Deviation Registry", 14, ("P6-W01", "P4-W05"), ("P6-W05", "P6-W06"), "yasii_p6_w04_deviation_registry_active", True, "yasii-phase-6", ("P10",), ("§6 Owner",)),
    YasiiWorkItemDefinition("P6-W05", "yasii-owner-mvp", "Owner Report", 22, ("P6-W02", "P6-W03", "P6-W04"), ("P6-W07", "P10-W03"), "yasii_p6_w05_owner_report_pipeline_ready", True, "yasii-phase-6", ("P14",), ("§12 Reports",)),
    YasiiWorkItemDefinition("P6-W06", "yasii-owner-mvp", "Improvement Suggestions", 10, ("P6-W04",), ("P6-W07", "P9-W06"), "yasii_p6_w06_improvement_suggestions_in_report", True, "yasii-phase-6", ("P18",), ("§7 Improvement",)),
    YasiiWorkItemDefinition("P6-W07", "yasii-owner-mvp", "Owner Readiness", 10, ("P6-W05", "P6-W06"), ("P7-W04", "P10-W03"), "yasii_p6_w07_owner_stage_ready", True, "yasii-phase-6", ("P17",), ("§6 Owner",)),
    # Phase 7
    YasiiWorkItemDefinition("P7-W01", "yasii-embedded-intelligence", "Host Contract Implementation", 12, ("P1-W05", "P1-W06", "P5-W07", "P6-W07"), ("P7-W02", "P7-W03", "P7-W04", "P7-W05", "P7-W06", "P7-W07", "P7-W08"), "yasii_p7_w01_host_contract_implemented", True, "yasii-phase-7", ("P4", "P13"), ("§8 Integrations",)),
    YasiiWorkItemDefinition("P7-W02", "yasii-embedded-intelligence", "Object Card Integration", 8, ("P7-W01",), (), "yasii_p7_w02_object_card_integration", False, "yasii-phase-7", ("P13",), ("§8 Integrations",)),
    YasiiWorkItemDefinition("P7-W03", "yasii-embedded-intelligence", "Registry Integration", 8, ("P7-W01",), (), "yasii_p7_w03_registry_integration", False, "yasii-phase-7", ("P13",), ("§8 Integrations",)),
    YasiiWorkItemDefinition("P7-W04", "yasii-embedded-intelligence", "Dashboard Integration", 22, ("P7-W01", "P5-W07", "P6-W07"), ("P7-W08", "P10-W03"), "yasii_p7_w04_dashboard_integration_mvp", True, "yasii-phase-7", ("P4", "P13"), ("§8 Integrations",)),
    YasiiWorkItemDefinition("P7-W05", "yasii-embedded-intelligence", "Designer Integration", 10, ("P7-W01", "P5-W07"), (), "yasii_p7_w05_designer_integration", "partial", "yasii-phase-7", ("P13",), ("§8 Integrations",)),
    YasiiWorkItemDefinition("P7-W06", "yasii-embedded-intelligence", "Document Integration", 8, ("P7-W01",), (), "yasii_p7_w06_document_integration", False, "yasii-phase-7", ("P13",), ("§8 Integrations",)),
    YasiiWorkItemDefinition("P7-W07", "yasii-embedded-intelligence", "Process Integration", 8, ("P7-W01",), (), "yasii_p7_w07_process_integration", False, "yasii-phase-7", ("P13",), ("§8 Integrations",)),
    YasiiWorkItemDefinition("P7-W08", "yasii-embedded-intelligence", "Embedded Entry Points", 24, ("P7-W04",), ("P10-W03",), "yasii_p7_w08_embedded_no_standalone_chat", True, "yasii-phase-7", ("P13",), ("§8 Integrations",)),
    # Phase 8
    YasiiWorkItemDefinition("P8-W01", "yasii-memory-foundation", "User Memory", 18, ("P10-W06", "P1-W12"), ("P8-W06", "P9-W01"), "yasii_p8_w01_user_memory_store", False, "yasii-phase-8", ("P16",), ("§2 Memory",)),
    YasiiWorkItemDefinition("P8-W02", "yasii-memory-foundation", "Tenant Memory", 18, ("P10-W06",), ("P8-W06",), "yasii_p8_w02_tenant_memory_store", False, "yasii-phase-8", ("P16",), ("§2 Memory",)),
    YasiiWorkItemDefinition("P8-W03", "yasii-memory-foundation", "Decision Memory", 20, ("P6-W04", "P1-W09"), ("P9-W01", "P9-W04"), "yasii_p8_w03_decision_memory_linked", False, "yasii-phase-8", ("P16",), ("§2 Memory",)),
    YasiiWorkItemDefinition("P8-W04", "yasii-memory-foundation", "Session Memory", 16, ("P8-W01",), ("P9-W01",), "yasii_p8_w04_session_memory_multiturn", False, "yasii-phase-8", ("P16",), ("§2 Memory",)),
    YasiiWorkItemDefinition("P8-W05", "yasii-memory-foundation", "Process Memory Schema", 14, ("P8-W02",), (), "yasii_p8_w05_process_memory_schema", False, "yasii-phase-8", ("P16",), ("§2 Memory",)),
    YasiiWorkItemDefinition("P8-W06", "yasii-memory-foundation", "Memory Graph Linking", 14, ("P8-W01", "P8-W03"), ("P9-W02",), "yasii_p8_w06_memory_graph_linked", False, "yasii-phase-8", ("P16",), ("§2 Memory",)),
    # Phase 9
    YasiiWorkItemDefinition("P9-W01", "yasii-strategy-layer", "Strategy Capability Engine", 20, ("P6-W07", "P3-W03"), ("P9-W02", "P9-W04"), "yasii_p9_w01_strategy_engine_operational", False, "yasii-phase-9", ("P18", "P21"), ("§12 Strategy",)),
    YasiiWorkItemDefinition("P9-W02", "yasii-strategy-layer", "Unlock Score Ranking", 18, ("P9-W01", "P8-W06"), ("P9-W04",), "yasii_p9_w02_unlock_score_ranking", False, "yasii-phase-9", ("P18",), ("§12 Strategy",)),
    YasiiWorkItemDefinition("P9-W03", "yasii-strategy-layer", "Blocker Detection", 18, ("P9-W01", "P3-W03"), ("P9-W04",), "yasii_p9_w03_blocker_detection", False, "yasii-phase-9", ("P20",), ("§12 Strategy",)),
    YasiiWorkItemDefinition("P9-W04", "yasii-strategy-layer", "Strategy Recommendation Templates", 16, ("P9-W02", "P9-W03"), ("P9-W06",), "yasii_p9_w04_strategy_templates_ready", False, "yasii-phase-9", ("P14",), ("§12 Strategy",)),
    YasiiWorkItemDefinition("P9-W05", "yasii-strategy-layer", "YASII Architect Profile", 14, ("P9-W01", "P5-W01"), (), "yasii_p9_w05_architect_profile_active", False, "yasii-phase-9", ("P17",), ("§6 Architect",)),
    YasiiWorkItemDefinition("P9-W06", "yasii-strategy-layer", "Improvement Query Standalone", 14, ("P6-W06", "P9-W01"), (), "yasii_p9_w06_improvement_query_standalone", False, "yasii-phase-9", ("P18",), ("§7 Improvement",)),
    # Phase 10
    YasiiWorkItemDefinition("P10-W01", "yasii-platform-readiness", "Constitution Compliance Audit", 18, ("MVP_PHASES_COMPLETE",), ("P10-W06",), "yasii_p10_w01_constitution_compliance_pass", True, "yasii-phase-10", ("P1-P22",), ("§9 MVP",)),
    YasiiWorkItemDefinition("P10-W02", "yasii-platform-readiness", "System Map Coverage Matrix", 16, ("MVP_PHASES_COMPLETE",), ("P10-W06",), "yasii_p10_w02_system_map_coverage_pass", True, "yasii-phase-10", (), ("§9 MVP",)),
    YasiiWorkItemDefinition("P10-W03", "yasii-platform-readiness", "E2E MVP Scenario Tests", 22, ("P5-W07", "P6-W07", "P7-W08"), ("P10-W06",), "yasii_p10_w03_e2e_mvp_scenarios_pass", True, "yasii-phase-10", (), ("§9 MVP",)),
    YasiiWorkItemDefinition("P10-W04", "yasii-platform-readiness", "Analyzer Evidence Suite", 18, ("MVP_WORK_ITEMS_COMPLETE",), ("P10-W05",), "yasii_p10_w04_analyzer_suite_complete", True, "yasii-phase-10", (), ("§9 MVP",)),
    YasiiWorkItemDefinition("P10-W05", "yasii-platform-readiness", "Dashboard Readiness Rollup", 12, ("P10-W04",), ("P10-W06",), "yasii_p10_w05_dashboard_readiness_100", True, "yasii-phase-10", (), ("§9 MVP",)),
    YasiiWorkItemDefinition("P10-W06", "yasii-platform-readiness", "Architecture Sign-Off", 14, ("P10-W01", "P10-W02", "P10-W03", "P10-W04", "P10-W05"), ("P8-W01",), "yasii_p10_w06_architecture_signoff", True, "yasii-phase-10", (), ("§9 MVP",)),
)
# fmt: on

MVP_STAGE_SLUGS: frozenset[str] = frozenset(
    stage.slug for stage in YASII_STAGES if stage.mvp is True or stage.mvp == "partial"
)

MVP_WORK_ITEM_KEYS: frozenset[str] = frozenset(
    item.key for item in YASII_WORK_ITEMS if item.mvp is True or item.mvp == "partial"
)

YASII_STAGE_SLUGS: frozenset[str] = frozenset(stage.slug for stage in YASII_STAGES)
YASII_EXPECTED_STAGE_COUNT = 10
YASII_EXPECTED_WORK_ITEM_COUNT = 74

YASII_IMPLEMENTATION_STAGE_SLUG = "ai-native-layer"
YASII_IMPLEMENTATION_COMPONENT_SLUG = "ai-context"

ACE_TRACK_ITEM_KEYS: frozenset[str] = frozenset(
    {
        "P1-W02",
        "P1-W03",
        "P1-W04",
        "P1-W05",
        "P1-W06",
    }
)

ACE_TRACK_TITLE = "ACE Foundation"
YASII_TRACK_TITLE = "YASII Core Foundation"

YASII_CONTAINER_COMPLETION_CRITERIA: tuple[str, ...] = (
    "ACE Foundation: HostContext → Identity → PermissionBoundary → ContextSnapshot.",
    "YASII Track: EffectiveScope (Runtime Entry), Core, Knowledge, Graph, Runtime, роли Developer и Owner Assistant.",
    "ЯСИИ работает из контекста платформы; Platform Dashboard — источник контроля реализации.",
)

YASII_IMPLEMENTATION_STAGE_GOAL = (
    "Создание встроенного цифрового интеллектуального сотрудника платформы (ЯСИИ). "
    "ACE обеспечивает контекст, права доступа и безопасную область анализа. "
    "YASII обеспечивает интеллектуальный анализ, рекомендации и поддержку пользователей "
    "на основе контекста платформы."
)

YASII_CONTAINER_DESCRIPTION = YASII_IMPLEMENTATION_STAGE_GOAL

YASII_CRITICAL_PATH: tuple[str, ...] = (
    "P1-W01",
    "P1-W02",
    "P1-W03",
    "P1-W04",
    "P1-W05",
    "P1-W06",
    "P1-W07",
    "P1-W10",
    "P1-W11",
    "P1-W09",
    "P2-W01",
    "P2-W06",
    "P3-W01",
    "P3-W08",
    "P4-W08",
    "P5-W02",
    "P6-W05",
    "P7-W01",
    "P7-W04",
    "P7-W08",
    "P10-W03",
    "P10-W06",
)


def is_yasii_stage_slug(slug: str) -> bool:
    return slug.startswith("yasii-")


def work_items_by_stage(slug: str) -> list[YasiiWorkItemDefinition]:
    return [item for item in YASII_WORK_ITEMS if item.stage_slug == slug]


def stage_by_slug(slug: str) -> YasiiStageDefinition | None:
    return next((stage for stage in YASII_STAGES if stage.slug == slug), None)


def work_item_by_key(key: str) -> YasiiWorkItemDefinition | None:
    return next((item for item in YASII_WORK_ITEMS if item.key == key), None)


def work_item_track(key: str) -> str:
    return "ace" if key in ACE_TRACK_ITEM_KEYS else "yasii"


def work_items_by_track(track: str) -> list[YasiiWorkItemDefinition]:
    return [item for item in YASII_WORK_ITEMS if work_item_track(item.key) == track]


def count_dependency_edges() -> int:
    total = 0
    for item in YASII_WORK_ITEMS:
        for dep in item.depends_on:
            if dep not in {"MVP_PHASES_COMPLETE", "MVP_WORK_ITEMS_COMPLETE"}:
                total += 1
    return total


def validate_catalog() -> list[str]:
    errors: list[str] = []
    if len(YASII_STAGES) != 10:
        errors.append(f"expected 10 stages, got {len(YASII_STAGES)}")
    if len(YASII_WORK_ITEMS) != 74:
        errors.append(f"expected 74 work items, got {len(YASII_WORK_ITEMS)}")
    keys = [item.key for item in YASII_WORK_ITEMS]
    if len(keys) != len(set(keys)):
        errors.append("duplicate work item keys")
    checks = [item.analyzer_check for item in YASII_WORK_ITEMS]
    if len(checks) != len(set(checks)):
        errors.append("duplicate analyzer checks")
    for stage in YASII_STAGES:
        items = work_items_by_stage(stage.slug)
        weight_sum = sum(item.weight for item in items)
        if weight_sum != 100:
            errors.append(f"stage {stage.slug} weights sum to {weight_sum}, expected 100")
    ace_items = work_items_by_track("ace")
    yasii_items = work_items_by_track("yasii")
    if len(ace_items) != 5:
        errors.append(f"expected 5 ACE track items, got {len(ace_items)}")
    if len(yasii_items) != 69:
        errors.append(f"expected 69 YASII track items, got {len(yasii_items)}")
    return errors
