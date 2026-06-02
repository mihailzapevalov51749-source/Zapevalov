import pytest



from app.db.session import SessionLocal

from app.modules.platform_dashboard.yasii_catalog import work_item_by_key

from app.modules.yasii.knowledge_answers import is_knowledge_corpus_command, resolve_knowledge_corpus_command

from app.modules.yasii.project_awareness import (

    build_project_awareness_assessment,

    build_stage_roadmap,

    build_work_item_brief,

    classify_project_awareness_query,

    is_project_awareness_query,

    load_project_state_from_db,

    rank_project_priorities,

    ProjectAwarenessQueryKind,

)

from app.modules.yasii.project_awareness_answers import resolve_project_awareness_command

from app.modules.yasii.recommendation_answers import resolve_recommendation_command

from app.modules.yasii.runtime_demo_service import run_demo_pipeline

from app.modules.yasii.strategy_answers import resolve_strategy_command

from app.modules.yasii.unlock_score_answers import resolve_unlock_command

from app.modules.yasii.contracts import YASIIRequest





@pytest.fixture

def _payload():

    return {"tenantId": "tenant-1", "userId": "user-1", "sessionId": "session-1"}





def test_classify_project_awareness_queries():

    assert classify_project_awareness_query("Что делать дальше?") == ProjectAwarenessQueryKind.NEXT_STEP

    assert classify_project_awareness_query("Что сейчас приоритетно?") == ProjectAwarenessQueryKind.NEXT_STEP

    assert classify_project_awareness_query("Что блокирует развитие платформы?") == ProjectAwarenessQueryKind.BLOCKERS

    assert classify_project_awareness_query("На каком этапе находится проект?") == ProjectAwarenessQueryKind.PROJECT_STATE

    assert classify_project_awareness_query("Что уже реализовано?") == ProjectAwarenessQueryKind.COMPLETED

    assert is_project_awareness_query("Почему это важно?") is False





def test_load_project_state_from_db():

    db = SessionLocal()

    try:

        state, done_keys, _passed = load_project_state_from_db(db)

    finally:

        db.close()

    assert state.activeStageSlug

    assert state.containerReadiness >= 0

    assert isinstance(done_keys, set)





def test_rank_priorities_prefers_ready_work_items():

    db = SessionLocal()

    try:

        state, done_keys, _passed = load_project_state_from_db(db)

        priorities = rank_project_priorities(state, done_keys)

    finally:

        db.close()

    assert priorities

    top = priorities[0]

    item = work_item_by_key(top.workItemId)

    assert item is not None

    assert top.priorityScore > 0





def test_work_item_brief_has_expected_outcome():

    item = work_item_by_key("P10-W03")

    assert item is not None

    brief = build_work_item_brief(item, set())

    assert "E2E" in brief.expectedOutcome or "runtime" in brief.expectedOutcome

    assert brief.whyNeeded

    assert brief.effect





def test_roadmap_view_three_stages():

    db = SessionLocal()

    try:

        _state, done_keys, _passed = load_project_state_from_db(db)

        roadmap = build_stage_roadmap(done_keys)

    finally:

        db.close()

    assert len(roadmap) >= 1

    assert roadmap[0].status == "текущий"

    if len(roadmap) > 1:

        assert roadmap[1].status == "следующий"





def test_scenario_next_step_rich_detail(_payload):

    result = resolve_project_awareness_command("Что делать дальше?", _payload)

    assert result is not None

    assert "Project Awareness Assessment" in result.message

    assert "Следующий WI:" in result.message

    assert "Описание:" in result.message

    assert "Зачем нужен:" in result.message

    assert "Expected Outcome:" in result.message

    assert "Эффект после завершения:" in result.message

    assert "yasii_catalog" in result.message





def test_scenario_priority_open_work_item(_payload):

    result = resolve_project_awareness_command("Что сейчас приоритетно?", _payload)

    assert result is not None

    assert result.priority_generated

    assert "Следующий WI:" in result.message





def test_scenario_blockers_use_blocker_detection(_payload):

    result = resolve_project_awareness_command("Что блокирует развитие платформы?", _payload)

    assert result is not None

    assert "Blocker Detection" in result.message

    if result.blockers_detected:

        assert "[" in result.message  # severity tag

        assert "Рекомендация:" in result.message

    else:

        assert "Критических блокеров не обнаружено" in result.message





def test_scenario_roadmap_view(_payload):

    result = resolve_project_awareness_command("Куда движется проект?", _payload)

    assert result is not None

    assert "Roadmap View" in result.message

    assert "Текущий —" in result.message or "текущий —" in result.message
    assert "Бизнес-результат" in result.message

    assert "Project Awareness Assessment" not in result.message





def test_scenario_active_stage_and_readiness(_payload):

    result = resolve_project_awareness_command("На каком этапе находится проект?", _payload)

    assert result is not None

    assert "Текущий этап:" in result.message

    assert "Готовность:" in result.message





def test_scenario_completed_work_items(_payload):

    result = resolve_project_awareness_command("Что уже реализовано?", _payload)

    assert result is not None

    assert "Завершённые WI" in result.message





def test_knowledge_defers_to_project_awareness(_payload):

    query = "Что ещё не реализовано?"

    assert is_project_awareness_query(query)

    assert is_knowledge_corpus_command(query) is False

    assert resolve_knowledge_corpus_command(query, _payload) is None





def test_project_awareness_priority_over_strategy_unlock_recommendation(_payload):

    query = "Что делать дальше?"

    awareness = resolve_project_awareness_command(query, _payload)

    strategy = resolve_strategy_command(query, _payload)

    unlock = resolve_unlock_command(query, _payload)

    recommendation = resolve_recommendation_command(query, _payload)

    assert awareness is not None

    response = run_demo_pipeline(

        YASIIRequest(requestId="awareness-priority-001", payload={**_payload, "text": query}),

    )

    assert "Project Awareness Assessment" in response.payload["message"]

    assert strategy is not None or unlock is not None or recommendation is not None





def test_catalog_has_p11_w02():

    item = work_item_by_key("P11-W02")

    assert item is not None

    assert item.analyzer_check == "yasii_p11_w02_project_awareness_engine"

    assert "P11-W01" in item.depends_on


