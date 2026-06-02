"""Project Awareness Engine (P11-W02) — deterministic project state from platform_tasks + catalog."""

from __future__ import annotations

from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.platform_dashboard.yasii_catalog import (
    YASII_CRITICAL_PATH,
    YASII_STAGES,
    YASII_WORK_ITEMS,
    YasiiWorkItemDefinition,
    stage_by_slug,
    work_item_by_key,
    work_item_track,
    work_items_by_stage,
)
from app.modules.platform_dashboard.yasii_sync import (
    _dependencies_satisfied,
    classify_yasii_phase_work_items,
    classify_yasii_phases,
)
from app.modules.yasii.project_state_models import ProjectState

PROJECT_AWARENESS_SCHEMA_VERSION = "0.1.0"
ASSESSMENT_HEADER = "Project Awareness Assessment"


class ProjectAwarenessQueryKind(str, Enum):
    NEXT_STEP = "next_step"
    EXPLANATION = "explanation"
    PROJECT_STATE = "project_state"
    BLOCKERS = "blockers"
    ROADMAP = "roadmap"
    COMPLETED = "completed"
    REMAINING = "remaining"


class StageRoadmapStep(BaseModel):
    slug: str = ""
    title: str = ""
    readiness: int = 0
    status: str = ""


class WorkItemBrief(BaseModel):
    workItemId: str
    title: str = ""
    description: str = ""
    whyNeeded: str = ""
    enables: list[str] = Field(default_factory=list)
    expectedOutcome: str = ""
    effect: str = ""


class ProjectPriority(BaseModel):
    workItemId: str
    title: str = ""
    priorityScore: int = 0
    reasoning: list[str] = Field(default_factory=list)
    stageSlug: str = ""
    track: str = ""


class ProjectAwarenessAssessment(BaseModel):
    schemaVersion: str = Field(default=PROJECT_AWARENESS_SCHEMA_VERSION)
    assessmentId: str = Field(default_factory=lambda: f"awareness-{uuid4().hex[:12]}")
    queryKind: ProjectAwarenessQueryKind = ProjectAwarenessQueryKind.NEXT_STEP
    currentState: ProjectState
    priorities: list[ProjectPriority] = Field(default_factory=list)
    nextActions: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    roadmap: list[StageRoadmapStep] = Field(default_factory=list)
    focusWorkItem: WorkItemBrief | None = None
    doneWorkItemKeys: list[str] = Field(default_factory=list)
    summary: str = ""
    sources: list[str] = Field(default_factory=list)


WORK_ITEM_EXPECTED_OUTCOMES: dict[str, str] = {
    "P10-W03": (
        "Подтверждение сквозной работоспособности всех слоёв ЯСИИ "
        "через единый runtime pipeline."
    ),
    "P10-W06": "Архитектурный sign-off MVP и переход к Memory Foundation / Project Knowledge.",
    "P11-W01": "ЯСИИ читает docs/ и отвечает по Project Knowledge Corpus, а не статикой.",
    "P11-W02": "Ответы о состоянии проекта строятся из platform_tasks и catalog, а не из чата.",
    "P8-W01": "Базовый слой памяти (user/tenant/session) доступен runtime.",
    "P9-W01": "Strategy Layer оценивает цели и конфликты поверх памяти.",
}


_NEXT_STEP_KEYWORDS = (
    "что делать дальше",
    "что делать сейчас",
    "какой следующий wi",
    "какой следующий шаг",
    "следующий wi",
    "следующий шаг",
    "что сейчас приоритетно",
    "что приоритетно",
    "какая следующая работа",
    "следующая работа",
    "что даст максимальный эффект",
    "максимальный эффект",
    "что лучше сделать следующим",
)

_STATE_KEYWORDS = (
    "где мы сейчас",
    "на каком этапе",
    "какой этап активен",
    "текущий этап",
    "состояние проекта",
    "какой процент готовности",
    "процент готовности",
    "готовность платформы",
)

_COMPLETED_KEYWORDS = (
    "что уже реализовано",
    "что реализовано в проекте",
    "что сделано",
    "что завершено",
)

_REMAINING_KEYWORDS = (
    "что ещё осталось",
    "что еще осталось",
    "что осталось сделать",
    "что ещё не реализовано",
    "что еще не реализовано",
    "что не реализовано",
)

_BLOCKER_KEYWORDS = (
    "что блокирует",
    "блокирует развитие",
    "какие зависимости ещё не выполнены",
    "какие зависимости еще не выполнены",
    "почему нельзя перейти к следующему этапу",
    "что мешает перейти",
)

_ROADMAP_KEYWORDS = (
    "какой следующий этап",
    "что будет после",
    "куда движется проект",
    "дорожная карта проекта",
)

def _normalize(text: str) -> str:
    import re

    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def classify_project_awareness_query(query_text: str) -> ProjectAwarenessQueryKind | None:
    normalized = _normalize(query_text)
    if not normalized:
        return None
    if any(k in normalized for k in _NEXT_STEP_KEYWORDS):
        return ProjectAwarenessQueryKind.NEXT_STEP
    if any(k in normalized for k in _BLOCKER_KEYWORDS):
        return ProjectAwarenessQueryKind.BLOCKERS
    if any(k in normalized for k in _ROADMAP_KEYWORDS):
        return ProjectAwarenessQueryKind.ROADMAP
    if any(k in normalized for k in _COMPLETED_KEYWORDS):
        return ProjectAwarenessQueryKind.COMPLETED
    if any(k in normalized for k in _REMAINING_KEYWORDS):
        return ProjectAwarenessQueryKind.REMAINING
    if any(k in normalized for k in _STATE_KEYWORDS):
        return ProjectAwarenessQueryKind.PROJECT_STATE
    return None


def is_project_awareness_query(query_text: str) -> bool:
    from app.modules.yasii.business_explanation import is_business_explanation_query
    from app.modules.yasii.development_intelligence import is_development_intelligence_query
    from app.modules.yasii.governance_answers import is_governance_query

    if is_governance_query(query_text):
        return False
    if is_development_intelligence_query(query_text):
        return False
    if is_business_explanation_query(query_text):
        return False
    return classify_project_awareness_query(query_text) is not None


def _work_item_label(item: YasiiWorkItemDefinition) -> str:
    return f"{item.key} {item.title}"


def load_project_state_from_db(db) -> tuple[ProjectState, set[str], dict[str, bool]]:
    from app.modules.yasii.unified_project_state import build_unified_project_state

    unified = build_unified_project_state(db)
    return (
        unified.developmentWorkspace.yasii,
        set(unified.doneKeys),
        dict(unified.itemPassed),
    )


def _priority_score(
    item: YasiiWorkItemDefinition,
    *,
    done_keys: set[str],
    active_stage_slug: str,
) -> tuple[int, list[str]]:
    if item.key in done_keys:
        return 0, []

    reasoning: list[str] = []
    score = item.weight

    if item.stage_slug == active_stage_slug:
        score += 50
        reasoning.append("этап активен в catalog/dashboard")

    if _dependencies_satisfied(item, done_keys):
        score += 40
        reasoning.append("все зависимости выполнены")
    else:
        missing = [dep for dep in item.depends_on if dep not in done_keys]
        reasoning.append(f"ожидает зависимости: {', '.join(missing)}")

    if item.key in YASII_CRITICAL_PATH:
        score += 15
        reasoning.append("на критическом пути YASII")

    if item.mvp is True:
        score += 10
        reasoning.append("MVP work item")

    return score, reasoning


def _format_refs(item: YasiiWorkItemDefinition) -> str:
    parts: list[str] = []
    if item.system_map_ref:
        parts.append("System Map: " + ", ".join(item.system_map_ref))
    if item.constitution_ref:
        parts.append("Constitution: " + ", ".join(item.constitution_ref))
    return " · ".join(parts) if parts else item.title


def _default_expected_outcome(item: YasiiWorkItemDefinition) -> str:
    if item.mvp is True:
        return f"MVP-контур: закрытие {item.key} подтверждает готовность этапа {item.stage_slug}."
    return f"Закрытие {item.key} повышает readiness этапа и снимает блокировки зависимых WI."


def build_work_item_brief(item: YasiiWorkItemDefinition, done_keys: set[str]) -> WorkItemBrief:
    dep_labels = []
    for dep in item.depends_on:
        if str(dep).startswith("MVP"):
            dep_labels.append(dep)
            continue
        dep_item = work_item_by_key(dep)
        status = "готово" if dep in done_keys else "открыто"
        label = f"{dep} {dep_item.title}" if dep_item else dep
        dep_labels.append(f"{label} ({status})")

    if dep_labels:
        why = "Нужен, потому что зависит от: " + "; ".join(dep_labels) + "."
    else:
        why = "Стартовая или самостоятельная работа этапа — можно начинать без WI-зависимостей."

    enables = list(item.enables)
    if enables:
        enable_labels = []
        for key in enables:
            child = work_item_by_key(key)
            enable_labels.append(f"{key} {child.title}" if child else key)
        effect = "После завершения откроет: " + ", ".join(enable_labels) + "."
    else:
        effect = "После завершения разблокирует следующие WI этапа по catalog."

    outcome = WORK_ITEM_EXPECTED_OUTCOMES.get(item.key) or _default_expected_outcome(item)
    return WorkItemBrief(
        workItemId=item.key,
        title=item.title,
        description=_format_refs(item),
        whyNeeded=why,
        enables=enables,
        expectedOutcome=outcome,
        effect=effect,
    )


def build_stage_roadmap(done_keys: set[str]) -> list[StageRoadmapStep]:
    """Текущий этап + два следующих по yasii_catalog (readiness из platform_tasks)."""
    _completed_titles, _current_titles, _next_titles, phase_readiness = classify_yasii_phases(done_keys)
    all_steps = [
        StageRoadmapStep(
            slug=stage.slug,
            title=stage.title,
            readiness=phase_readiness.get(stage.slug, 0),
            status="",
        )
        for stage in YASII_STAGES
    ]
    current_idx = next((i for i, row in enumerate(all_steps) if row.readiness < 100), len(all_steps) - 1)
    labels = ("текущий", "следующий", "следующий после него")
    window: list[StageRoadmapStep] = []
    for offset, label in enumerate(labels):
        idx = current_idx + offset
        if idx >= len(all_steps):
            break
        window.append(all_steps[idx].model_copy(update={"status": label}))
    return window


def resolve_focus_work_item(
    state: ProjectState,
    priorities: list[ProjectPriority],
    done_keys: set[str],
) -> WorkItemBrief | None:
    if state.activeWorkItems:
        first = state.activeWorkItems[0].split(maxsplit=1)
        key = first[0] if first else ""
        item = work_item_by_key(key)
        if item is not None:
            return build_work_item_brief(item, done_keys)

    if priorities:
        item = work_item_by_key(priorities[0].workItemId)
        if item is not None:
            return build_work_item_brief(item, done_keys)
    return None


def rank_project_priorities(state: ProjectState, done_keys: set[str]) -> list[ProjectPriority]:
    priorities: list[ProjectPriority] = []
    for item in YASII_WORK_ITEMS:
        score, reasoning = _priority_score(
            item,
            done_keys=done_keys,
            active_stage_slug=state.activeStageSlug,
        )
        if score <= 0:
            continue
        priorities.append(
            ProjectPriority(
                workItemId=item.key,
                title=item.title,
                priorityScore=score,
                reasoning=reasoning,
                stageSlug=item.stage_slug,
                track=work_item_track(item.key),
            ),
        )
    priorities.sort(key=lambda row: (-row.priorityScore, row.workItemId))
    return priorities


def build_project_awareness_assessment(
    query_text: str,
    db,
) -> ProjectAwarenessAssessment:
    kind = classify_project_awareness_query(query_text) or ProjectAwarenessQueryKind.NEXT_STEP
    state, done_keys, _item_passed = load_project_state_from_db(db)
    priorities = rank_project_priorities(state, done_keys)
    top = priorities[0] if priorities else None

    blockers = list(state.blockedWorkItems)
    next_actions: list[str] = []
    summary = ""
    sources = ["platform_tasks", "yasii_catalog", "dashboard readiness"]

    if kind == ProjectAwarenessQueryKind.BLOCKERS:
        summary = "Blocker Detection: platform_tasks + yasii_catalog."
    elif kind == ProjectAwarenessQueryKind.ROADMAP:
        summary = "Roadmap View: текущий и следующие этапы из yasii_catalog и platform_tasks."
    elif kind == ProjectAwarenessQueryKind.NEXT_STEP and top is not None:
        summary = (
            f"Рекомендуемый следующий шаг — {top.workItemId} ({top.title}) "
            f"на активном этапе {state.activeStageTitle}."
        )
    elif kind == ProjectAwarenessQueryKind.COMPLETED:
        summary = f"Закрыто WI: {len(state.completedWorkItems)} из {len(YASII_WORK_ITEMS)}."
    elif kind == ProjectAwarenessQueryKind.REMAINING:
        summary = f"Открыто WI: {len(state.openWorkItems)}."
    else:
        summary = (
            f"Активный этап {state.activeStageTitle}, container readiness {state.containerReadiness}%."
        )

    focus = None
    roadmap: list[StageRoadmapStep] = []
    if kind == ProjectAwarenessQueryKind.ROADMAP:
        roadmap = build_stage_roadmap(done_keys)
    if kind == ProjectAwarenessQueryKind.NEXT_STEP:
        focus = resolve_focus_work_item(state, priorities, done_keys)

    return ProjectAwarenessAssessment(
        queryKind=kind,
        currentState=state,
        priorities=priorities[:8],
        nextActions=next_actions,
        blockers=blockers[:10],
        roadmap=roadmap,
        focusWorkItem=focus,
        doneWorkItemKeys=sorted(done_keys),
        summary=summary,
        sources=sources,
    )


def format_roadmap_message(assessment: ProjectAwarenessAssessment, query_text: str) -> str:
    from app.modules.yasii.business_explanation import build_stage_business_briefs

    done_keys = set(assessment.doneWorkItemKeys)
    stage_rows = build_stage_business_briefs(done_keys)
    lines = [
        "Roadmap View",
        "",
        f"Запрос:\n{query_text.strip()}",
        "",
    ]
    for row in stage_rows:
        lines.append(f"{row.status.capitalize()} — {row.title} ({row.readiness}%)")
        lines.append(f"  Цель: {row.goal}")
        lines.append(f"  Бизнес-результат: {row.businessResult}")
        lines.append("")
    lines.append("Источник:")
    lines.extend(f"- {source}" for source in assessment.sources)
    return "\n".join(lines)


def format_next_step_message(assessment: ProjectAwarenessAssessment, query_text: str) -> str:
    focus = assessment.focusWorkItem
    top = assessment.priorities[0] if assessment.priorities else None
    lines = [
        "Project Awareness Assessment",
        "",
        f"Запрос:\n{query_text.strip()}",
        "",
    ]
    if focus is None and top is None:
        lines.append("Открытых приоритетных WI по catalog не найдено.")
        return "\n".join(lines)

    if focus is not None:
        lines.extend(
            [
                f"Следующий WI:\n{focus.workItemId} {focus.title}",
                "",
                "Описание:",
                f"- {focus.description}",
                "",
                "Зачем нужен:",
                f"- {focus.whyNeeded}",
                "",
                "Expected Outcome:",
                f"- {focus.expectedOutcome}",
                "",
                "Эффект после завершения:",
                f"- {focus.effect}",
                "",
            ],
        )
        item = work_item_by_key(focus.workItemId)
        if item is not None:
            from app.modules.yasii.business_explanation import business_effect_block

            lines.append(business_effect_block(item, set(assessment.doneWorkItemKeys)))
            lines.append("")
        if top is not None and top.reasoning:
            lines.append("Приоритет (catalog + readiness):")
            for reason in top.reasoning:
                lines.append(f"- {reason}")
            if "все зависимости выполнены" in top.reasoning:
                lines.append("- максимальный вклад в развитие проекта")
            lines.append("")

    lines.append("Источник:")
    lines.extend(f"- {source}" for source in assessment.sources)
    return "\n".join(lines)


def format_project_awareness_message(assessment: ProjectAwarenessAssessment, query_text: str) -> str:
    if assessment.queryKind == ProjectAwarenessQueryKind.ROADMAP:
        return format_roadmap_message(assessment, query_text)
    if assessment.queryKind == ProjectAwarenessQueryKind.NEXT_STEP:
        return format_next_step_message(assessment, query_text)
    state = assessment.currentState
    lines = [
        ASSESSMENT_HEADER,
        "",
        f"Запрос:\n{query_text.strip()}",
        "",
        f"Текущий этап:\n{state.activeStageTitle}",
        "",
        "Готовность:",
        f"- Реализовано: Container {state.containerImplementationReadiness}% · "
        f"YASII {state.yasiiTrackImplementationReadiness}% · ACE {state.aceTrackImplementationReadiness}%",
        f"- Готово к выпуску: Container {state.containerReleaseReadiness}% · "
        f"YASII {state.yasiiTrackReleaseReadiness}% · ACE {state.aceTrackReleaseReadiness}%",
    ]
    if state.governanceReleaseBlockerLabel:
        lines.append(f"- Блокер выпуска: {state.governanceReleaseBlockerLabel}")
    lines.append("")

    if state.activeWorkItems:
        lines.append("Текущие работы этапа:")
        lines.extend(f"- {item}" for item in state.activeWorkItems[:6])
        lines.append("")

    if assessment.priorities and assessment.queryKind == ProjectAwarenessQueryKind.PROJECT_STATE:
        top = assessment.priorities[0]
        lines.append(f"Фокус WI:\n{top.workItemId} {top.title}")
        lines.append("")

    if assessment.queryKind == ProjectAwarenessQueryKind.COMPLETED:
        lines.append("Завершённые WI (примеры):")
        lines.extend(f"- {row}" for row in state.completedWorkItems[:10])
        if len(state.completedWorkItems) > 10:
            lines.append(f"- … ещё {len(state.completedWorkItems) - 10}")
        lines.append("")

    if assessment.queryKind == ProjectAwarenessQueryKind.REMAINING:
        lines.append("Открытые WI (примеры):")
        lines.extend(f"- {row}" for row in state.openWorkItems[:10])
        lines.append("")

    lines.append("Источник:")
    lines.extend(f"- {source}" for source in assessment.sources)
    return "\n".join(lines)
