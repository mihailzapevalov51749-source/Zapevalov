"""YASII analyzer evidence checks — one per work item."""

from __future__ import annotations

from pathlib import Path

from app.core.runtime_paths import get_dev_docs_architecture_dir, get_dev_frontend_src_dir
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
    docs = get_dev_docs_architecture_dir()
    if docs is None and ctx.dev_monorepo_root is not None:
        docs = ctx.dev_monorepo_root / "docs" / "architecture"
    if docs is None:
        return Path("__missing_docs__") / name
    return docs / name


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
    disk_path = ctx.app_root / normalized
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
    disk_path = ctx.app_root / normalized
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
    if not ctx.filesystem_scan_enabled:
        return ""
    frontend_src = get_dev_frontend_src_dir()
    if frontend_src is None and ctx.dev_monorepo_root is not None:
        frontend_src = ctx.dev_monorepo_root / "frontend" / "src"
    if frontend_src is None:
        return ""
    disk_path = frontend_src / normalized
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


def _check_p8_w01_user_memory_store(ctx: ScanContext) -> bool:
    store_path = "modules/yasii/user_memory_store.py"
    answers_path = "modules/yasii/user_memory_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    orchestrator_text = _backend_file_text(ctx, "modules/yasii/runtime_orchestrator.py")
    memory_text = _backend_file_text(ctx, "modules/yasii/memory.py")

    if not (
        _yasii_file(ctx, store_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            runtime_text,
            "resolve_user_memory_command",
            "MEMORY_LOADED",
            "MEMORY_SAVED",
        )
        and _file_defines_symbols(orchestrator_text, '"userId"', '"tenantId"')
        and _file_defines_symbols(
            memory_text,
            "save_memory",
            "load_memory",
            "delete_memory",
        )
    ):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.user_memory_store import (
            clear_user_memory_store,
            delete_user_memory_facts,
            list_user_memory_facts,
            save_user_memory_fact,
            set_user_memory_data_dir,
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            set_user_memory_data_dir(Path(temp_dir))
            clear_user_memory_store()
            save_user_memory_fact("tenant-a", "user-a", "меня зовут Михаил")
            facts = list_user_memory_facts("tenant-a", "user-a")
            if len(facts) != 1:
                return False
            removed = delete_user_memory_facts("tenant-a", "user-a", "Михаил")
            if len(removed) != 1:
                return False
            if list_user_memory_facts("tenant-a", "user-a"):
                return False
            store_file = Path(temp_dir) / "tenant-a__user-a.json"
            if not store_file.exists():
                return False
        set_user_memory_data_dir(None)
        return True
    except Exception:
        return False


def _check_p8_w02_tenant_memory_store(ctx: ScanContext) -> bool:
    store_path = "modules/yasii/tenant_memory_store.py"
    answers_path = "modules/yasii/tenant_memory_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")

    if not (
        _yasii_file(ctx, store_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            runtime_text,
            "resolve_tenant_memory_command",
            "TENANT_MEMORY_LOADED",
            "TENANT_MEMORY_SAVED",
            "tenant_memory_message",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, "modules/yasii/memory.py"),
            "load_tenant_memory",
            "save_tenant_memory",
            "delete_tenant_memory",
        )
    ):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.tenant_memory_store import (
            clear_tenant_memory_store,
            delete_tenant_memory_facts,
            list_tenant_memory_facts,
            save_tenant_memory_fact,
            set_tenant_memory_data_dir,
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            set_tenant_memory_data_dir(Path(temp_dir))
            clear_tenant_memory_store()
            save_tenant_memory_fact(
                "tenant-a",
                "СДС означает Служба дирекции строительства.",
            )
            facts_a = list_tenant_memory_facts("tenant-a")
            if len(facts_a) != 1:
                return False
            save_tenant_memory_fact("tenant-b", "СДС означает Другая служба.")
            if len(list_tenant_memory_facts("tenant-b")) != 1:
                return False
            if list_tenant_memory_facts("tenant-a") != facts_a:
                return False
            removed = delete_tenant_memory_facts(
                "tenant-a",
                "СДС означает Служба дирекции строительства.",
            )
            if len(removed) != 1:
                return False
            if list_tenant_memory_facts("tenant-a"):
                return False
            store_file = Path(temp_dir) / "tenant__tenant-a.json"
            if not store_file.exists():
                return False
        set_tenant_memory_data_dir(None)
        return True
    except Exception:
        return False


def _check_p8_w03_decision_memory_linked(ctx: ScanContext) -> bool:
    store_path = "modules/yasii/decision_memory_store.py"
    answers_path = "modules/yasii/decision_memory_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    memory_text = _backend_file_text(ctx, "modules/yasii/memory.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, store_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            runtime_text,
            "resolve_decision_memory_command",
            "decision_memory_message",
            "DECISION_SAVED",
            "DECISION_CONFLICT_DETECTED",
            "load_decision_memory",
        )
        and _file_defines_symbols(
            memory_text,
            "load_decision_memory",
        )
        and _file_defines_symbols(
            trace_text,
            "decision_saved",
            "decision_loaded",
            "decision_conflict_detected",
        )
    ):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.decision_memory_answers import resolve_decision_memory_command
        from app.modules.yasii.decision_memory_store import (
            clear_decision_memory_store,
            detect_decision_conflict,
            list_decision_records,
            set_decision_memory_data_dir,
        )
        from app.modules.yasii.memory_graph_store import (
            clear_memory_graph_store,
            set_memory_graph_data_dir,
        )

        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                set_decision_memory_data_dir(temp_path / "decisions")
                set_memory_graph_data_dir(temp_path / "graph")
                clear_decision_memory_store()
                clear_memory_graph_store()
                payload = {"tenantId": "tenant-a", "userId": "user-a", "sessionId": "session-a"}
                save_result = resolve_decision_memory_command(
                    "Запомни решение: Мы решили использовать один ЯСИИ на всю платформу.",
                    payload,
                )
                if save_result is None or not save_result.decision_saved:
                    return False
                if len(list_decision_records("tenant-a")) != 1:
                    return False
                conflict = detect_decision_conflict("tenant-a", "Создадим отдельный Dashboard YASII.")
                if conflict is None or "противоречит" not in conflict:
                    return False
                deactivate = resolve_decision_memory_command(
                    "Отмени решение: один ЯСИИ на всю платформу.",
                    payload,
                )
                if deactivate is None or not deactivate.decision_updated:
                    return False
                if list_decision_records("tenant-a"):
                    return False
            return True
        finally:
            set_decision_memory_data_dir(None)
            set_memory_graph_data_dir(None)
    except Exception:
        return False


def _check_p8_w05_process_memory_schema(ctx: ScanContext) -> bool:
    schema_path = "modules/yasii/process_memory.py"
    memory_text = _backend_file_text(ctx, "modules/yasii/memory.py")
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, schema_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, schema_path),
            "ProcessMemoryRecord",
            "ProcessDefinitionSnapshot",
            "ProcessInstanceSnapshot",
            "ProcessStepSnapshot",
            "ProcessMemoryStorageContract",
            "SchemaOnlyProcessMemoryRepository",
            "ProcessDecisionLink",
        )
        and _file_defines_symbols(
            memory_text,
            "load_process_memory",
            "save_process_memory",
            "link_process_decision",
        )
        and _file_defines_symbols(runtime_text, "load_process_memory", "PROCESS_MEMORY_LOADED")
        and _file_defines_symbols(
            trace_text,
            "process_memory_loaded",
            "process_memory_saved",
            "process_memory_linked",
            "process_memory_instance_created",
            "process_memory_step_updated",
        )
    ):
        return False

    schema_text = _backend_file_text(ctx, schema_path).casefold()
    forbidden = (
        "bpmnengine",
        "bpmn_engine",
        "workflowruntime",
        "workflow_runtime",
        "processruntimeengine",
        "mock_bpmn",
        "fake_process_instance",
    )
    if any(token in schema_text for token in forbidden):
        return False

    try:
        from app.modules.yasii.memory import (
            MemoryContext,
            link_process_decision,
            load_process_memory,
            save_process_memory,
        )
        from app.modules.yasii.process_memory import (
            ProcessDefinitionSnapshot,
            ProcessMemoryLinkRequest,
            ProcessMemoryRuntimeUnavailableError,
            ProcessMemorySaveRequest,
            SchemaOnlyProcessMemoryRepository,
            get_process_memory_repository,
        )

        if not isinstance(get_process_memory_repository(), SchemaOnlyProcessMemoryRepository):
            return False

        context = MemoryContext(tenantId="tenant-a", processId="wf-a")
        snapshot = load_process_memory(context)
        if snapshot.runtimeAvailable:
            return False
        if save_process_memory(
            context,
            request=ProcessMemorySaveRequest(
                tenantId="tenant-a",
                definition=ProcessDefinitionSnapshot(processId="wf-a", processName="Schema"),
            ),
        ):
            return False
        if link_process_decision(
            context,
            request=ProcessMemoryLinkRequest(
                tenantId="tenant-a",
                decisionId="dec-a",
                processId="wf-a",
            ),
        ):
            return False

        try:
            get_process_memory_repository().save_record(
                ProcessMemorySaveRequest(
                    tenantId="tenant-a",
                    definition=ProcessDefinitionSnapshot(processId="wf-a", processName="Schema"),
                ),
            )
        except ProcessMemoryRuntimeUnavailableError:
            return True
        return False
    except Exception:
        return False


def _check_yasii_user_identity_integration(ctx: ScanContext) -> bool:
    host_text = _backend_file_text(ctx, "modules/ai_context/host_context.py")
    handoff_text = _backend_file_text(ctx, "modules/ai_context/handoff.py")
    answers_text = _backend_file_text(ctx, "modules/yasii/user_identity_answers.py")
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    orchestrator_text = _backend_file_text(ctx, "modules/yasii/runtime_orchestrator.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")
    frontend_src = get_dev_frontend_src_dir()
    if frontend_src is None and ctx.dev_monorepo_root is not None:
        frontend_src = ctx.dev_monorepo_root / "frontend" / "src"
    frontend_path = (
        (frontend_src / "yasii" / "hostContextBuilders.js")
        if frontend_src is not None
        else Path("__missing_frontend__")
    )

    if not (
        _file_defines_symbols(host_text, "userIdentity", "UserIdentity")
        and _file_defines_symbols(handoff_text, "userIdentity")
        and _file_defines_symbols(answers_text, "resolve_user_identity_command", "is_user_identity_command")
        and _file_defines_symbols(runtime_text, "resolve_user_identity_command", "user_identity_message")
        and _file_defines_symbols(orchestrator_text, "userIdentity")
        and _file_defines_symbols(trace_text, "user_identity_loaded", "user_identity_answered")
        and frontend_path.is_file()
        and "buildUserIdentityFromCurrentUser" in frontend_path.read_text(encoding="utf-8")
        and "attachUserIdentity" in frontend_path.read_text(encoding="utf-8")
    ):
        return False

    try:
        from app.modules.yasii.user_identity_answers import resolve_user_identity_command
        from app.modules.yasii.user_memory_store import clear_user_memory_store, list_user_memory_facts

        payload = {
            "tenantId": "tenant-a",
            "userId": "user-a",
            "userIdentity": {
                "userId": "user-a",
                "displayName": "Михаил Запевалов",
                "email": "test@example.com",
                "position": "Архитектор",
                "roles": ["admin"],
            },
        }
        result = resolve_user_identity_command("Кто я?", payload)
        if result is None or "Михаил" not in result.message:
            return False
        blocked = resolve_user_identity_command("Кто такой Иван Петров?", payload)
        if blocked is None or "других" not in blocked.message.lower():
            return False
        clear_user_memory_store()
        if list_user_memory_facts("tenant-a", "user-a"):
            return False
        return True
    except Exception:
        return False


def _check_p8_w06_memory_graph_linked(ctx: ScanContext) -> bool:
    graph_path = "modules/yasii/memory_graph.py"
    store_path = "modules/yasii/memory_graph_store.py"
    answers_path = "modules/yasii/memory_graph_answers.py"
    memory_text = _backend_file_text(ctx, "modules/yasii/memory.py")
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, graph_path)
        and _yasii_file(ctx, store_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, graph_path),
            "MemoryGraphNode",
            "MemoryGraphLink",
            "MemoryGraphSnapshot",
            "sync_decision_graph_links",
            "link_memory_nodes",
        )
        and _file_defines_symbols(
            memory_text,
            "load_memory_graph",
            "link_memory_nodes",
            "build_memory_snapshot",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_memory_graph_command",
            "memory_graph_message",
            "MEMORY_GRAPH_LOADED",
            "load_memory_graph",
        )
        and _file_defines_symbols(
            trace_text,
            "memory_graph_loaded",
            "memory_graph_link_created",
            "memory_graph_snapshot_generated",
        )
    ):
        return False

    combined_text = (
        _backend_file_text(ctx, graph_path)
        + _backend_file_text(ctx, store_path)
        + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = (
        "neo4j",
        "vectordb",
        "vector db",
        "embedding",
        "semantic search",
        "rag retrieval",
    )
    if any(token in combined_text for token in forbidden):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.decision_memory_answers import resolve_decision_memory_command
        from app.modules.yasii.decision_memory_store import (
            clear_decision_memory_store,
            set_decision_memory_data_dir,
        )
        from app.modules.yasii.memory_graph_answers import resolve_memory_graph_command
        from app.modules.yasii.memory_graph_store import (
            clear_memory_graph_store,
            list_graph_links,
            set_memory_graph_data_dir,
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            graph_dir = Path(temp_dir) / "graph"
            decision_dir = Path(temp_dir) / "decision"
            graph_dir.mkdir()
            decision_dir.mkdir()
            set_memory_graph_data_dir(graph_dir)
            set_decision_memory_data_dir(decision_dir)
            clear_memory_graph_store()
            clear_decision_memory_store()
            payload = {"tenantId": "tenant-a", "userId": "user-a", "sessionId": "session-a"}
            save_result = resolve_decision_memory_command(
                "Запомни решение: Мы решили использовать Memory Graph.",
                payload,
            )
            if save_result is None or not save_result.decision_saved:
                return False
            if not list_graph_links("tenant-a"):
                return False
            query = resolve_memory_graph_command(
                "Какие решения связаны с этой сессией?",
                payload,
            )
            if query is None or "Memory Graph" not in query.message:
                return False
        set_memory_graph_data_dir(None)
        set_decision_memory_data_dir(None)
        return True
    except Exception:
        return False


def _check_p9_w01_strategy_engine_operational(ctx: ScanContext) -> bool:
    engine_path = "modules/yasii/strategy_engine.py"
    answers_path = "modules/yasii/strategy_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, engine_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, engine_path),
            "StrategyAssessment",
            "ImpactAssessment",
            "ConsistencyAssessment",
            "RecommendationAssessment",
            "GoalAlignmentAssessment",
            "assess_decision_impact",
            "assess_consistency",
            "assess_recommendations",
            "assess_goal_alignment",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_strategy_command",
            "is_strategy_command",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_strategy_command",
            "strategy_message",
            "STRATEGY_ASSESSMENT_CREATED",
        )
        and _file_defines_symbols(
            trace_text,
            "strategy_assessment_created",
            "strategy_recommendation_generated",
            "strategy_conflict_detected",
            "strategy_goal_alignment_checked",
        )
    ):
        return False

    combined_text = (
        _backend_file_text(ctx, engine_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = (
        "openai",
        "langchain",
        "neo4j",
        "vectordb",
        "embedding",
        "autonomous agent",
        "rag retrieval",
    )
    if any(token in combined_text for token in forbidden):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.decision_memory_store import (
            clear_decision_memory_store,
            save_decision_record,
            set_decision_memory_data_dir,
        )
        from app.modules.yasii.strategy_answers import resolve_strategy_command

        with tempfile.TemporaryDirectory() as temp_dir:
            decision_dir = Path(temp_dir) / "decision"
            decision_dir.mkdir()
            set_decision_memory_data_dir(decision_dir)
            clear_decision_memory_store()
            payload = {"tenantId": "tenant-a", "userId": "user-a", "sessionId": "session-a"}
            save_decision_record(
                "tenant-a",
                "Мы решили использовать один ЯСИИ на всю платформу.",
            )
            conflict = resolve_strategy_command(
                "Создадим отдельный Dashboard YASII.",
                payload,
            )
            if conflict is None or not conflict.conflict_detected:
                return False
            if "противоречит" not in conflict.message.casefold():
                return False
            from app.modules.yasii.strategy_engine import assess_recommendations

            recommendation = assess_recommendations("tenant-a", payload)
            if (
                recommendation.recommendation is None
                or not recommendation.recommendation.recommendations
            ):
                return False
        set_decision_memory_data_dir(None)
        return True
    except Exception:
        return False


def _check_p9_w04_strategy_recommendation_templates(ctx: ScanContext) -> bool:
    engine_path = "modules/yasii/recommendation_templates.py"
    answers_path = "modules/yasii/recommendation_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, engine_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, engine_path),
            "RecommendationTemplate",
            "RecommendationAssessment",
            "RecommendationType",
            "build_recommendation_assessment",
            "format_recommendation_message",
            "select_recommendation_type",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_recommendation_command",
            "is_recommendation_command",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_recommendation_command",
            "recommendation_message",
            "RECOMMENDATION_GENERATED",
            "RECOMMENDATION_TEMPLATE_SELECTED",
        )
        and _file_defines_symbols(
            trace_text,
            "recommendation_generated",
            "recommendation_template_selected",
            "recommendation_next_step_created",
            "recommendation_blocker_resolution_created",
        )
    ):
        return False

    combined_text = (
        _backend_file_text(ctx, engine_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = (
        "openai",
        "embedding",
        "vectordb",
        "langchain",
        "autonomous agent",
        "vector search",
    )
    if any(token in combined_text for token in forbidden):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.decision_memory_store import (
            clear_decision_memory_store,
            save_decision_record,
            set_decision_memory_data_dir,
        )
        from app.modules.yasii.recommendation_answers import resolve_recommendation_command
        from app.modules.yasii.recommendation_templates import RecommendationType

        with tempfile.TemporaryDirectory() as temp_dir:
            decision_dir = Path(temp_dir) / "decision"
            decision_dir.mkdir()
            set_decision_memory_data_dir(decision_dir)
            clear_decision_memory_store()
            payload = {
                "tenantId": "tenant-a",
                "userId": "user-a",
                "sessionId": "session-a",
                "dashboardMetadata": {"currentWorkItems": "P9-W04 Strategy Recommendation Templates"},
            }
            save_decision_record(
                "tenant-a",
                "Мы решили использовать один ЯСИИ на всю платформу.",
            )
            next_step = resolve_recommendation_command("Что делать дальше?", payload)
            if (
                next_step is None
                or "RecommendationTemplate: NEXT_STEP" not in next_step.message
            ):
                return False
            priority = resolve_recommendation_command("Что сейчас лучше сделать?", payload)
            if (
                priority is None
                or priority.recommendation_type != RecommendationType.PRIORITY.value
            ):
                return False
            blocker = resolve_recommendation_command("Как устранить блокер?", payload)
            if (
                blocker is None
                or "RecommendationTemplate: BLOCKER_RESOLUTION" not in blocker.message
            ):
                return False
            goal = resolve_recommendation_command("Как достичь цели?", payload)
            if goal is None or "RecommendationTemplate: GOAL_ALIGNMENT" not in goal.message:
                return False
        set_decision_memory_data_dir(None)
        return True
    except Exception:
        return False


def _check_p9_w05_architect_profile_active(ctx: ScanContext) -> bool:
    engine_path = "modules/yasii/architect_profile.py"
    answers_path = "modules/yasii/architect_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    doc_paths = (
        "docs/architecture/YASII_DOMAIN_MODEL.md",
        "docs/architecture/YASII_SYSTEM_MAP.md",
        "docs/architecture/YASII_HOST_INTEGRATION_CONTRACT.md",
        "docs/architecture/ADR_YASII_AI_CONTEXT_BOUNDARY.md",
    )

    if not (
        _yasii_file(ctx, engine_path)
        and _yasii_file(ctx, answers_path)
        and all((ctx.repo_root / path).is_file() for path in doc_paths)
        and _file_defines_symbols(
            _backend_file_text(ctx, engine_path),
            "ArchitectAssessment",
            "ArchitectAnswer",
            "ArchitectKnowledgeSource",
            "build_architect_assessment",
            "format_architect_message",
            "find_architect_component",
            "classify_architect_question",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_architect_command",
            "is_architect_command",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_architect_command",
            "architect_message",
            "ARCHITECT_PROFILE_LOADED",
            "ARCHITECT_QUESTION_ANSWERED",
        )
        and _file_defines_symbols(
            trace_text,
            "architect_profile_loaded",
            "architect_question_answered",
            "architect_dependency_analyzed",
            "architect_change_impact_analyzed",
        )
    ):
        return False

    combined_text = (
        _backend_file_text(ctx, engine_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = (
        "openai",
        "embedding",
        "architect agent",
        "architect mode",
        "architect chat",
        "architect workspace",
        "autonomous architecture",
        "code generator",
        "llm architect",
    )
    if any(token in combined_text for token in forbidden):
        return False

    try:
        from app.modules.yasii.architect_answers import resolve_architect_command

        payload: dict = {"tenantId": "tenant-a"}
        overview = resolve_architect_command("Как устроена платформа?", payload)
        if overview is None or "Architect Assessment" not in overview.message:
            return False
        if "YASII_SYSTEM_MAP.md" not in overview.message:
            return False

        ace = resolve_architect_command("Почему используется ACE?", payload)
        if ace is None or "ADR_YASII_AI_CONTEXT_BOUNDARY.md" not in ace.message:
            return False

        deps = resolve_architect_command("Что зависит от HostContext?", payload)
        if deps is None or not deps.dependency_analyzed:
            return False
        if "ACE" not in deps.message:
            return False

        impact = resolve_architect_command("Что произойдёт если изменить HostContext?", payload)
        if impact is None or not impact.change_impact_analyzed:
            return False
        if "Затронутые компоненты" not in impact.message and "затронут" not in impact.message.casefold():
            return False
        return True
    except Exception:
        return False


def _check_p9_w06_improvement_query_standalone(ctx: ScanContext) -> bool:
    engine_path = "modules/yasii/improvement_query.py"
    answers_path = "modules/yasii/improvement_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    doc_paths = (
        "docs/architecture/YASNOPRO_ARCHITECTURE_STATUS.md",
        "docs/architecture/YASII_IMPLEMENTATION_ROADMAP.md",
    )

    if not (
        _yasii_file(ctx, engine_path)
        and _yasii_file(ctx, answers_path)
        and all((ctx.repo_root / path).is_file() for path in doc_paths)
        and _file_defines_symbols(
            _backend_file_text(ctx, engine_path),
            "ImprovementAssessment",
            "ImprovementCandidate",
            "ImprovementCategory",
            "collect_improvement_candidates",
            "build_improvement_assessment",
            "format_improvement_message",
            "select_improvement_focus_category",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_improvement_command",
            "is_improvement_command",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_improvement_command",
            "improvement_message",
            "IMPROVEMENT_QUERY_EXECUTED",
            "IMPROVEMENT_ASSESSMENT_CREATED",
        )
        and _file_defines_symbols(
            trace_text,
            "improvement_query_executed",
            "improvement_candidate_found",
            "improvement_assessment_created",
            "improvement_recommendation_generated",
        )
    ):
        return False

    combined_text = (
        _backend_file_text(ctx, engine_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = (
        "openai",
        "embedding",
        "vector search",
        "auto fix",
        "auto optimization",
        "code generator",
        "autonomous improvement agent",
        "ai refactoring engine",
    )
    if any(token in combined_text for token in forbidden):
        return False

    try:
        from app.modules.yasii.improvement_answers import resolve_improvement_command
        from app.modules.yasii.improvement_query import ImprovementCategory

        payload = {"tenantId": "tenant-a", "userId": "user-a", "sessionId": "session-a"}
        general = resolve_improvement_command("Что можно улучшить?", payload)
        if general is None or "Improvement Assessment" not in general.message:
            return False
        if not general.candidate_found:
            return False

        debt = resolve_improvement_command("Есть ли технический долг?", payload)
        if debt is None or debt.focus_category != ImprovementCategory.TECHNICAL_DEBT.value:
            return False
        if "TECHNICAL_DEBT" not in debt.message:
            return False

        readiness = resolve_improvement_command(
            "Что мешает повысить готовность платформы?",
            payload,
        )
        if readiness is None or readiness.focus_category != ImprovementCategory.READINESS.value:
            return False

        knowledge = resolve_improvement_command("Какие улучшения нужны ЯСИИ?", payload)
        if knowledge is None or knowledge.focus_category not in {
            ImprovementCategory.KNOWLEDGE.value,
            ImprovementCategory.MEMORY.value,
        }:
            return False
        return True
    except Exception:
        return False


def _check_p9_w02_unlock_score_ranking(ctx: ScanContext) -> bool:
    engine_path = "modules/yasii/unlock_score.py"
    answers_path = "modules/yasii/unlock_score_answers.py"
    strategy_path = "modules/yasii/strategy_engine.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, engine_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, engine_path),
            "UnlockCandidate",
            "UnlockAssessment",
            "UnlockScore",
            "collect_unlock_candidates",
            "score_unlock_candidate",
            "build_unlock_assessment",
            "format_unlock_message",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_unlock_command",
            "is_unlock_command",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, strategy_path),
            "assess_decision_impact",
            "assess_goal_alignment",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_unlock_command",
            "unlock_message",
            "UNLOCK_SCORE_GENERATED",
            "UNLOCK_RANKING_CREATED",
        )
        and _file_defines_symbols(
            trace_text,
            "unlock_score_generated",
            "unlock_ranking_created",
            "unlock_candidate_scored",
        )
    ):
        return False

    combined_text = (
        _backend_file_text(ctx, engine_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = (
        "openai",
        "embedding",
        "vectordb",
        "semantic search",
        "machine learning",
        "neural",
        "neo4j",
    )
    if any(token in combined_text for token in forbidden):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.decision_memory_store import (
            clear_decision_memory_store,
            save_decision_record,
            set_decision_memory_data_dir,
        )
        from app.modules.yasii.unlock_score import build_unlock_assessment, score_unlock_candidate
        from app.modules.yasii.unlock_score_answers import resolve_unlock_command

        with tempfile.TemporaryDirectory() as temp_dir:
            decision_dir = Path(temp_dir) / "decision"
            decision_dir.mkdir()
            set_decision_memory_data_dir(decision_dir)
            clear_decision_memory_store()
            payload = {
                "tenantId": "tenant-a",
                "userId": "user-a",
                "sessionId": "session-a",
                "hostSurface": "dashboard",
                "dashboardMetadata": {"currentWorkItems": "P9-W02 Unlock Score Ranking"},
            }
            save_decision_record(
                "tenant-a",
                "Мы решили завершить Memory Graph перед стратегией.",
            )
            assessment = build_unlock_assessment("tenant-a", payload)
            if not assessment.candidates or assessment.topCandidate is None:
                return False
            if assessment.topCandidate.score <= 0:
                return False
            scored = score_unlock_candidate(assessment.candidates[0], "tenant-a", payload)
            if scored.score <= 0 or not scored.signals:
                return False
            ranking = resolve_unlock_command("Что сейчас наиболее важно?", payload)
            if ranking is None or "Unlock Ranking" not in ranking.message:
                return False
            if not ranking.ranking_created:
                return False
        set_decision_memory_data_dir(None)
        return True
    except Exception:
        return False


def _check_p9_w03_blocker_detection(ctx: ScanContext) -> bool:
    engine_path = "modules/yasii/blocker_detection.py"
    answers_path = "modules/yasii/blocker_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, engine_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, engine_path),
            "BlockerCandidate",
            "BlockerAssessment",
            "BlockerType",
            "build_blocker_assessment",
            "detect_decision_conflict_blocker",
            "detect_missing_dependency_blockers",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_blocker_command",
            "is_blocker_command",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_blocker_command",
            "blocker_message",
            "BLOCKER_DETECTED",
            "BLOCKER_CONFLICT_FOUND",
        )
        and _file_defines_symbols(
            trace_text,
            "blocker_detected",
            "blocker_assessment_created",
            "blocker_dependency_found",
            "blocker_conflict_found",
        )
    ):
        return False

    combined_text = (
        _backend_file_text(ctx, engine_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = (
        "openai",
        "embedding",
        "bpmn",
        "vector search",
        "machine learning",
        "risk engine",
    )
    if any(token in combined_text for token in forbidden):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.blocker_answers import resolve_blocker_command
        from app.modules.yasii.decision_memory_store import (
            clear_decision_memory_store,
            save_decision_record,
            set_decision_memory_data_dir,
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            decision_dir = Path(temp_dir) / "decision"
            decision_dir.mkdir()
            set_decision_memory_data_dir(decision_dir)
            clear_decision_memory_store()
            payload = {"tenantId": "tenant-a", "userId": "user-a", "sessionId": "session-a"}
            save_decision_record(
                "tenant-a",
                "Мы решили использовать один ЯСИИ на всю платформу.",
            )
            conflict = resolve_blocker_command(
                "Сделаем отдельный Dashboard YASII. Есть ли блокеры?",
                payload,
            )
            if conflict is None or not conflict.conflict_found:
                return False
            if "Decision Conflict" not in conflict.message and "decision_conflict" not in conflict.message.casefold():
                if "Конфликт" not in conflict.message:
                    return False
            missing = resolve_blocker_command(
                "Что мешает начать работу по архитектуре памяти?",
                payload,
            )
            if missing is None or "Missing Decision" not in missing.message and "решение" not in missing.message.casefold():
                return False
        set_decision_memory_data_dir(None)
        return True
    except Exception:
        return False


def _check_p8_w04_session_memory_multiturn(ctx: ScanContext) -> bool:
    store_path = "modules/yasii/session_memory_store.py"
    answers_path = "modules/yasii/session_memory_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    handoff_text = _backend_file_text(ctx, "modules/ai_context/handoff.py")

    if not (
        _yasii_file(ctx, store_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            runtime_text,
            "resolve_session_memory_command",
            "SESSION_MEMORY_LOADED",
            "SESSION_MEMORY_UPDATED",
            "record_session_exchange",
            "session_memory_message",
        )
        and _file_defines_symbols(handoff_text, "sessionId")
        and _file_defines_symbols(
            _backend_file_text(ctx, "modules/yasii/memory.py"),
            "load_session_memory_snapshot",
            "sessionId",
        )
    ):
        return False

    try:
        from app.modules.yasii.session_memory_store import (
            build_session_summary_message,
            clear_session_memory_store,
            load_session_memory,
            record_session_exchange,
        )

        clear_session_memory_store()
        record_session_exchange(
            "tenant-a",
            "user-a",
            "session-a",
            user_text="Обсудили Dashboard.",
            assistant_text="Контекст сохранён.",
        )
        state_a = load_session_memory("tenant-a", "user-a", "session-a")
        if not state_a.turns:
            return False
        record_session_exchange(
            "tenant-a",
            "user-a",
            "session-b",
            user_text="Другая сессия.",
            assistant_text="Ок.",
        )
        state_b = load_session_memory("tenant-a", "user-a", "session-b")
        if state_b is state_a:
            return False
        summary = build_session_summary_message(state_a)
        if "Dashboard" not in summary:
            return False
        clear_session_memory_store()
        return True
    except Exception:
        return False


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
        "YASII_EMBEDDED_ENDPOINTS",
        "/ai-context/tenants/",
        "/yasii/tenants/",
    ) and _file_defines_symbols(hook_text, "sendEmbeddedQuery") and "sendYasiiQuery" not in hook_text


def _check_p7_w04_dashboard_integration_complete(ctx: ScanContext) -> bool:
    workspace_text = _frontend_file_text(
        ctx,
        "yasii/pages/YasiiWorkspacePage.jsx",
    )
    host_context_text = _frontend_file_text(ctx, "yasii/hostContextBuilders.js")
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    panel_text = _frontend_file_text(ctx, "yasii/components/YasiiEmbeddedPanel.jsx")
    adapters_text = _frontend_file_text(ctx, "yasii/embedded/surfaceAdapters.js")
    return (
        _check_p7_w04_dashboard_host_context_bridge(ctx)
        and _check_p7_w04_dashboard_embedded_query(ctx)
        and _file_defines_symbols(
            workspace_text,
            "YasiiSurfaceContextProvider",
        )
        and _file_defines_symbols(
            host_context_text,
            "buildPlatformDashboardMetadata",
        )
        and _file_defines_symbols(
            floating_text,
            "YasiiLauncher",
            "useYasiiResolvedSurface",
        )
        and _file_defines_symbols(
            panel_text,
            "useYasiiEmbeddedQuery",
            "resolveEmbeddedSurface",
            "sourceLabel",
        )
        and _file_defines_symbols(
            adapters_text,
            "buildDashboardContext",
            "buildPlatformDashboardHostContext",
        )
        and "PlatformDashboardYasiiEntry" not in workspace_text
        and "hideOnPlatformDashboard" not in floating_text
        and "sendYasiiQuery" not in floating_text
        and "sendYasiiQuery" not in panel_text
        and "/yasii/query" not in workspace_text
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
    workspace_text = _frontend_file_text(
        ctx,
        "yasii/pages/YasiiWorkspacePage.jsx",
    )
    route_text = _frontend_file_text(
        ctx,
        "yasii/embedded/resolveSurfaceFromRoute.js",
    )
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    panel_text = _frontend_file_text(ctx, "yasii/components/YasiiEmbeddedPanel.jsx")
    return (
        _file_defines_symbols(
            workspace_text,
            "YasiiSurfaceContextProvider",
        )
        and _file_defines_symbols(
            route_text,
            "EMBEDDED_SURFACE_IDS.DASHBOARD",
        )
        and "PlatformDashboardYasiiEntry" not in workspace_text
        and _file_defines_symbols(
            floating_text,
            "YasiiLauncher",
            "useYasiiResolvedSurface",
        )
        and _file_defines_symbols(
            panel_text,
            "resolveEmbeddedSurface",
            "YasiiEmbeddedContextHeader",
            "resolveYasiiSourceLabel",
            "sourceLabel",
        )
        and "hideOnPlatformDashboard" not in floating_text
        and "placement=\"inline\"" not in floating_text
        and "sendYasiiQuery" not in floating_text
        and "/yasii/query" not in workspace_text
    )


def _check_p7_w08_global_entry_point(ctx: ScanContext) -> bool:
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    launcher_text = _frontend_file_text(ctx, "yasii/components/YasiiLauncher.jsx")
    return (
        _file_defines_symbols(
            floating_text,
            "YasiiLauncher",
            "useYasiiResolvedSurface",
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


def _check_p7_w02_object_context_adapter(ctx: ScanContext) -> bool:
    adapters_text = _frontend_file_text(ctx, "yasii/embedded/surfaceAdapters.js")
    builders_text = _frontend_file_text(ctx, "yasii/hostContextBuilders.js")
    return (
        _file_defines_symbols(
            adapters_text,
            "buildObjectCardContext",
            "buildObjectCardHostContext",
            "EMBEDDED_SURFACE_IDS.OBJECT_CARD",
        )
        and _file_defines_symbols(
            builders_text,
            "buildObjectCardHostContext",
            "objectTypeId",
            "objectTitle",
            "activeTab",
        )
    )


def _check_p7_w02_object_surface_provider(ctx: ScanContext) -> bool:
    object_table_text = _frontend_file_text(ctx, "modules/objectViews/table/ObjectTableView.jsx")
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    route_text = _frontend_file_text(ctx, "yasii/embedded/resolveSurfaceFromRoute.js")
    return (
        _file_defines_symbols(
            object_table_text,
            "YasiiSurfaceContextProvider",
            "EMBEDDED_SURFACE_IDS.OBJECT_CARD",
            "objectTypeId",
            "objectTitle",
        )
        and _file_defines_symbols(
            floating_text,
            "useYasiiResolvedSurface",
            "YasiiLauncher",
        )
        and _file_defines_symbols(
            route_text,
            "isObjectRegistryTableRoute",
            "EMBEDDED_SURFACE_IDS.REGISTRY",
        )
    )


def _check_p7_w02_object_card_answers(ctx: ScanContext) -> bool:
    object_answers_text = _backend_file_text(ctx, "modules/yasii/object_card_context_answers.py")
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    return _file_defines_symbols(
        object_answers_text,
        "resolve_object_card_context_message",
        "что это за объект",
        "что известно об этом объекте",
        "_build_object_card_what_is_answer",
    ) and _file_defines_symbols(runtime_text, "resolve_object_card_context_message")


def _check_p7_w02_object_integration_complete(ctx: ScanContext) -> bool:
    return (
        _check_p7_w02_object_context_adapter(ctx)
        and _check_p7_w02_object_surface_provider(ctx)
        and _check_p7_w02_object_card_answers(ctx)
        and _check_p7_w08_global_entry_point(ctx)
    )


def _check_p7_w03_registry_context_adapter(ctx: ScanContext) -> bool:
    adapters_text = _frontend_file_text(ctx, "yasii/embedded/surfaceAdapters.js")
    builders_text = _frontend_file_text(ctx, "yasii/hostContextBuilders.js")
    return (
        _file_defines_symbols(
            adapters_text,
            "buildRegistryContext",
            "buildRegistryHostContext",
            "EMBEDDED_SURFACE_IDS.REGISTRY",
        )
        and _file_defines_symbols(
            builders_text,
            "buildRegistryHostContext",
            "registryId",
            "registryName",
            "activeFilters",
            "activeSorts",
        )
        and "stubOnly: true" not in adapters_text.split("EMBEDDED_SURFACE_IDS.REGISTRY", 1)[-1][:600]
    )


def _check_p7_w03_registry_surface_provider(ctx: ScanContext) -> bool:
    object_table_text = _frontend_file_text(ctx, "modules/objectViews/table/ObjectTableView.jsx")
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    return (
        _file_defines_symbols(
            object_table_text,
            "YasiiSurfaceContextProvider",
            "EMBEDDED_SURFACE_IDS.REGISTRY",
            "registryId",
            "registryName",
            "viewName",
            "activeFilters",
        )
        and _file_defines_symbols(
            floating_text,
            "useYasiiResolvedSurface",
            "YasiiLauncher",
        )
        and _file_defines_symbols(
            _frontend_file_text(ctx, "yasii/hooks/useYasiiResolvedSurface.js"),
            "resolveSurfaceFromRoute",
            "getPublishedYasiiSurface",
        )
        and _file_defines_symbols(
            _frontend_file_text(ctx, "yasii/context/yasiiSurfaceBridge.js"),
            "publishYasiiSurface",
            "YASII_SURFACE_BRIDGE_EVENT",
        )
    )


def _check_p7_w03_registry_answers(ctx: ScanContext) -> bool:
    registry_answers_text = _backend_file_text(ctx, "modules/yasii/registry_context_answers.py")
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    orchestrator_text = _backend_file_text(ctx, "modules/yasii/runtime_orchestrator.py")
    return (
        _file_defines_symbols(
            registry_answers_text,
            "resolve_registry_context_message",
            "что сейчас открыто",
            "какие фильтры активны",
            "сколько записей выбрано",
            "_build_registry_what_is_answer",
        )
        and _file_defines_symbols(runtime_text, "resolve_registry_context_message")
        and _file_defines_symbols(orchestrator_text, "registryMetadata")
    )


def _check_p7_w03_registry_integration_complete(ctx: ScanContext) -> bool:
    return (
        _check_p7_w03_registry_context_adapter(ctx)
        and _check_p7_w03_registry_surface_provider(ctx)
        and _check_p7_w03_registry_answers(ctx)
        and _check_p7_w08_global_entry_point(ctx)
    )


def _check_p7_w05_designer_context_adapter(ctx: ScanContext) -> bool:
    adapters_text = _frontend_file_text(ctx, "yasii/embedded/surfaceAdapters.js")
    builders_text = _frontend_file_text(ctx, "yasii/hostContextBuilders.js")
    designer_builder_text = _frontend_file_text(ctx, "yasii/designer/buildDesignerContextData.js")
    return (
        _file_defines_symbols(
            adapters_text,
            "buildDesignerContext",
            "buildDesignerHostContext",
            "EMBEDDED_SURFACE_IDS.DESIGNER",
        )
        and _file_defines_symbols(
            builders_text,
            "buildDesignerHostContext",
            "designerArea",
            "designerEntityType",
            "designerEntityId",
            "designerEntityName",
            "selectedNodeId",
            "selectedNodeName",
        )
        and _file_defines_symbols(
            designer_builder_text,
            "buildDesignerContextData",
            "buildDesignerYasiiSurfaceValue",
        )
        and "stubOnly: true" not in adapters_text.split("EMBEDDED_SURFACE_IDS.DESIGNER", 1)[-1][:700]
        and "enabled: false" not in adapters_text.split("EMBEDDED_SURFACE_IDS.DESIGNER", 1)[-1][:500]
    )


def _check_p7_w05_designer_surface_provider(ctx: ScanContext) -> bool:
    shell_text = _frontend_file_text(ctx, "modules/designer/components/shell/DesignerShell.jsx")
    floating_text = _frontend_file_text(ctx, "yasii/components/YasiiFloatingButton.jsx")
    return (
        _file_defines_symbols(
            shell_text,
            "YasiiSurfaceContextProvider",
            "buildDesignerYasiiSurfaceValue",
        )
        and _file_defines_symbols(
            floating_text,
            "useYasiiResolvedSurface",
            "YasiiLauncher",
        )
        and _file_defines_symbols(
            _frontend_file_text(ctx, "yasii/hooks/useYasiiResolvedSurface.js"),
            "getPublishedYasiiSurface",
        )
    )


def _check_p7_w05_designer_answers(ctx: ScanContext) -> bool:
    designer_answers_text = _backend_file_text(ctx, "modules/yasii/designer_context_answers.py")
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    orchestrator_text = _backend_file_text(ctx, "modules/yasii/runtime_orchestrator.py")
    host_text = _backend_file_text(ctx, "modules/ai_context/host_context.py")
    return (
        _file_defines_symbols(
            designer_answers_text,
            "resolve_designer_context_message",
            "что сейчас открыто",
            "что я сейчас настраиваю",
            "какой раздел конструктора открыт",
            "где я нахожусь",
        )
        and _file_defines_symbols(runtime_text, "resolve_designer_context_message")
        and _file_defines_symbols(orchestrator_text, "designerMetadata")
        and _file_defines_symbols(host_text, "designerArea", "designerEntityType")
    )


def _check_p7_w05_designer_integration_complete(ctx: ScanContext) -> bool:
    return (
        _check_p7_w05_designer_context_adapter(ctx)
        and _check_p7_w05_designer_surface_provider(ctx)
        and _check_p7_w05_designer_answers(ctx)
        and _check_p7_w08_global_entry_point(ctx)
    )


def _check_p7_w06_document_context_adapter(ctx: ScanContext) -> bool:
    adapters_text = _frontend_file_text(ctx, "yasii/embedded/surfaceAdapters.js")
    builders_text = _frontend_file_text(ctx, "yasii/hostContextBuilders.js")
    document_builder_text = _frontend_file_text(ctx, "yasii/document/buildDocumentContextData.js")
    return (
        _file_defines_symbols(
            adapters_text,
            "buildDocumentContext",
            "buildDocumentHostContext",
            "EMBEDDED_SURFACE_IDS.DOCUMENT",
        )
        and _file_defines_symbols(
            builders_text,
            "buildDocumentHostContext",
            "documentId",
            "documentName",
            "documentType",
            "documentLibraryId",
            "documentLibraryName",
        )
        and _file_defines_symbols(
            document_builder_text,
            "buildDocumentContextData",
            "buildDocumentYasiiSurfaceValue",
            "resolveDocumentTypeLabel",
        )
        and "stubOnly: true" not in adapters_text.split("EMBEDDED_SURFACE_IDS.DOCUMENT", 1)[-1][:700]
        and "enabled: false" not in adapters_text.split("EMBEDDED_SURFACE_IDS.DOCUMENT", 1)[-1][:500]
    )


def _check_p7_w06_document_surface_provider(ctx: ScanContext) -> bool:
    workspace_text = _frontend_file_text(
        ctx,
        "modules/documentLibraries/components/DocumentWorkspaceView.jsx",
    )
    return _file_defines_symbols(
        workspace_text,
        "YasiiSurfaceContextProvider",
        "buildDocumentYasiiSurfaceValue",
    )


def _check_p7_w06_document_answers(ctx: ScanContext) -> bool:
    document_answers_text = _backend_file_text(ctx, "modules/yasii/document_context_answers.py")
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    orchestrator_text = _backend_file_text(ctx, "modules/yasii/runtime_orchestrator.py")
    host_text = _backend_file_text(ctx, "modules/ai_context/host_context.py")
    return (
        _file_defines_symbols(
            document_answers_text,
            "resolve_document_context_message",
            "что сейчас открыто",
            "какой документ открыт",
            "какой тип файла",
            "где я нахожусь",
        )
        and "YASII runtime pipeline is available" not in document_answers_text
        and _file_defines_symbols(runtime_text, "resolve_document_context_message")
        and _file_defines_symbols(orchestrator_text, "documentMetadata")
        and _file_defines_symbols(host_text, "documentId", "documentName", "documentType")
    )


def _check_p7_w06_document_integration_complete(ctx: ScanContext) -> bool:
    return (
        _check_p7_w06_document_context_adapter(ctx)
        and _check_p7_w06_document_surface_provider(ctx)
        and _check_p7_w06_document_answers(ctx)
        and _check_p7_w08_global_entry_point(ctx)
    )


def _check_p7_w07_process_context_adapter(ctx: ScanContext) -> bool:
    adapters_text = _frontend_file_text(ctx, "yasii/embedded/surfaceAdapters.js")
    builders_text = _frontend_file_text(ctx, "yasii/hostContextBuilders.js")
    process_builder_text = _frontend_file_text(ctx, "yasii/process/buildProcessContextData.js")
    return (
        _file_defines_symbols(
            adapters_text,
            "buildProcessContext",
            "buildProcessHostContext",
            "EMBEDDED_SURFACE_IDS.PROCESS",
        )
        and _file_defines_symbols(
            builders_text,
            "buildProcessHostContext",
            "processId",
            "processName",
            "processType",
            "processStatus",
            "activeStepId",
            "activeStepName",
        )
        and _file_defines_symbols(
            process_builder_text,
            "buildProcessContextData",
            "buildProcessYasiiSurfaceValue",
        )
        and "stubOnly: true" not in adapters_text.split("EMBEDDED_SURFACE_IDS.PROCESS", 1)[-1][:700]
        and "enabled: false" not in adapters_text.split("EMBEDDED_SURFACE_IDS.PROCESS", 1)[-1][:500]
    )


def _check_p7_w07_process_surface_provider(ctx: ScanContext) -> bool:
    bridge_text = _frontend_file_text(ctx, "yasii/process/ProcessYasiiSurfaceBridge.jsx")
    return _file_defines_symbols(
        bridge_text,
        "ProcessYasiiSurfaceBridge",
        "YasiiSurfaceContextProvider",
        "buildProcessYasiiSurfaceValue",
    )


def _check_p7_w07_process_answers(ctx: ScanContext) -> bool:
    process_answers_text = _backend_file_text(ctx, "modules/yasii/process_context_answers.py")
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    orchestrator_text = _backend_file_text(ctx, "modules/yasii/runtime_orchestrator.py")
    host_text = _backend_file_text(ctx, "modules/ai_context/host_context.py")
    return (
        _file_defines_symbols(
            process_answers_text,
            "resolve_process_context_message",
            "что сейчас открыто",
            "какой процесс открыт",
            "на каком этапе",
            "что сейчас выполняется",
            "где я нахожусь",
            "Процессная интеграция",
        )
        and "YASII runtime pipeline is available" not in process_answers_text
        and _file_defines_symbols(runtime_text, "resolve_process_context_message")
        and _file_defines_symbols(orchestrator_text, "processMetadata")
        and _file_defines_symbols(host_text, "processId", "processName", "activeStepName")
    )


def _check_p7_w07_process_integration_complete(ctx: ScanContext) -> bool:
    return (
        _check_p7_w07_process_context_adapter(ctx)
        and _check_p7_w07_process_surface_provider(ctx)
        and _check_p7_w07_process_answers(ctx)
        and _check_p7_w08_global_entry_point(ctx)
    )


def _check_p11_w01_knowledge_corpus_integration(ctx: ScanContext) -> bool:
    corpus_path = "modules/yasii/project_corpus.py"
    index_path = "modules/yasii/knowledge_index.py"
    answers_path = "modules/yasii/knowledge_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, corpus_path)
        and _yasii_file(ctx, index_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, corpus_path),
            "KnowledgeDocument",
            "KnowledgeSection",
            "KnowledgeCorpus",
            "KnowledgeReference",
            "build_knowledge_corpus",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, index_path),
            "build_project_corpus",
            "search_project_corpus",
            "find_documents",
            "find_sections",
            "find_related_documents",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_knowledge_corpus_command",
            "is_knowledge_corpus_command",
            "build_knowledge_assessment",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_knowledge_corpus_command",
            "knowledge_corpus_message",
            "KNOWLEDGE_CORPUS_LOADED",
            "KNOWLEDGE_ANSWER_GENERATED",
        )
        and _file_defines_symbols(
            trace_text,
            "knowledge_corpus_loaded",
            "knowledge_document_found",
            "knowledge_section_found",
            "knowledge_answer_generated",
        )
    ):
        return False

    combined = (
        _backend_file_text(ctx, corpus_path)
        + _backend_file_text(ctx, index_path)
        + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = (
        "openai",
        "embedding",
        "pinecone",
        "weaviate",
        "chroma",
        "qdrant",
        "vector db",
        "langchain",
    )
    if any(token in combined for token in forbidden):
        return False

    try:
        from app.modules.yasii.knowledge_answers import (
            is_knowledge_corpus_command,
            resolve_knowledge_corpus_command,
        )
        from app.modules.yasii.knowledge_index import (
            build_project_corpus,
            clear_project_corpus_cache,
            search_project_corpus,
        )

        clear_project_corpus_cache()
        corpus = build_project_corpus(ctx.repo_root, force=True)
        if len(corpus.documents) < 5:
            return False
        from app.modules.yasii.project_corpus import find_document_by_path

        status_doc = find_document_by_path(corpus, "YASNOPRO_ARCHITECTURE_STATUS.md")
        if status_doc is None:
            return False
        status_text = " ".join(section.content for section in status_doc.sections)
        if "Hybrid" not in status_text and "Level 1" not in status_text:
            return False

        payload: dict = {"tenantId": "tenant-a"}
        if not is_knowledge_corpus_command("Что находится в YASNOPRO_ARCHITECTURE_STATUS.md?"):
            return False
        status = resolve_knowledge_corpus_command(
            "Что находится в YASNOPRO_ARCHITECTURE_STATUS.md?",
            payload,
        )
        if status is None or "Knowledge Assessment" not in status.message:
            return False
        if "YASNOPRO_ARCHITECTURE_STATUS.md" not in status.message:
            return False
        return True
    except Exception:
        return False


def _check_p11_w02_project_awareness_engine(ctx: ScanContext) -> bool:
    awareness_path = "modules/yasii/project_awareness.py"
    state_models_path = "modules/yasii/project_state_models.py"
    answers_path = "modules/yasii/project_awareness_answers.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")
    awareness_text = _backend_file_text(ctx, awareness_path)
    state_models_text = _backend_file_text(ctx, state_models_path)

    if not (
        _yasii_file(ctx, awareness_path)
        and _yasii_file(ctx, state_models_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            state_models_text,
            "ProjectState",
        )
        and _file_defines_symbols(
            awareness_text,
            "ProjectPriority",
            "ProjectAwarenessAssessment",
            "load_project_state_from_db",
            "rank_project_priorities",
            "build_project_awareness_assessment",
            "is_project_awareness_query",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_project_awareness_command",
            "ProjectAwarenessResult",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_project_awareness_command",
            "project_awareness_message",
            "PROJECT_STATE_LOADED",
            "PROJECT_AWARENESS_CREATED",
            "PROJECT_PRIORITY_GENERATED",
            "PROJECT_BLOCKERS_DETECTED",
        )
        and _file_defines_symbols(
            trace_text,
            "project_state_loaded",
            "project_awareness_created",
            "project_priority_generated",
            "project_blockers_detected",
        )
        and "build_unified_project_state" in awareness_text
        and "unified_project_state" in awareness_text
        and "project_awareness_message" in runtime_text
        and runtime_text.find("resolve_project_awareness_command") < runtime_text.find(
            "resolve_knowledge_corpus_command"
        )
    ):
        return False

    combined = (
        _backend_file_text(ctx, awareness_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    forbidden = ("openai", "embedding", "pinecone", "weaviate", "chroma", "qdrant", "vector db")
    if any(token in combined for token in forbidden):
        return False

    try:
        from app.modules.yasii.project_awareness import (
            build_project_awareness_assessment,
            is_project_awareness_query,
        )
        from app.modules.yasii.project_awareness_answers import resolve_project_awareness_command
        from app.db.session import SessionLocal

        if not is_project_awareness_query("Что делать дальше?"):
            return False

        db = SessionLocal()
        try:
            assessment = build_project_awareness_assessment("Что делать дальше?", db)
        finally:
            db.close()

        if not assessment.priorities:
            return False
        top = assessment.priorities[0]
        if not top.workItemId:
            return False

        payload: dict = {"tenantId": "tenant-a"}
        result = resolve_project_awareness_command("Что делать дальше?", payload)
        if result is None or "Project Awareness Assessment" not in result.message:
            return False
        if top.workItemId not in result.message:
            return False
        if "platform_tasks" not in result.message:
            return False
        return True
    except Exception:
        return False


def _check_p11_w03_business_explanation_layer(ctx: ScanContext) -> bool:
    biz_path = "modules/yasii/business_explanation.py"
    answers_path = "modules/yasii/business_explanation_answers.py"
    awareness_path = "modules/yasii/project_awareness.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")
    service_text = _backend_file_text(ctx, "modules/platform_dashboard/service.py")
    schemas_text = _backend_file_text(ctx, "modules/platform_dashboard/schemas.py")

    if not (
        _yasii_file(ctx, biz_path)
        and _yasii_file(ctx, answers_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, biz_path),
            "BusinessExplanation",
            "WorkItemExplanation",
            "build_work_item_explanation",
            "build_business_awareness_snapshot",
            "format_three_views_message",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_business_explanation_command",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_business_explanation_command",
            "business_explanation_message",
            "BUSINESS_EXPLANATION_CREATED",
            "BUSINESS_IMPACT_GENERATED",
            "BUSINESS_VIEW_SELECTED",
        )
        and _file_defines_symbols(
            trace_text,
            "business_explanation_created",
            "business_impact_generated",
            "business_view_selected",
        )
        and "business_effect_block" in _backend_file_text(ctx, awareness_path)
        and "BusinessAwarenessRead" in schemas_text
        and "build_business_awareness_snapshot" in service_text
        and runtime_text.find("resolve_business_explanation_command")
        < runtime_text.find("resolve_project_awareness_command")
    ):
        return False

    combined = (
        _backend_file_text(ctx, biz_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    if any(token in combined for token in ("openai", "embedding", "vector db", "pinecone")):
        return False

    try:
        from app.modules.yasii.business_explanation import (
            build_business_explanation_for_work_item,
            is_business_explanation_query,
        )
        from app.modules.yasii.business_explanation_answers import resolve_business_explanation_command
        from app.modules.platform_dashboard.yasii_catalog import work_item_by_key

        if not is_business_explanation_query("Почему это важно?"):
            return False
        item = work_item_by_key("P10-W03")
        if item is None:
            return False
        explanation = build_business_explanation_for_work_item(item, set())
        if not explanation.businessView or not explanation.technicalView:
            return False
        result = resolve_business_explanation_command("Почему это важно?", {"tenantId": "tenant-a"})
        if result is None or "Business View" not in result.message:
            return False
        next_step = resolve_business_explanation_command(
            "Что изменится после завершения?",
            {"tenantId": "tenant-a"},
        )
        if next_step is None or "Business Impact" not in next_step.message:
            return False
        return True
    except Exception:
        return False


def _check_p12_w01_development_intelligence(ctx: ScanContext) -> bool:
    dev_path = "modules/yasii/development_intelligence.py"
    answers_path = "modules/yasii/development_intelligence_answers.py"
    test_path = "modules/yasii/test_development_intelligence.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")
    service_text = _backend_file_text(ctx, "modules/platform_dashboard/service.py")
    schemas_text = _backend_file_text(ctx, "modules/platform_dashboard/schemas.py")
    biz_path = "modules/yasii/business_explanation.py"
    awareness_path = "modules/yasii/project_awareness.py"
    knowledge_path = "modules/yasii/knowledge_answers.py"

    if not (
        _yasii_file(ctx, dev_path)
        and _yasii_file(ctx, answers_path)
        and _yasii_file(ctx, test_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, dev_path),
            "DevelopmentState",
            "DevelopmentIssue",
            "DevelopmentRisk",
            "DevelopmentIntelligenceAssessment",
            "build_development_intelligence_assessment",
            "build_development_intelligence_snapshot",
            "load_quality_issues_summary",
            "load_architecture_debt_summary",
            "format_development_intelligence_message",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, answers_path),
            "resolve_development_intelligence_command",
        )
        and _file_defines_symbols(
            runtime_text,
            "resolve_development_intelligence_command",
            "development_intelligence_message",
            "DEVELOPMENT_STATE_LOADED",
            "DEVELOPMENT_INTELLIGENCE_CREATED",
        )
        and _file_defines_symbols(
            trace_text,
            "development_state_loaded",
            "development_quality_analyzed",
            "development_debt_analyzed",
            "development_risk_detected",
            "development_intelligence_created",
        )
        and "DevelopmentIntelligenceRead" in schemas_text
        and "build_development_intelligence_snapshot" in service_text
        and "development_intelligence" in schemas_text
        and runtime_text.find("resolve_development_intelligence_command")
        < runtime_text.find("resolve_business_explanation_command")
        and "is_development_intelligence_query" in _backend_file_text(ctx, biz_path)
        and "is_development_intelligence_query" in _backend_file_text(ctx, awareness_path)
        and "_defers_to_development_intelligence" in _backend_file_text(ctx, knowledge_path)
    ):
        return False

    combined = (
        _backend_file_text(ctx, dev_path) + _backend_file_text(ctx, answers_path)
    ).casefold()
    if any(token in combined for token in ("openai", "embedding", "vector db", "pinecone")):
        return False

    try:
        from app.modules.yasii.development_intelligence import (
            build_development_intelligence_snapshot,
            is_development_intelligence_query,
            load_architecture_debt_summary,
        )
        from app.modules.yasii.development_intelligence_answers import (
            resolve_development_intelligence_command,
        )

        if not is_development_intelligence_query("Что требует моего внимания?"):
            return False
        debt = load_architecture_debt_summary()
        if not debt.summary:
            return False
        result = resolve_development_intelligence_command(
            "Что требует моего внимания?",
            {"tenantId": "tenant-a"},
        )
        if result is None or "Development Intelligence Assessment" not in result.message:
            return False
        if not result.state_loaded or not result.intelligence_created:
            return False
        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            snap = build_development_intelligence_snapshot(db)
        finally:
            db.close()
        if not snap.focus.title and not snap.focus.reasoning:
            return False
        return True
    except Exception:
        return False


def _check_p13_w02_platform_governance_model(ctx: ScanContext) -> bool:
    unified_path = "modules/yasii/unified_project_state.py"
    governance_path = "modules/yasii/governance_answers.py"
    platform_gov_path = "modules/platform_dashboard/platform_governance.py"
    history_path = "modules/platform_dashboard/governance_history.py"
    quality_foundation_path = "modules/quality_issues/quality_intelligence_foundation.py"
    test_path = "modules/yasii/test_unified_project_state.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    sync_text = _backend_file_text(ctx, "modules/platform_dashboard/yasii_sync.py")
    service_text = _backend_file_text(ctx, "modules/platform_dashboard/service.py")
    schemas_text = _backend_file_text(ctx, "modules/platform_dashboard/schemas.py")
    awareness_path = "modules/yasii/project_awareness.py"

    if not (
        _yasii_file(ctx, unified_path)
        and _yasii_file(ctx, governance_path)
        and _yasii_file(ctx, test_path)
        and _yasii_file(ctx, platform_gov_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, unified_path),
            "UnifiedProjectState",
            "PlatformLayerState",
            "DevelopmentWorkspaceState",
            "CompanyWorkspacesState",
            "CompanyWorkspaceSnapshot",
            "build_unified_project_state",
            "load_project_state_from_db",
            "SOURCE_CHAIN",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, governance_path),
            "resolve_governance_command",
            "classify_governance_query",
        )
        and "compute_resolved_done_keys" in sync_text
        and "serialize_governance_model" in service_text
        and "get_governance_model" in service_text
        and "PlatformGovernanceRead" in schemas_text
        and "PLATFORM_LAYER_ENGINES" in _backend_file_text(ctx, platform_gov_path)
        and _file_defines_symbols(
            runtime_text,
            "resolve_governance_command",
            "GOVERNANCE_STATE_LOADED",
        )
        and runtime_text.find("resolve_governance_command")
        < runtime_text.find("resolve_development_intelligence_command")
        and "unified_project_state" in _backend_file_text(ctx, awareness_path)
        and _yasii_file(ctx, history_path)
        and _yasii_file(ctx, quality_foundation_path)
    ):
        return False

    try:
        from app.db.session import SessionLocal
        from app.modules.yasii.unified_project_state import build_unified_project_state
        from app.modules.yasii.governance_answers import resolve_governance_command
        from app.modules.platform_dashboard.yasii_sync import compute_resolved_done_keys

        db = SessionLocal()
        try:
            unified = build_unified_project_state(db)
        finally:
            db.close()
        if not unified.platform.engines:
            return False
        if "process-engine" not in unified.platform.missingFromDashboard:
            return False
        resolved = compute_resolved_done_keys(unified.itemPassed)
        if any(
            key in resolved
            for key, passed in unified.itemPassed.items()
            if passed and key not in resolved
        ):
            return False
        result = resolve_governance_command(
            "Какие подсистемы готовы?",
            {"tenantId": "tenant-a"},
        )
        if result is None or "Platform Layer" not in result.message:
            return False
        companies = resolve_governance_command("Что такое компании?", {"tenantId": "tenant-a"})
        if companies is None or "рабочие пространства" not in companies.message.casefold():
            return False
        if "Tenant Layer" in companies.message:
            return False
        diff = resolve_governance_command(
            "Чем компания отличается от платформы?",
            {"tenantId": "tenant-a"},
        )
        if diff is None or "общий движок" not in diff.message.casefold():
            return False
        return True
    except Exception:
        return False


def _check_p13_w03_dual_readiness_model(ctx: ScanContext) -> bool:
    sync_path = "modules/platform_dashboard/yasii_sync.py"
    unified_path = "modules/yasii/unified_project_state.py"
    test_path = "modules/yasii/test_dual_readiness_model.py"
    schemas_text = _backend_file_text(ctx, "modules/platform_dashboard/schemas.py")
    service_text = _backend_file_text(ctx, "modules/platform_dashboard/service.py")
    sync_text = _backend_file_text(ctx, sync_path)
    unified_text = _backend_file_text(ctx, unified_path)

    if not (
        _yasii_file(ctx, test_path)
        and _file_defines_symbols(
            sync_text,
            "compute_implementation_done_keys",
            "compute_release_done_keys",
            "detect_governance_release_blocker",
            "build_governance_blocked_work_item_labels",
        )
        and _file_defines_symbols(
            unified_text,
            "implementationDoneKeys",
            "releaseDoneKeys",
            "containerImplementationReadiness",
            "containerReleaseReadiness",
            "blockedByGovernance",
        )
        and "DualReadinessRead" in schemas_text
        and "implementation_readiness" in schemas_text
        and "container_readiness" in schemas_text
        and "containerImplementationReadiness" in service_text
        and "containerImplementationReadiness" in _backend_file_text(
            ctx, "modules/yasii/development_intelligence.py"
        )
        and _yasii_file(ctx, "modules/platform_dashboard/company_workspaces.py")
        and "CompanyWorkspacesState" in unified_text
        and "companyWorkspaces" in schemas_text
    ):
        return False

    try:
        from app.db.session import SessionLocal
        from app.modules.platform_dashboard.yasii_sync import (
            compute_implementation_done_keys,
            compute_release_done_keys,
            detect_governance_release_blocker,
        )
        from app.modules.yasii.unified_project_state import build_unified_project_state
        from app.modules.yasii.governance_answers import resolve_governance_command
        from app.modules.yasii.development_intelligence import format_development_intelligence_message
        from app.modules.yasii.development_intelligence import build_development_intelligence_assessment
        from app.modules.platform_dashboard.service import serialize_stage
        from app.modules.platform_dashboard.models import PlatformImplementationStage
        from app.modules.platform_dashboard.yasii_catalog import YASII_IMPLEMENTATION_STAGE_SLUG

        item_passed = {item.key: False for item in YASII_WORK_ITEMS}
        item_passed["P1-W12"] = True
        item_passed["P8-W01"] = True
        item_passed["P10-W06"] = False
        impl = compute_implementation_done_keys(item_passed)
        release = compute_release_done_keys(item_passed)
        if "P8-W01" not in impl or "P8-W01" in release:
            return False

        db = SessionLocal()
        try:
            unified = build_unified_project_state(db)
        finally:
            db.close()
        if unified.containerReleaseReadiness > unified.containerImplementationReadiness:
            return False
        if not unified.implementationDoneKeys or not unified.releaseDoneKeys:
            return False
        blocker_key, _ = detect_governance_release_blocker(
            unified.itemPassed,
            set(unified.implementationDoneKeys),
            set(unified.releaseDoneKeys),
        )
        if blocker_key is None and unified.containerImplementationReadiness != unified.containerReleaseReadiness:
            return False

        assessment = build_development_intelligence_assessment("Где мы сейчас?", db, None)
        message = format_development_intelligence_message(assessment, "Где мы сейчас?")
        if "Реализовано" not in message or "выпуску" not in message:
            return False

        db2 = SessionLocal()
        try:
            stage = (
                db2.query(PlatformImplementationStage)
                .filter(PlatformImplementationStage.slug == YASII_IMPLEMENTATION_STAGE_SLUG)
                .one_or_none()
            )
            if stage is None:
                return False
            from app.modules.platform_dashboard.yasii_sync import compute_embedded_ai_rollups_from_db

            rollups = compute_embedded_ai_rollups_from_db(db2)
            serialized = serialize_stage(stage, embedded_ai_rollups=rollups, db=db2)
        finally:
            db2.close()
        if serialized.container_readiness is None:
            return False
        if serialized.implementation_readiness is None or serialized.release_readiness is None:
            return False
        gov = resolve_governance_command("Что такое компании?", {"tenantId": "tenant-a"})
        if gov is None or "Tenant Layer" in gov.message:
            return False
        return True
    except Exception:
        return False


def _check_p10_w03_e2e_mvp_scenarios_pass(ctx: ScanContext) -> bool:
    test_path = "modules/yasii/test_yasii_e2e_mvp.py"
    flow_path = "modules/yasii/e2e_mvp_flow.py"
    runtime_text = _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py")
    trace_text = _backend_file_text(ctx, "modules/yasii/pipeline_trace.py")

    if not (
        _yasii_file(ctx, test_path)
        and _yasii_file(ctx, flow_path)
        and _file_defines_symbols(
            _backend_file_text(ctx, flow_path),
            "MVP_E2E_SCENARIO_COUNT",
            "MVP_E2E_SCENARIOS",
            "run_mvp_e2e_validation",
            "scenario_01_dashboard_strategy",
            "scenario_10_full_strategic_flow",
        )
        and _file_defines_symbols(
            _backend_file_text(ctx, test_path),
            "test_e2e_scenario_01_dashboard_strategy",
            "test_e2e_scenario_09_improvement_query",
            "test_run_mvp_e2e_validation_entrypoint",
        )
        and _file_defines_symbols(
            runtime_text,
            "e2eMvpTrace",
            "YASII_E2E_MVP_STARTED",
            "improvement_message",
            "architect_message",
        )
        and _file_defines_symbols(
            trace_text,
            "yasii_e2e_mvp_started",
            "yasii_e2e_mvp_completed",
            "yasii_e2e_flow_validated",
        )
    ):
        return False

    combined = (
        _backend_file_text(ctx, flow_path) + _backend_file_text(ctx, test_path)
    ).casefold()
    forbidden = (
        "openai",
        "embedding",
        "auto fix",
        "code generator",
        "autonomous improvement agent",
    )
    if any(token in combined for token in forbidden):
        return False

    try:
        import tempfile
        from pathlib import Path

        from app.modules.yasii.e2e_mvp_flow import MVP_E2E_SCENARIO_COUNT, run_mvp_e2e_validation

        if MVP_E2E_SCENARIO_COUNT != 10:
            return False
        with tempfile.TemporaryDirectory() as temp_dir:
            return bool(run_mvp_e2e_validation(Path(temp_dir)))
    except Exception:
        return False


def _check_yasii_workspace_modes(ctx: ScanContext) -> bool:
    launcher_text = _frontend_file_text(ctx, "yasii/components/YasiiLauncher.jsx")
    dismiss_text = _frontend_file_text(ctx, "yasii/workspace/yasiiFloatingDismiss.js")
    panel_text = _frontend_file_text(ctx, "yasii/components/YasiiEmbeddedPanel.jsx")
    header_actions_text = _frontend_file_text(ctx, "yasii/components/YasiiPanelHeaderActions.jsx")
    workspace_page_text = _frontend_file_text(ctx, "yasii/pages/YasiiWorkspacePage.jsx")
    storage_text = _frontend_file_text(ctx, "yasii/workspace/yasiiWorkspaceModeStorage.js")
    assistant_text = _frontend_file_text(ctx, "yasii/context/YasiiAssistantContext.jsx")
    app_text = _frontend_file_text(ctx, "App.jsx")
    embedded_api_text = _frontend_file_text(ctx, "yasii/yasiiEmbeddedApi.js")
    return (
        _file_defines_symbols(
            launcher_text,
            "useYasiiAssistantSession",
            "isPinned",
            "shouldCloseFloatingOnOutsideClick",
        )
        and _file_defines_symbols(
            dismiss_text,
            "isPinned",
            "isPlatformNavigationTarget",
            "app-sidebar-renderer--runtime",
        )
        and "setFloatingOpen?.(true)" in header_actions_text
        and "setFloatingOpen?.(false)" in workspace_page_text
        and _file_defines_symbols(
            header_actions_text,
            "Pin.png",
            "expand.png",
            "collapse.png",
            "Закрепить ЯСИИ",
            'navigate("/yasii")',
        )
        and _file_defines_symbols(
            panel_text,
            "layoutMode",
            "YasiiPanelHeaderActions",
            "yasii-panel--workspace",
        )
        and _file_defines_symbols(
            workspace_page_text,
            "PortalLayout",
            "YasiiEmbeddedPanel",
            'layoutMode="workspace"',
        )
        and _file_defines_symbols(
            storage_text,
            "readYasiiPinned",
            "writeYasiiPinned",
        )
        and _file_defines_symbols(
            assistant_text,
            "YasiiAssistantProvider",
            "messages",
            "setMessages",
        )
        and _file_defines_symbols(app_text, 'path="/yasii"', "YasiiAssistantProvider")
        and _file_defines_symbols(embedded_api_text, "sendEmbeddedQuery")
        and _file_defines_symbols(
            _backend_file_text(ctx, "modules/yasii/runtime_demo_service.py"),
            "run_demo_pipeline",
        )
        and "route change" not in launcher_text.lower()
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
    "yasii_p8_w01_user_memory_store": _check_p8_w01_user_memory_store,
    "yasii_p8_w02_tenant_memory_store": _check_p8_w02_tenant_memory_store,
    "yasii_p8_w03_decision_memory_linked": _check_p8_w03_decision_memory_linked,
    "yasii_p8_w05_process_memory_schema": _check_p8_w05_process_memory_schema,
    "yasii_p8_w06_memory_graph_linked": _check_p8_w06_memory_graph_linked,
    "yasii_p9_w01_strategy_engine_operational": _check_p9_w01_strategy_engine_operational,
    "yasii_p9_w02_unlock_score_ranking": _check_p9_w02_unlock_score_ranking,
    "yasii_p9_w03_blocker_detection": _check_p9_w03_blocker_detection,
    "yasii_p9_w04_strategy_recommendation_templates": _check_p9_w04_strategy_recommendation_templates,
    "yasii_p9_w05_architect_profile_active": _check_p9_w05_architect_profile_active,
    "yasii_p9_w06_improvement_query_standalone": _check_p9_w06_improvement_query_standalone,
    "yasii_p10_w03_e2e_mvp_scenarios_pass": _check_p10_w03_e2e_mvp_scenarios_pass,
    "yasii_p11_w01_knowledge_corpus_integration": _check_p11_w01_knowledge_corpus_integration,
    "yasii_p11_w02_project_awareness_engine": _check_p11_w02_project_awareness_engine,
    "yasii_p11_w03_business_explanation_layer": _check_p11_w03_business_explanation_layer,
    "yasii_p12_w01_development_intelligence": _check_p12_w01_development_intelligence,
    "yasii_p13_w02_platform_governance_model": _check_p13_w02_platform_governance_model,
    "yasii_p13_w03_dual_readiness_model": _check_p13_w03_dual_readiness_model,
    "yasii_user_identity_integration": _check_yasii_user_identity_integration,
    "yasii_p8_w04_session_memory_multiturn": _check_p8_w04_session_memory_multiturn,
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
    "yasii_p7_w02_object_context_adapter": _check_p7_w02_object_context_adapter,
    "yasii_p7_w02_object_surface_provider": _check_p7_w02_object_surface_provider,
    "yasii_p7_w02_object_card_answers": _check_p7_w02_object_card_answers,
    "yasii_p7_w02_object_integration_complete": _check_p7_w02_object_integration_complete,
    "yasii_p7_w03_registry_context_adapter": _check_p7_w03_registry_context_adapter,
    "yasii_p7_w03_registry_surface_provider": _check_p7_w03_registry_surface_provider,
    "yasii_p7_w03_registry_answers": _check_p7_w03_registry_answers,
    "yasii_p7_w03_registry_integration": _check_p7_w03_registry_integration_complete,
    "yasii_p7_w03_registry_integration_complete": _check_p7_w03_registry_integration_complete,
    "yasii_p7_w05_designer_context_adapter": _check_p7_w05_designer_context_adapter,
    "yasii_p7_w05_designer_surface_provider": _check_p7_w05_designer_surface_provider,
    "yasii_p7_w05_designer_answers": _check_p7_w05_designer_answers,
    "yasii_p7_w05_designer_integration": _check_p7_w05_designer_integration_complete,
    "yasii_p7_w05_designer_integration_complete": _check_p7_w05_designer_integration_complete,
    "yasii_p7_w06_document_context_adapter": _check_p7_w06_document_context_adapter,
    "yasii_p7_w06_document_surface_provider": _check_p7_w06_document_surface_provider,
    "yasii_p7_w06_document_answers": _check_p7_w06_document_answers,
    "yasii_p7_w06_document_integration": _check_p7_w06_document_integration_complete,
    "yasii_p7_w06_document_integration_complete": _check_p7_w06_document_integration_complete,
    "yasii_p7_w07_process_context_adapter": _check_p7_w07_process_context_adapter,
    "yasii_p7_w07_process_surface_provider": _check_p7_w07_process_surface_provider,
    "yasii_p7_w07_process_answers": _check_p7_w07_process_answers,
    "yasii_p7_w07_process_integration": _check_p7_w07_process_integration_complete,
    "yasii_p7_w07_process_integration_complete": _check_p7_w07_process_integration_complete,
    "yasii_workspace_modes": _check_yasii_workspace_modes,
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
            elif item.key == "P7-W02":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w02_object_integration_complete
            elif item.key == "P7-W03":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w03_registry_integration_complete
            elif item.key == "P7-W05":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w05_designer_integration_complete
            elif item.key == "P7-W06":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w06_document_integration_complete
            elif item.key == "P7-W07":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w07_process_integration_complete
            elif item.key == "P7-W08":
                _CHECK_BY_ID[item.analyzer_check] = _check_p7_w08_embedded_no_standalone_chat
            elif item.key == "P8-W01":
                _CHECK_BY_ID[item.analyzer_check] = _check_p8_w01_user_memory_store
            elif item.key == "P8-W02":
                _CHECK_BY_ID[item.analyzer_check] = _check_p8_w02_tenant_memory_store
            elif item.key == "P8-W03":
                _CHECK_BY_ID[item.analyzer_check] = _check_p8_w03_decision_memory_linked
            elif item.key == "P8-W05":
                _CHECK_BY_ID[item.analyzer_check] = _check_p8_w05_process_memory_schema
            elif item.key == "P8-W06":
                _CHECK_BY_ID[item.analyzer_check] = _check_p8_w06_memory_graph_linked
            elif item.key == "P8-W04":
                _CHECK_BY_ID[item.analyzer_check] = _check_p8_w04_session_memory_multiturn
            elif item.key == "P9-W01":
                _CHECK_BY_ID[item.analyzer_check] = _check_p9_w01_strategy_engine_operational
            elif item.key == "P9-W02":
                _CHECK_BY_ID[item.analyzer_check] = _check_p9_w02_unlock_score_ranking
            elif item.key == "P9-W03":
                _CHECK_BY_ID[item.analyzer_check] = _check_p9_w03_blocker_detection
            elif item.key == "P9-W04":
                _CHECK_BY_ID[item.analyzer_check] = _check_p9_w04_strategy_recommendation_templates
            elif item.key == "P9-W05":
                _CHECK_BY_ID[item.analyzer_check] = _check_p9_w05_architect_profile_active
            elif item.key == "P9-W06":
                _CHECK_BY_ID[item.analyzer_check] = _check_p9_w06_improvement_query_standalone
            elif item.key == "P10-W03":
                _CHECK_BY_ID[item.analyzer_check] = _check_p10_w03_e2e_mvp_scenarios_pass
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
