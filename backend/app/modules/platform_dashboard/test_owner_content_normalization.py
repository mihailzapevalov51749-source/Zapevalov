import re

from app.modules.platform_dashboard.owner_content_normalization import (
    OWNER_STATUS_IN_PROGRESS,
    OWNER_STATUS_PLANNED,
    aggregate_history_events,
    apply_development_work_summary,
    normalize_development_stage_content,
    normalize_history_title,
    owner_status_from_readiness,
    rewrite_development_work_line,
)
from app.modules.platform_dashboard.owner_read_adapter import OwnerHistoryEvent, OwnerStageView
from datetime import datetime


def test_owner_status_from_readiness():
    assert owner_status_from_readiness(0) == OWNER_STATUS_PLANNED
    assert owner_status_from_readiness(40) == OWNER_STATUS_IN_PROGRESS
    assert owner_status_from_readiness(100) == "Завершено"
    assert owner_status_from_readiness(None) is None


def test_rewrite_development_work_line_strips_technical_noise():
    raw = "убрать runtimeReadGateway legacy fallback — **already done** (2026-05-30, [DOC.md](./X.md));"
    result = rewrite_development_work_line(raw)
    assert "runtimeReadGateway" not in result
    assert "**" not in result
    assert ".md" not in result
    assert "legacy" not in result.casefold() or "устарев" in result.casefold()


def test_rewrite_slug_phrase_object_platform():
    result = rewrite_development_work_line("object-platform-independence phase")
    assert "объектн" in result.casefold()


def test_apply_development_work_summary_keeps_relation_field_work_list():
    remaining = [
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
    ]
    done, in_work, owner_remaining, meta = apply_development_work_summary(
        "dev-relation-field-type",
        [],
        [],
        remaining,
    )
    assert meta == {}
    assert owner_remaining == remaining
    assert "7 работ" not in " ".join(owner_remaining)


def test_normalize_development_relation_field_stage_lists_works():
    stage = OwnerStageView(
        id="dev-relation-field-type",
        title='Тип поля "Связи"',
        description="",
        readiness=0,
        done=[],
        inWork=[],
        remaining=[
            "Контракт поля",
            "Studio",
            "Runtime API",
        ],
        meta={},
    )
    normalized = normalize_development_stage_content(stage)
    assert len(normalized.remaining) == 3
    assert normalized.remaining == ["Контракт поля", "Studio", "Runtime API"]
    assert "работ" not in " ".join(normalized.remaining).casefold()


def test_aggregate_dashboard_refresh_events():
    day = datetime(2026, 6, 1, 12, 0, 0)
    events = [
        OwnerHistoryEvent(
            id=str(i),
            group_key="hist-dashboard",
            title="Обновление Dashboard",
            description="Общая готовность: 84% → 84%",
            occurred_at=day.replace(hour=i),
            meta={"activity_type": "dashboard_refresh"},
        )
        for i in range(5)
    ]
    aggregated = aggregate_history_events(events)
    assert len(aggregated) == 1
    assert aggregated[0].meta.get("aggregated") is True
    assert aggregated[0].meta.get("aggregate_count") == 5
    assert "5" in aggregated[0].title


def test_normalize_history_title_analysis():
    assert normalize_history_title("analysis", "Анализ") == "Проверка готовности проекта"
    assert "analysis" not in normalize_history_title("analysis", "analysis").casefold()


def test_aggregate_mixed_history_keeps_non_refresh():
    refresh = OwnerHistoryEvent(
        id="1",
        group_key="hist-dashboard",
        title="Обновление Dashboard",
        description="",
        occurred_at=datetime(2026, 6, 1, 10, 0, 0),
        meta={"activity_type": "dashboard_refresh"},
    )
    milestone = OwnerHistoryEvent(
        id="2",
        group_key="hist-delivery",
        title="Веха разработки",
        description="Platform Dashboard",
        occurred_at=datetime(2026, 6, 1, 11, 0, 0),
        meta={"activity_type": "milestone"},
    )
    result = aggregate_history_events([refresh, milestone])
    assert len(result) == 2
    assert any(event.meta.get("activity_type") == "milestone" for event in result)
