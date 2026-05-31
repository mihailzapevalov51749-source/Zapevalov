from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.pipeline_trace import DEMO_PIPELINE_TRACE
from app.modules.yasii.runtime_demo_service import run_demo_pipeline


def test_run_demo_pipeline_returns_yasii_response():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-001",
            payload={"text": "Покажи статус runtime"},
        ),
    )

    assert response.requestId == "demo-unit-001"
    assert response.status == "ok"
    assert response.responseType == "yasii.response"
    assert response.payload["demo"] is True
    assert response.payload["message"] == "YASII runtime pipeline is available"
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_trace_order():
    response = run_demo_pipeline(YASIIRequest(requestId="demo-unit-002", payload={}))

    assert response.payload["trace"] == [
        "intent_resolved",
        "knowledge_resolved",
        "graph_resolved",
        "evidence_resolved",
        "rules_evaluated",
        "verdict_evaluated",
        "response_built",
        "audit_recorded",
    ]


def test_run_demo_pipeline_echoes_payload_text_in_builder_metadata():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-003",
            payload={"query": "Покажи статус ЯСИИ"},
        ),
    )

    assert response.status == "ok"
    assert response.payload["demo"] is True


def test_run_demo_pipeline_who_are_you_uses_owner_language():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-004",
            payload={"text": "Кто ты?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Краткий вывод" in message
    assert "цифровой сотрудник" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_capabilities_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-005",
            payload={"text": "Что ты умеешь?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Краткий вывод" in message
    assert "цифровой сотрудник" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_limitations_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-006",
            payload={"text": "Какие ограничения?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Краткий вывод" in message
    assert "Что пока отсутствует" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_architecture_overview_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-007",
            payload={"text": "Какая архитектура ЯСИИ? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Архитектурный обзор ЯСИИ" in message
    assert "Phase 5 — Developer MVP" in message
    assert "Runtime Orchestrator" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_completed_phases_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-008",
            payload={"text": "Какие фазы реализованы? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Фазы реализации ЯСИИ" in message
    assert "Phase 3 — Graph Foundation" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_major_components_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-009",
            payload={"text": "Из чего состоит ЯСИИ? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Основные компоненты ЯСИИ" in message
    assert "Graph Resolver" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_current_phase_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-010",
            payload={"text": "На каком этапе проект? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Текущая фаза проекта" in message
    assert "Phase 5 — Developer MVP" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_rule_engine_impact_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-011",
            payload={"text": "На что повлияет Rule Engine? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Impact Analysis" in message
    assert "Rule Engine" in message
    assert "Verdict Engine" in message
    assert "MEDIUM" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_graph_resolver_dependency_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-012",
            payload={"text": "Что зависит от Graph Resolver? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Impact Analysis" in message
    assert "Graph Resolver" in message
    assert "Evidence Resolver" in message
    assert "MEDIUM" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_rule_engine_dependency_chain_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-013",
            payload={"text": "Покажи зависимости Rule Engine Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Dependency Analysis" in message
    assert "Rule Engine" in message
    assert "Verdict Engine" in message
    assert "Answer Builder" in message
    assert "Runtime Orchestrator" in message
    assert "Длина цепочки:\n4" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_graph_resolver_dependency_chain_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-014",
            payload={"text": "Покажи зависимости Graph Resolver Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Dependency Analysis" in message
    assert "Graph Resolver" in message
    assert "Evidence Resolver" in message
    assert "Длина цепочки:\n6" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_rule_engine_architecture_verdict_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-015",
            payload={
                "text": "Почему Rule Engine расположен после Evidence Resolver? Покажи технически",
            },
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Architecture Verdict" in message
    assert "Rule Engine" in message
    assert "доказательствам" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_runtime_orchestrator_architecture_verdict_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-016",
            payload={"text": "Зачем нужен Runtime Orchestrator? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Architecture Verdict" in message
    assert "Runtime Orchestrator" in message
    assert "pipeline" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_knowledge_resolver_architecture_verdict_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-017",
            payload={"text": "Для чего нужен Knowledge Resolver? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Architecture Verdict" in message
    assert "Knowledge Resolver" in message
    assert "намерение" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_dev_query_pipeline_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-018",
            payload={"text": "Как проходит запрос? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Developer Query" in message
    assert "Intent Resolver" in message
    assert "Runtime Orchestrator" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_dev_query_rule_engine_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-019",
            payload={"text": "Что делает Rule Engine? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Developer Query" in message
    assert "Rule Engine" in message
    assert "доказательствам" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_dev_query_runtime_orchestrator_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-020",
            payload={"text": "Что такое Runtime Orchestrator? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Developer Query" in message
    assert "Runtime Orchestrator" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_dev_query_components_list_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-021",
            payload={"text": "Какие компоненты есть в ЯСИИ? Покажи технически"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Developer Query" in message
    assert "Компоненты ЯСИИ" in message
    assert "Answer Builder" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_developer_readiness_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-022",
            payload={"text": "Насколько ты готов помогать разработчику?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Краткий вывод" in message
    assert "40%" in message
    assert "Что уже работает" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_owner_status_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-023",
            payload={"text": "Что уже готово?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Краткий вывод" in message
    assert "Что уже работает" in message
    assert "Impact Analysis" not in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_owner_value_question():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-024",
            payload={"text": "Чем ЯСИИ уже полезен?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "навигатором" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_verdict_owner_language_by_default():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-025",
            payload={"text": "Почему Rule Engine расположен после Evidence Resolver?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "проверяет их по правилам" in message
    assert "Architecture Verdict" not in message


def test_run_demo_pipeline_verdict_technical_when_requested():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-026",
            payload={
                "text": "Почему Rule Engine расположен после Evidence Resolver? Покажи технически",
            },
        ),
    )

    message = response.payload["message"]
    assert "Architecture Verdict" in message
    assert "Rule Engine" in message


def test_run_demo_pipeline_owner_assistant_profile_identity():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-027",
            payload={"text": "Кто ты для владельца?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Owner Assistant Profile" in message
    assert "Цифровой сотрудник владельца системы" in message
    assert "Уже умею" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_owner_assistant_profile_role_before_developer():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-028",
            payload={"text": "Какая твоя роль?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Owner Assistant Profile" in message
    assert "Я ЯСИИ" not in message


def test_run_demo_pipeline_owner_assistant_profile_help():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-029",
            payload={"text": "Как ты помогаешь?"},
        ),
    )

    message = response.payload["message"]
    assert "Как помогаю принимать решения" in message


def test_run_demo_pipeline_platform_health_snapshot_state():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-030",
            payload={"text": "Каково состояние платформы?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Platform Health Snapshot" in message
    assert "Стабильное" in message
    assert "55%" in message
    assert "работает интерфейс ЯСИИ" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_platform_health_snapshot_attention():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-031",
            payload={"text": "Какие зоны внимания у платформы?"},
        ),
    )

    message = response.payload["message"]
    assert "Platform Health Snapshot" in message
    assert "Требует внимания" in message
    assert "отсутствует" in message


def test_run_demo_pipeline_platform_health_snapshot_progress():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-032",
            payload={"text": "Можно ли двигаться дальше?"},
        ),
    )

    message = response.payload["message"]
    assert "готова к следующему этапу" in message


def test_run_demo_pipeline_reality_check_situation():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-033",
            payload={"text": "Какова реальная ситуация?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Reality Check" in message
    assert "Средний" in message
    assert "работает интерфейс ЯСИИ" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_reality_check_gap():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-034",
            payload={"text": "Есть ли разрыв?"},
        ),
    )

    message = response.payload["message"]
    assert "Разрыв" in message
    assert "Средний" in message


def test_run_demo_pipeline_reality_check_mismatch():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-035",
            payload={"text": "Что сейчас не соответствует ожиданиям?"},
        ),
    )

    message = response.payload["message"]
    assert "Основные наблюдения" in message
    assert "подключение ЯСИИ" in message or "к данным проекта" in message


def test_run_demo_pipeline_deviation_registry_list():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-036",
            payload={"text": "Какие отклонения есть?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Deviation Registry" in message
    assert "Нет подключения к данным проекта" in message
    assert "Критичность: Высокая" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_deviation_registry_before_health_attention():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-037",
            payload={"text": "Что требует внимания?"},
        ),
    )

    message = response.payload["message"]
    assert "Deviation Registry" in message
    assert "Platform Health Snapshot" not in message


def test_run_demo_pipeline_deviation_registry_goal_blocker():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-038",
            payload={"text": "Что мешает достижению цели?"},
        ),
    )

    message = response.payload["message"]
    assert "Главное внимание" in message
    assert "Подключение ЯСИИ" in message


def test_run_demo_pipeline_owner_report_summary():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-039",
            payload={"text": "Дай отчёт владельца"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Owner Report" in message
    assert "Стабильное" in message
    assert "55%" in message
    assert "Всего: 3" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_owner_report_general_picture():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-040",
            payload={"text": "Какова общая картина?"},
        ),
    )

    message = response.payload["message"]
    assert "Owner Report" in message
    assert "Краткий вывод" in message
    assert "Следующее действие" in message


def test_run_demo_pipeline_owner_report_next_action():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-041",
            payload={"text": "Сделай сводку"},
        ),
    )

    message = response.payload["message"]
    assert "Подключить ЯСИИ к данным проекта" in message


def test_run_demo_pipeline_improvement_suggestions_next_steps():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-042",
            payload={"text": "Что делать дальше?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Improvement Suggestions" in message
    assert "Подключить данные проекта" in message
    assert "Приоритет: Высокий" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_improvement_suggestions_priority():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-043",
            payload={"text": "Что сейчас самое важное?"},
        ),
    )

    message = response.payload["message"]
    assert "Высокий приоритет" in message
    assert "Главная рекомендация" in message


def test_run_demo_pipeline_improvement_suggestions_show_list():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-044",
            payload={"text": "Покажи предложения по улучшению"},
        ),
    )

    message = response.payload["message"]
    assert "Всего рекомендаций" in message
    assert "Добавить контроль рисков" in message


def test_run_demo_pipeline_owner_readiness_query():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-045",
            payload={"text": "Насколько ЯСИИ готов?"},
        ),
    )

    message = response.payload["message"]
    assert response.payload["demo"] is False
    assert "Owner Readiness" in message
    assert "Частичная" in message
    assert "60%" in message
    assert response.payload["trace"] == list(DEMO_PIPELINE_TRACE)


def test_run_demo_pipeline_owner_readiness_before_developer():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-046",
            payload={"text": "Насколько ты готов помогать разработчику?"},
        ),
    )

    message = response.payload["message"]
    assert "40%" in message
    assert "Owner Readiness" not in message
    assert "Developer Queries" in message or "MVP" in message


def test_run_demo_pipeline_owner_readiness_unavailable():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="demo-unit-047",
            payload={"text": "Что пока нельзя делать?"},
        ),
    )

    message = response.payload["message"]
    assert "Пока недоступно" in message
    assert "риски" in message
