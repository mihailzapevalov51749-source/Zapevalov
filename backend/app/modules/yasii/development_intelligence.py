"""Development Intelligence (P12-W01) — read-only owner/dev control layer."""

from __future__ import annotations

import re
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.platform_dashboard.yasii_catalog import work_item_by_key
from app.modules.yasii.blocker_detection import detect_platform_dependency_blockers
from app.modules.yasii.business_explanation import _business_impact, build_work_item_explanation
from app.modules.yasii.deviation_registry import get_deviation_registry
from app.modules.yasii.knowledge_index import build_project_corpus
from app.modules.yasii.project_corpus import extract_bullets, find_document_by_path
from app.modules.yasii.project_awareness import rank_project_priorities, resolve_focus_work_item
from app.modules.yasii.unified_project_state import build_unified_project_state

DEVELOPMENT_INTELLIGENCE_SCHEMA_VERSION = "0.1.0"
ASSESSMENT_HEADER = "Development Intelligence Assessment"

SEVERITY_HIGH = "HIGH"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_LOW = "LOW"


class DevelopmentQueryKind(str, Enum):
    OVERVIEW = "overview"
    QUALITY = "quality"
    DEBT = "debt"
    RISKS = "risks"
    BLOCKERS = "blockers"
    NEXT_STEP = "next_step"


class DevelopmentState(BaseModel):
    schemaVersion: str = Field(default=DEVELOPMENT_INTELLIGENCE_SCHEMA_VERSION)
    readiness: int = 0
    containerImplementationReadiness: int = 0
    containerReleaseReadiness: int = 0
    yasiiImplementationReadiness: int = 0
    yasiiReleaseReadiness: int = 0
    governanceReleaseBlockerKey: str = ""
    governanceReleaseBlockerLabel: str = ""
    activeStage: str = ""
    currentWorkItems: list[str] = Field(default_factory=list)
    blockedWorkItems: list[str] = Field(default_factory=list)
    qualitySummary: str = ""
    debtSummary: str = ""
    riskSummary: str = ""
    yasiiTrackReadiness: int = 0


class DevelopmentIssue(BaseModel):
    issueId: str
    title: str = ""
    category: str = ""
    severity: str = SEVERITY_MEDIUM
    status: str = ""
    source: str = ""
    affectedArea: str = ""
    reasoning: str = ""


class DevelopmentRisk(BaseModel):
    riskId: str
    title: str = ""
    severity: str = SEVERITY_MEDIUM
    reasoning: str = ""
    recommendedAction: str = ""


class DevelopmentIntelligenceFocus(BaseModel):
    title: str = ""
    reasoning: str = ""


class DevelopmentIntelligenceQuality(BaseModel):
    criticalCount: int = 0
    openCount: int = 0
    summary: str = ""
    connected: bool = False
    topIssues: list[DevelopmentIssue] = Field(default_factory=list)


class DevelopmentIntelligenceDebt(BaseModel):
    highCount: int = 0
    summary: str = ""
    items: list[str] = Field(default_factory=list)


class DevelopmentIntelligenceRisks(BaseModel):
    count: int = 0
    topRisks: list[DevelopmentRisk] = Field(default_factory=list)


class DevelopmentIntelligenceNextStep(BaseModel):
    title: str = ""
    businessImpact: str = ""
    detail: str = ""


class DevelopmentIntelligenceAssessment(BaseModel):
    schemaVersion: str = Field(default=DEVELOPMENT_INTELLIGENCE_SCHEMA_VERSION)
    assessmentId: str = Field(default_factory=lambda: f"dev-intel-{uuid4().hex[:12]}")
    queryKind: DevelopmentQueryKind = DevelopmentQueryKind.OVERVIEW
    state: DevelopmentState
    focus: DevelopmentIntelligenceFocus
    quality: DevelopmentIntelligenceQuality
    debt: DevelopmentIntelligenceDebt
    risks: DevelopmentIntelligenceRisks
    blockers: list[str] = Field(default_factory=list)
    nextStep: DevelopmentIntelligenceNextStep
    summary: str = ""


class DevelopmentIntelligenceSnapshot(BaseModel):
    """Dashboard API snapshot."""
    focus: DevelopmentIntelligenceFocus
    quality: DevelopmentIntelligenceQuality
    debt: DevelopmentIntelligenceDebt
    risks: DevelopmentIntelligenceRisks
    nextStep: DevelopmentIntelligenceNextStep


_OVERVIEW_KEYWORDS = (
    "как идёт разработка",
    "как идет разработка",
    "что сейчас происходит с проектом",
    "какое состояние разработки",
    "состояние разработки",
    "что требует моего внимания",
    "что требует внимания как владельц",
    "что требует внимания",
)

_QUALITY_KEYWORDS = (
    "проблемы качества",
    "разделе качество",
    "раздел качество",
    "критичны проблемы качества",
    "что в разделе качество",
    "какие проблемы повторяются",
    "что чаще всего ломается",
)

_DEBT_KEYWORDS = (
    "технический долг",
    "архитектурные долги",
    "архитектурный долг",
    "накопился долг",
    "снизить долг",
)

_RISK_KEYWORDS = (
    "риски реализации",
    "что может сорвать",
    "слабое место разработки",
    "сорвать развитие",
)

_BLOCKER_KEYWORDS = (
    "что блокирует разработку",
    "что мешает двигаться дальше",
    "какие wi зависли",
    "wi зависли",
)

_NEXT_STEP_KEYWORDS = (
    "что мне как владельцу",
    "управленческий шаг",
    "на что обратить внимание",
    "что проверить в первую очередь",
    "следующий управленческий шаг",
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def classify_development_intelligence_query(query_text: str) -> DevelopmentQueryKind | None:
    normalized = _normalize(query_text)
    if not normalized:
        return None
    if any(k in normalized for k in _QUALITY_KEYWORDS):
        return DevelopmentQueryKind.QUALITY
    if any(k in normalized for k in _DEBT_KEYWORDS):
        return DevelopmentQueryKind.DEBT
    if any(k in normalized for k in _RISK_KEYWORDS):
        return DevelopmentQueryKind.RISKS
    if any(k in normalized for k in _BLOCKER_KEYWORDS):
        return DevelopmentQueryKind.BLOCKERS
    if any(k in normalized for k in _NEXT_STEP_KEYWORDS):
        return DevelopmentQueryKind.NEXT_STEP
    if any(k in normalized for k in _OVERVIEW_KEYWORDS):
        return DevelopmentQueryKind.OVERVIEW
    return None


def is_development_intelligence_query(query_text: str) -> bool:
    from app.modules.yasii.governance_answers import is_governance_query

    if is_governance_query(query_text):
        return False
    return classify_development_intelligence_query(query_text) is not None


def load_quality_issues_summary(db) -> DevelopmentIntelligenceQuality:
    try:
        from app.modules.quality_issues.constants import QualityIssuePriority, QualityIssueStatus
        from app.modules.quality_issues.models import QualityIssue

        rows = (
            db.query(QualityIssue)
            .filter(QualityIssue.status != QualityIssueStatus.CLOSED.value)
            .order_by(QualityIssue.id.desc())
            .limit(50)
            .all()
        )
    except Exception:
        return DevelopmentIntelligenceQuality(
            summary="Раздел качества найден не полностью / данные недоступны.",
            connected=False,
        )

    if not rows:
        return DevelopmentIntelligenceQuality(
            openCount=0,
            criticalCount=0,
            summary="Открытых проблем качества в БД нет.",
            connected=True,
        )

    issues: list[DevelopmentIssue] = []
    critical = 0
    for row in rows:
        priority = str(row.priority or "").strip().lower()
        sev = SEVERITY_HIGH if priority == QualityIssuePriority.HIGH.value else SEVERITY_MEDIUM
        if priority == QualityIssuePriority.HIGH.value:
            critical += 1
        issues.append(
            DevelopmentIssue(
                issueId=f"QI-{row.id}",
                title=str(row.title or "").strip()[:120],
                category="quality",
                severity=sev,
                status=str(row.status or ""),
                source=str(row.detected_place or "quality_issues"),
                affectedArea=str(row.area or ""),
                reasoning=str(row.description or row.current_behavior or "")[:200],
            ),
        )

    issues.sort(key=lambda item: (0 if item.severity == SEVERITY_HIGH else 1, item.issueId))
    return DevelopmentIntelligenceQuality(
        criticalCount=critical,
        openCount=len(rows),
        summary=f"Открытых проблем качества: {len(rows)}; критических (high): {critical}.",
        connected=True,
        topIssues=issues[:8],
    )


def load_architecture_debt_summary() -> DevelopmentIntelligenceDebt:
    items: list[str] = []
    corpus = build_project_corpus()
    for path in ("YASNOPRO_ARCHITECTURE_DEBT.md", "YASNOPRO_ARCHITECTURE_STATUS.md"):
        doc = find_document_by_path(corpus, path)
        if doc is None:
            continue
        for section in doc.sections[:5]:
            for bullet in extract_bullets(section.content, limit=8):
                lowered = bullet.casefold()
                if any(
                    token in lowered
                    for token in ("долг", "debt", "legacy", "риск", "hybrid", "не реализ", "open")
                ):
                    items.append(bullet[:200])

    high_count = sum(
        1
        for item in items
        if any(token in item.casefold() for token in ("high", "критич", "legacy", "dual"))
    )
    if not items:
        return DevelopmentIntelligenceDebt(
            summary="Документы architecture debt не найдены в Knowledge Corpus.",
            highCount=0,
            items=[],
        )
    primary = items[0]
    return DevelopmentIntelligenceDebt(
        highCount=high_count or min(3, len(items)),
        summary=f"Основной долг: {primary[:160]}",
        items=items[:6],
    )


def _detect_risks(
    *,
    state,
    done_keys: set[str],
    item_passed: dict[str, bool],
    quality: DevelopmentIntelligenceQuality,
    debt: DevelopmentIntelligenceDebt,
    platform_blockers: list,
) -> list[DevelopmentRisk]:
    risks: list[DevelopmentRisk] = []
    idx = 0

    if state.containerReadiness < 100 and state.activeWorkItems:
        idx += 1
        risks.append(
            DevelopmentRisk(
                riskId=f"risk-{idx}",
                title="MVP readiness не закрыт при активных WI",
                severity=SEVERITY_HIGH,
                reasoning=(
                    f"Container readiness {state.containerReadiness}%, "
                    f"текущие работы: {', '.join(state.activeWorkItems[:2])}."
                ),
                recommendedAction="Сверить platform_tasks и analyzer для текущего WI.",
            ),
        )

    for label in state.activeWorkItems[:3]:
        key = label.split(maxsplit=1)[0] if label else ""
        if key and key not in done_keys:
            idx += 1
            risks.append(
                DevelopmentRisk(
                    riskId=f"risk-{idx}",
                    title=f"Analyzer не пройден: {key}",
                    severity=SEVERITY_HIGH,
                    reasoning=f"WI {label} в фокусе Dashboard, но analyzer_passed ещё false.",
                    recommendedAction=f"Закрыть evidence и refresh для {key}.",
                ),
            )

    if quality.connected and quality.criticalCount > 0:
        idx += 1
        risks.append(
            DevelopmentRisk(
                riskId=f"risk-{idx}",
                title="Критические проблемы качества",
                severity=SEVERITY_HIGH,
                reasoning=quality.summary,
                recommendedAction="Проверить раздел «Качество» и связать с текущим WI.",
            ),
        )

    if debt.highCount > 0:
        idx += 1
        risks.append(
            DevelopmentRisk(
                riskId=f"risk-{idx}",
                title="Архитектурный долг",
                severity=SEVERITY_MEDIUM,
                reasoning=debt.summary,
                recommendedAction="Закрыть пункты из YASNOPRO_ARCHITECTURE_DEBT.md по приоритету.",
            ),
        )

    registry = get_deviation_registry()
    if registry.criticalCount > 0:
        idx += 1
        top = registry.deviations[0] if registry.deviations else None
        risks.append(
            DevelopmentRisk(
                riskId=f"risk-{idx}",
                title="Отклонения платформы (Deviation Registry)",
                severity=SEVERITY_HIGH,
                reasoning=top.title if top else f"Критических отклонений: {registry.criticalCount}",
                recommendedAction=top.recommendation if top else "Сверить health snapshot и reality check.",
            ),
        )

    if len(platform_blockers) >= 5:
        idx += 1
        risks.append(
            DevelopmentRisk(
                riskId=f"risk-{idx}",
                title="Много заблокированных WI по зависимостям",
                severity=SEVERITY_MEDIUM,
                reasoning=f"Catalog blockers: {len(platform_blockers)} открытых зависимостей.",
                recommendedAction="Закрыть зависимости на критическом пути.",
            ),
        )

    if quality.connected and quality.openCount > 0 and not state.activeWorkItems:
        idx += 1
        risks.append(
            DevelopmentRisk(
                riskId=f"risk-{idx}",
                title="Quality Issues не связаны с roadmap",
                severity=SEVERITY_MEDIUM,
                reasoning="Есть открытые проблемы качества, но нет явного current WI в Dashboard.",
                recommendedAction="Сопоставить quality issues с активным WI в platform_tasks.",
            ),
        )

    severity_order = {SEVERITY_HIGH: 0, SEVERITY_MEDIUM: 1, SEVERITY_LOW: 2}
    risks.sort(key=lambda row: (severity_order.get(row.severity, 9), row.title))
    return risks[:8]


def _resolve_focus(state, priorities, done_keys) -> DevelopmentIntelligenceFocus:
    focus_item = resolve_focus_work_item(state, priorities, done_keys)
    if focus_item is not None:
        return DevelopmentIntelligenceFocus(
            title=f"{focus_item.workItemId} {focus_item.title}",
            reasoning="Текущий фокус из Project Awareness и platform_tasks.",
        )
    if state.activeWorkItems:
        return DevelopmentIntelligenceFocus(
            title=state.activeWorkItems[0],
            reasoning="Текущие работы этапа из Dashboard.",
        )
    if priorities:
        top = priorities[0]
        return DevelopmentIntelligenceFocus(
            title=f"{top.workItemId} {top.title}",
            reasoning="; ".join(top.reasoning[:2]) if top.reasoning else "Приоритет по catalog.",
        )
    return DevelopmentIntelligenceFocus(
        title="Нет явного фокуса",
        reasoning="Все WI закрыты или нет открытых работ с выполненными зависимостями.",
    )


def _resolve_next_step(
    focus: DevelopmentIntelligenceFocus,
    done_keys: set[str],
    blockers: list[str],
    risks: list[DevelopmentRisk],
) -> DevelopmentIntelligenceNextStep:
    key = focus.title.split(maxsplit=1)[0] if focus.title else ""
    wi = work_item_by_key(key)
    business_impact = _business_impact(wi) if wi else "Снижение риска для владельца платформы."
    if wi:
        exp = build_work_item_explanation(wi, done_keys)
        detail = f"Закрыть {wi.key} и проверить: {exp.outcome[:120]}"
    elif blockers:
        detail = f"Снять блокер: {blockers[0][:100]}"
    elif risks:
        detail = risks[0].recommendedAction
    else:
        detail = "Обновить Dashboard и пройти refresh platform_tasks."

    return DevelopmentIntelligenceNextStep(
        title=focus.title,
        businessImpact=business_impact,
        detail=detail,
    )


def build_development_intelligence_assessment(
    query_text: str,
    db,
    payload: dict | None = None,
) -> DevelopmentIntelligenceAssessment:
    del payload
    kind = classify_development_intelligence_query(query_text) or DevelopmentQueryKind.OVERVIEW
    unified = build_unified_project_state(db)
    state_model = unified.developmentWorkspace.yasii
    done_keys = set(unified.releaseDoneKeys)
    item_passed = unified.itemPassed
    priorities = rank_project_priorities(state_model, done_keys)

    quality = load_quality_issues_summary(db)
    debt = load_architecture_debt_summary()
    platform_blockers = detect_platform_dependency_blockers(done_keys, limit=12)
    blocker_labels = [f"{b.title} ({b.reasoning[:80]}…)" for b in platform_blockers[:6]]

    risks_list = _detect_risks(
        state=state_model,
        done_keys=done_keys,
        item_passed=item_passed,
        quality=quality,
        debt=debt,
        platform_blockers=platform_blockers,
    )

    focus = _resolve_focus(state_model, priorities, done_keys)
    next_step = _resolve_next_step(focus, done_keys, blocker_labels, risks_list)

    gov_blocker = state_model.governanceReleaseBlockerLabel
    if gov_blocker and gov_blocker not in blocker_labels:
        blocker_labels = [f"Governance: {gov_blocker}", *blocker_labels]

    next_step_detail = next_step.detail
    if gov_blocker and kind in {DevelopmentQueryKind.OVERVIEW, DevelopmentQueryKind.NEXT_STEP}:
        next_step_detail = (
            f"Следующий управленческий шаг: закрыть {state_model.governanceReleaseBlockerKey} "
            f"({gov_blocker}). Это разблокирует governance-цепочку и поднимет готовность к выпуску."
        )

    dev_state = DevelopmentState(
        readiness=state_model.containerReleaseReadiness,
        containerImplementationReadiness=state_model.containerImplementationReadiness,
        containerReleaseReadiness=state_model.containerReleaseReadiness,
        yasiiImplementationReadiness=state_model.yasiiTrackImplementationReadiness,
        yasiiReleaseReadiness=state_model.yasiiTrackReleaseReadiness,
        governanceReleaseBlockerKey=state_model.governanceReleaseBlockerKey,
        governanceReleaseBlockerLabel=state_model.governanceReleaseBlockerLabel,
        activeStage=state_model.activeStageTitle,
        currentWorkItems=list(state_model.activeWorkItems),
        blockedWorkItems=blocker_labels,
        qualitySummary=quality.summary,
        debtSummary=debt.summary,
        riskSummary=f"Рисков: {len(risks_list)}",
        yasiiTrackReadiness=state_model.yasiiTrackReleaseReadiness,
    )

    if state_model.containerImplementationReadiness >= 95:
        summary = "Платформа близка к MVP, но требуется контроль качества и незакрытых WI."
    elif risks_list:
        summary = "Есть технические риски — нужен управленческий фокус владельца."
    else:
        summary = "Разработка под контролем; критических сигналов немного."

    return DevelopmentIntelligenceAssessment(
        queryKind=kind,
        state=dev_state,
        focus=focus,
        quality=quality,
        debt=debt,
        risks=DevelopmentIntelligenceRisks(count=len(risks_list), topRisks=risks_list),
        blockers=blocker_labels,
        nextStep=DevelopmentIntelligenceNextStep(
            title=next_step.title,
            businessImpact=next_step.businessImpact,
            detail=next_step_detail,
        ),
        summary=summary,
    )


def build_development_intelligence_snapshot(db) -> DevelopmentIntelligenceSnapshot:
    assessment = build_development_intelligence_assessment(
        "Что требует моего внимания?",
        db,
        None,
    )
    return DevelopmentIntelligenceSnapshot(
        focus=assessment.focus,
        quality=assessment.quality,
        debt=assessment.debt,
        risks=assessment.risks,
        nextStep=assessment.nextStep,
    )


def format_development_intelligence_message(
    assessment: DevelopmentIntelligenceAssessment,
    query_text: str,
) -> str:
    state = assessment.state
    lines = [
        ASSESSMENT_HEADER,
        "",
        f"Запрос:\n{query_text.strip()}",
        "",
        f"Состояние разработки:\n{assessment.summary}",
        "",
        f"Реализовано (implementation): {state.containerImplementationReadiness}%",
        f"Готово к выпуску (release): {state.containerReleaseReadiness}%",
    ]
    if state.governanceReleaseBlockerLabel:
        lines.append(f"Блокер выпуска: {state.governanceReleaseBlockerLabel}")
    lines.extend(
        [
            "",
            f"Главный фокус:\n{assessment.focus.title}",
            f"- {assessment.focus.reasoning}",
            "",
        ]
    )

    if assessment.queryKind in {DevelopmentQueryKind.OVERVIEW, DevelopmentQueryKind.QUALITY}:
        lines.append("Качество:")
        if assessment.quality.connected:
            lines.append(
                f"- Критических проблем качества: {assessment.quality.criticalCount}"
            )
            lines.append(f"- Открытых проблем: {assessment.quality.openCount}")
            for issue in assessment.quality.topIssues[:4]:
                lines.append(f"- [{issue.severity}] {issue.title} ({issue.affectedArea})")
        else:
            lines.append(f"- {assessment.quality.summary}")
        lines.append("")

    if assessment.queryKind in {DevelopmentQueryKind.OVERVIEW, DevelopmentQueryKind.DEBT}:
        lines.append("Технический долг:")
        lines.append(f"- {assessment.debt.summary}")
        for item in assessment.debt.items[:3]:
            lines.append(f"- {item}")
        lines.append("")

    if assessment.queryKind in {DevelopmentQueryKind.OVERVIEW, DevelopmentQueryKind.RISKS}:
        lines.append("Риски:")
        if assessment.risks.topRisks:
            for index, risk in enumerate(assessment.risks.topRisks[:5], start=1):
                lines.append(f"{index}. {risk.title} [{risk.severity}]")
                lines.append(f"   {risk.reasoning}")
        else:
            lines.append("- Существенных рисков не обнаружено.")
        lines.append("")

    if assessment.queryKind == DevelopmentQueryKind.BLOCKERS:
        lines.append("Блокеры:")
        if assessment.blockers:
            lines.extend(f"- {row}" for row in assessment.blockers[:8])
        else:
            lines.append("- Блокирующих зависимостей по catalog не найдено.")
        lines.append("")

    if assessment.queryKind in {DevelopmentQueryKind.OVERVIEW, DevelopmentQueryKind.NEXT_STEP}:
        lines.append("Следующий шаг:")
        lines.append(f"- {assessment.nextStep.detail}")
        lines.append("")
        lines.append("Бизнес-эффект:")
        lines.append(f"- {assessment.nextStep.businessImpact}")
        lines.append("")

    lines.append("Источник:")
    lines.extend(
        [
            "- platform_tasks",
            "- yasii_catalog",
            "- dashboard readiness",
            "- quality_issues (read-only)" if assessment.quality.connected else "- quality_issues (fallback)",
            "- knowledge corpus (architecture debt)",
            "- deviation registry",
            "- project awareness",
        ],
    )
    return "\n".join(lines)
