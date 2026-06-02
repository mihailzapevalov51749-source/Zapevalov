"""Business Explanation Layer (P11-W03) — WI/stage value in owner language."""

from __future__ import annotations

import re
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.platform_dashboard.yasii_catalog import (
    YASII_STAGES,
    YasiiWorkItemDefinition,
    stage_by_slug,
    work_item_by_key,
)
from app.modules.yasii.project_awareness import (
    ProjectAwarenessQueryKind,
    build_project_awareness_assessment,
    build_stage_roadmap,
    build_work_item_brief,
    classify_project_awareness_query,
    load_project_state_from_db,
    rank_project_priorities,
    resolve_focus_work_item,
)

BUSINESS_EXPLANATION_SCHEMA_VERSION = "0.1.0"
ASSESSMENT_HEADER = "Business Explanation"


class BusinessEntityType(str, Enum):
    WORK_ITEM = "work_item"
    STAGE = "stage"
    ROADMAP = "roadmap"


class BusinessExplanationQueryKind(str, Enum):
    THREE_VIEWS = "three_views"
    BUSINESS_IMPACT = "business_impact"
    SIMPLE_LANGUAGE = "simple_language"
    STAGE_ROADMAP = "stage_roadmap"
    BENEFIT = "benefit"


class BusinessExplanation(BaseModel):
    schemaVersion: str = Field(default=BUSINESS_EXPLANATION_SCHEMA_VERSION)
    explanationId: str = Field(default_factory=lambda: f"biz-{uuid4().hex[:12]}")
    entityType: BusinessEntityType = BusinessEntityType.WORK_ITEM
    entityId: str = ""
    technicalView: str = ""
    projectView: str = ""
    businessView: str = ""
    expectedOutcome: str = ""
    businessImpact: str = ""


class WorkItemExplanation(BaseModel):
    workItemKey: str
    what: str = ""
    why: str = ""
    outcome: str = ""
    impact: str = ""
    nextStep: str = ""


class StageBusinessBrief(BaseModel):
    slug: str
    title: str = ""
    goal: str = ""
    businessResult: str = ""
    readiness: int = 0
    status: str = ""


class BusinessAwarenessSnapshot(BaseModel):
    currentEffect: str = ""
    nextEffect: str = ""
    stageValue: str = ""


WORK_ITEM_PROJECT_VIEWS: dict[str, str] = {
    "P10-W03": "Проверка совместной работы всех слоёв ЯСИИ в едином runtime pipeline.",
    "P10-W06": "Финальная проверка готовности MVP перед расширением памяти и знаний проекта.",
    "P11-W01": "Подключение документации проекта как источника ответов ЯСИИ.",
    "P11-W02": "Ответы о состоянии проекта из Dashboard и catalog, а не из истории чата.",
    "P11-W03": "Перевод технических WI в понятную ценность для владельца и руководителя.",
    "P7-W04": "Встраивание ЯСИИ в Platform Dashboard как рабочую поверхность.",
    "P6-W05": "Отчёты для владельца продукта о здоровье и отклонениях платформы.",
    "P9-W01": "Стратегический слой: приоритеты и согласование с целями организации.",
}

WORK_ITEM_BUSINESS_VIEWS: dict[str, str] = {
    "P10-W03": (
        "После завершения MVP можно безопасно показывать пользователям и использовать "
        "как единую систему без ручных переключений между режимами."
    ),
    "P10-W06": (
        "Команда получает формальное подтверждение архитектуры и может планировать "
        "следующие инвестиции в память и знания без риска пересборки MVP."
    ),
    "P11-W01": (
        "Пользователи и владелец продукта получают ответы по реальной документации проекта, "
        "а не по устаревшим шаблонам."
    ),
    "P11-W02": (
        "Руководитель видит честный статус работ и следующий шаг без интерпретации логов разработки."
    ),
    "P11-W03": (
        "ЯСИИ объясняет не только «что делать», но и «зачем» и «какой эффект» — "
        "на языке бизнеса, а не только catalog WI."
    ),
    "P7-W04": (
        "ЯСИИ доступен там, где принимаются решения о развитии платформы — в Dashboard."
    ),
    "P6-W05": (
        "Владелец получает сводку рисков и отклонений без ручного сбора статусов."
    ),
    "P9-W01": (
        "Снижается риск противоречивых решений: действия сверяются с целями tenant."
    ),
}

WORK_ITEM_BUSINESS_IMPACT: dict[str, str] = {
    "P10-W03": "Снижение риска демонстрации и ускорение вывода продукта.",
    "P10-W06": "Уверенность инвесторов и заказчиков в архитектурной зрелости MVP.",
    "P11-W01": "Меньше ошибок из-за устаревших знаний; быстрее онбординг новых участников.",
    "P11-W02": "Прозрачное планирование релизов и приоритетов без «чёрного ящика» в чате.",
    "P11-W03": "Рост доверия к ЯСИИ у не-технических ролей; меньше эскалаций к разработке.",
}

STAGE_BUSINESS_RESULTS: dict[str, str] = {
    "yasii-platform-readiness": "Демонстрируемый MVP с проверенными сценариями для пользователей.",
    "yasii-project-knowledge": "ЯСИИ опирается на документы и факты проекта, а не на догадки.",
    "yasii-business-awareness": "Каждый шаг развития объясняется через пользу для бизнеса.",
    "yasii-memory-foundation": "ЯСИИ помнит решения и контекст между сессиями.",
    "yasii-strategy-layer": "Рекомендации согласованы с целями организации.",
    "yasii-embedded-intelligence": "ИИ встроен в рабочие экраны без отдельного чата.",
}

_BENEFIT_KEYWORDS = (
    "зачем нужен этот этап",
    "почему это важно",
    "что изменится после завершения",
    "что изменится после",
    "какую пользу",
    "какая польза",
    "зачем нужен",
    "зачем эта работа",
)

_SIMPLE_KEYWORDS = (
    "объясни простыми словами",
    "простыми словами",
    "объясни как руководителю",
    "как руководителю",
    "объясни как владельцу",
    "владельцу продукта",
    "какой эффект получит пользователь",
)

_IMPACT_KEYWORDS = (
    "бизнес-эффект",
    "бизнес эффект",
    "business impact",
)

_STAGE_ROADMAP_KEYWORDS = (
    "зачем нужен следующий этап",
    "что откроется после него",
    "почему мы делаем это сейчас",
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def classify_business_explanation_query(query_text: str) -> BusinessExplanationQueryKind | None:
    normalized = _normalize(query_text)
    if not normalized:
        return None
    if any(k in normalized for k in _SIMPLE_KEYWORDS):
        return BusinessExplanationQueryKind.SIMPLE_LANGUAGE
    if any(k in normalized for k in _STAGE_ROADMAP_KEYWORDS):
        return BusinessExplanationQueryKind.STAGE_ROADMAP
    if any(k in normalized for k in _IMPACT_KEYWORDS):
        return BusinessExplanationQueryKind.BUSINESS_IMPACT
    if "что изменится после завершения" in normalized:
        return BusinessExplanationQueryKind.BUSINESS_IMPACT
    if any(k in normalized for k in _BENEFIT_KEYWORDS):
        return BusinessExplanationQueryKind.BENEFIT
    awareness = classify_project_awareness_query(query_text)
    if awareness == ProjectAwarenessQueryKind.EXPLANATION:
        return BusinessExplanationQueryKind.THREE_VIEWS
    return None


def is_business_explanation_query(query_text: str) -> bool:
    from app.modules.yasii.development_intelligence import is_development_intelligence_query

    if is_development_intelligence_query(query_text):
        return False
    return classify_business_explanation_query(query_text) is not None


def _technical_view(item: YasiiWorkItemDefinition) -> str:
    return f"{item.key} {item.title}"


def _project_view(item: YasiiWorkItemDefinition) -> str:
    if item.key in WORK_ITEM_PROJECT_VIEWS:
        return WORK_ITEM_PROJECT_VIEWS[item.key]
    stage = stage_by_slug(item.stage_slug)
    if stage:
        return f"Вклад в этап «{stage.title}»: {stage.description}"
    return item.title


def _business_view(item: YasiiWorkItemDefinition) -> str:
    if item.key in WORK_ITEM_BUSINESS_VIEWS:
        return WORK_ITEM_BUSINESS_VIEWS[item.key]
    if item.mvp is True:
        return (
            "Ускоряет вывод MVP и снижает риск срыва демонстраций для заказчиков и пользователей."
        )
    return "Повышает предсказуемость развития платформы и доверие к рекомендациям ЯСИИ."


def _business_impact(item: YasiiWorkItemDefinition) -> str:
    if item.key in WORK_ITEM_BUSINESS_IMPACT:
        return WORK_ITEM_BUSINESS_IMPACT[item.key]
    if item.enables:
        return "Открывает следующие возможности платформы и сокращает время согласований."
    return "Снижает неопределённость при планировании и приоритизации работ."


def build_work_item_explanation(item: YasiiWorkItemDefinition, done_keys: set[str]) -> WorkItemExplanation:
    brief = build_work_item_brief(item, done_keys)
    return WorkItemExplanation(
        workItemKey=item.key,
        what=_technical_view(item),
        why=brief.whyNeeded,
        outcome=brief.expectedOutcome,
        impact=_business_impact(item),
        nextStep=f"Начать или завершить {item.key} по плану Dashboard.",
    )


def build_business_explanation_for_work_item(
    item: YasiiWorkItemDefinition,
    done_keys: set[str],
) -> BusinessExplanation:
    brief = build_work_item_brief(item, done_keys)
    return BusinessExplanation(
        entityType=BusinessEntityType.WORK_ITEM,
        entityId=item.key,
        technicalView=_technical_view(item),
        projectView=_project_view(item),
        businessView=_business_view(item),
        expectedOutcome=brief.expectedOutcome,
        businessImpact=_business_impact(item),
    )


def build_stage_business_briefs(done_keys: set[str]) -> list[StageBusinessBrief]:
    roadmap = build_stage_roadmap(done_keys)
    rows: list[StageBusinessBrief] = []
    for step in roadmap:
        stage = stage_by_slug(step.slug)
        goal = stage.description if stage else step.title
        result = STAGE_BUSINESS_RESULTS.get(
            step.slug,
            "Расширение возможностей ЯСИИ для пользователей платформы.",
        )
        rows.append(
            StageBusinessBrief(
                slug=step.slug,
                title=step.title,
                goal=goal,
                businessResult=result,
                readiness=step.readiness,
                status=step.status,
            ),
        )
    return rows


def build_business_awareness_snapshot(db) -> BusinessAwarenessSnapshot:
    state, done_keys, _passed = load_project_state_from_db(db)
    priorities = rank_project_priorities(state, done_keys)
    focus_item = None
    if state.activeWorkItems:
        key = state.activeWorkItems[0].split(maxsplit=1)[0]
        focus_item = work_item_by_key(key)
    if focus_item is None and priorities:
        focus_item = work_item_by_key(priorities[0].workItemId)

    delivered: list[str] = []
    if "P11-W02" in done_keys:
        delivered.append("ЯСИИ отвечает по реальному состоянию проекта (WI, этапы, readiness).")
    if "P11-W01" in done_keys:
        delivered.append("Ответы опираются на документацию проекта (Knowledge Corpus).")
    if state.containerReadiness >= 90:
        delivered.append(f"Платформа готова на {state.containerReadiness}% — MVP-контур близок к sign-off.")
    if not delivered:
        delivered.append("ЯСИИ доступен как встроенный помощник в Dashboard и embedded-поверхностях.")

    current_effect = " ".join(delivered)
    if focus_item is not None:
        exp = build_work_item_explanation(focus_item, done_keys)
        next_effect = f"{exp.impact} ({focus_item.key})."
    else:
        next_effect = "Следующий WI уточняется по catalog и platform_tasks."

    active_stage = stage_by_slug(state.activeStageSlug)
    stage_value = STAGE_BUSINESS_RESULTS.get(
        state.activeStageSlug,
        active_stage.description if active_stage else state.activeStageTitle,
    )

    return BusinessAwarenessSnapshot(
        currentEffect=current_effect,
        nextEffect=next_effect,
        stageValue=stage_value,
    )


def resolve_focus_work_item_for_business(db) -> tuple[YasiiWorkItemDefinition | None, set[str]]:
    state, done_keys, _passed = load_project_state_from_db(db)
    assessment = build_project_awareness_assessment("Что делать дальше?", db)
    if assessment.focusWorkItem is not None:
        item = work_item_by_key(assessment.focusWorkItem.workItemId)
        if item is not None:
            return item, done_keys
    focus = resolve_focus_work_item(state, assessment.priorities, done_keys)
    if focus is not None:
        return work_item_by_key(focus.workItemId), done_keys
    return None, done_keys


def business_effect_block(item: YasiiWorkItemDefinition, done_keys: set[str]) -> str:
    exp = build_work_item_explanation(item, done_keys)
    return (
        "Бизнес-эффект:\n"
        f"- {exp.impact}\n"
        f"- {_business_view(item)}"
    )


def format_three_views_message(explanation: BusinessExplanation, query_text: str) -> str:
    return "\n".join(
        [
            ASSESSMENT_HEADER,
            "",
            f"Запрос:\n{query_text.strip()}",
            "",
            "Technical View",
            "",
            explanation.technicalView,
            "",
            "Project View",
            "",
            explanation.projectView,
            "",
            "Business View",
            "",
            explanation.businessView,
            "",
            "Бизнес-эффект",
            "",
            explanation.businessImpact,
            "",
            "Источник:",
            "- yasii_catalog",
            "- project awareness",
            "- dashboard readiness",
        ],
    )


def format_business_impact_message(explanation: BusinessExplanation, query_text: str) -> str:
    return "\n".join(
        [
            ASSESSMENT_HEADER,
            "",
            f"Запрос:\n{query_text.strip()}",
            "",
            f"WI:\n{explanation.technicalView}",
            "",
            "Expected Outcome:",
            "",
            explanation.expectedOutcome,
            "",
            "Business Impact:",
            "",
            explanation.businessImpact,
            "",
            "Источник:",
            "- yasii_catalog",
            "- project awareness",
        ],
    )


def format_simple_language_message(explanation: BusinessExplanation, query_text: str) -> str:
    return "\n".join(
        [
            ASSESSMENT_HEADER,
            "",
            f"Запрос:\n{query_text.strip()}",
            "",
            "Простыми словами:",
            "",
            explanation.businessView,
            "",
            "Источник:",
            "- business explanation layer",
        ],
    )


def format_stage_roadmap_business_message(
    stages: list[StageBusinessBrief],
    query_text: str,
) -> str:
    lines = [
        ASSESSMENT_HEADER,
        "",
        f"Запрос:\n{query_text.strip()}",
        "",
        "Roadmap (бизнес-уровень):",
        "",
    ]
    for row in stages:
        lines.append(f"{row.status.capitalize()} — {row.title} ({row.readiness}%)")
        lines.append(f"  Цель: {row.goal}")
        lines.append(f"  Бизнес-результат: {row.businessResult}")
        lines.append("")
    lines.append("Источник:")
    lines.extend(["- yasii_catalog", "- platform_tasks", "- project awareness"])
    return "\n".join(lines)


def build_business_explanation_response(query_text: str, db) -> str:
    kind = classify_business_explanation_query(query_text) or BusinessExplanationQueryKind.BENEFIT
    item, done_keys = resolve_focus_work_item_for_business(db)
    if item is None:
        return (
            f"{ASSESSMENT_HEADER}\n\n"
            "Не удалось определить WI для объяснения. Уточните запрос или обновите Dashboard."
        )

    explanation = build_business_explanation_for_work_item(item, done_keys)
    if kind == BusinessExplanationQueryKind.SIMPLE_LANGUAGE:
        return format_simple_language_message(explanation, query_text)
    if kind == BusinessExplanationQueryKind.BUSINESS_IMPACT:
        return format_business_impact_message(explanation, query_text)
    if kind == BusinessExplanationQueryKind.STAGE_ROADMAP:
        stages = build_stage_business_briefs(done_keys)
        return format_stage_roadmap_business_message(stages, query_text)
    if kind in {BusinessExplanationQueryKind.THREE_VIEWS, BusinessExplanationQueryKind.BENEFIT}:
        return format_three_views_message(explanation, query_text)
    return format_three_views_message(explanation, query_text)
