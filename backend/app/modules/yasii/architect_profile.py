"""YASII Architect Profile (P9-W05) — platform architecture knowledge layer, no LLM."""

from __future__ import annotations

import re
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field

ARCHITECT_PROFILE_SCHEMA_VERSION = "0.1.0"
ASSESSMENT_HEADER = "Architect Assessment"


class ArchitectKnowledgeSource(str, Enum):
    DOMAIN_MODEL = "YASII_DOMAIN_MODEL.md"
    SYSTEM_MAP = "YASII_SYSTEM_MAP.md"
    HOST_CONTRACT = "YASII_HOST_INTEGRATION_CONTRACT.md"
    ADR_ACE_BOUNDARY = "ADR_YASII_AI_CONTEXT_BOUNDARY.md"
    ARCHITECTURE_STATUS = "YASNOPRO_ARCHITECTURE_STATUS.md"
    ROADMAP = "YASII_IMPLEMENTATION_ROADMAP.md"
    CONSTITUTION = "YASII_CONSTITUTION.md"


class ArchitectQuestionType(str, Enum):
    OVERVIEW = "overview"
    RATIONALE = "rationale"
    DEPENDENCY = "dependency"
    IMPACT = "impact"
    NAVIGATION = "navigation"


class ArchitectAnswer(BaseModel):
    question: str = ""
    answer: str = ""
    evidence: list[str] = Field(default_factory=list)
    affectedModules: list[str] = Field(default_factory=list)
    relatedComponents: list[str] = Field(default_factory=list)


class ArchitectAssessment(BaseModel):
    schemaVersion: str = Field(default=ARCHITECT_PROFILE_SCHEMA_VERSION)
    assessmentId: str = Field(default_factory=lambda: f"architect-{uuid4().hex[:12]}")
    questionType: ArchitectQuestionType = ArchitectQuestionType.OVERVIEW
    answer: ArchitectAnswer
    riskLevel: str | None = None
    changeTarget: str | None = None


_PLATFORM_SUBSYSTEMS: tuple[str, ...] = (
    "Platform Host Surfaces",
    "AI Context Engine (ACE)",
    "HostContext",
    "ContextSnapshot",
    "PermissionBoundary",
    "YASII Core",
    "Knowledge Layer",
    "Memory Layer",
    "Strategy Layer",
    "Embedded Runtime",
    "Surface Adapters",
)

_COMPONENT_ALIASES: dict[str, str] = {
    "hostcontext": "HostContext",
    "host context": "HostContext",
    "ace": "ACE",
    "ai context engine": "ACE",
    "contextsnapshot": "ContextSnapshot",
    "context snapshot": "ContextSnapshot",
    "permissionboundary": "PermissionBoundary",
    "permission boundary": "PermissionBoundary",
    "yasii core": "YASII Core",
    "ядро ясии": "YASII Core",
    "memory layer": "Memory Layer",
    "memory graph": "Memory Graph",
    "decision memory": "Decision Memory",
    "strategy layer": "Strategy Layer",
    "strategy engine": "Strategy Layer",
    "embedded query": "Embedded Runtime",
    "embedded runtime": "Embedded Runtime",
    "runtime": "Embedded Runtime",
    "surface adapters": "Surface Adapters",
    "host surfaces": "Platform Host Surfaces",
    "host surface": "Platform Host Surfaces",
    "knowledge layer": "Knowledge Layer",
    "один ясии": "Single YASII",
    "single yasii": "Single YASII",
    "единый ясии": "Single YASII",
}

_KNOWLEDGE_ENTRIES: dict[str, dict[str, object]] = {
    "HostContext": {
        "summary": (
            "HostContext — сырой контекст от Host Surface: surface key, selection, "
            "scope и метаданные UI. Host передаёт только HostContext; "
            "ContextSnapshot формирует ACE."
        ),
        "related": ["ACE", "Platform Host Surfaces", "Surface Adapters", "Embedded Runtime"],
        "modules": ["ai_context/host_context", "frontend/yasii/embedded"],
        "sources": [ArchitectKnowledgeSource.HOST_CONTRACT, ArchitectKnowledgeSource.DOMAIN_MODEL],
        "rationale": (
            "HostContext является единой точкой передачи контекста между поверхностями "
            "платформы и ACE. Host Surface не строит ContextSnapshot и не задаёт permissions."
        ),
    },
    "ACE": {
        "summary": (
            "AI Context Engine (ACE) — платформенный слой: Identity Resolution, "
            "Permission Resolution, PermissionBoundary и ContextSnapshot перед handoff в YASII."
        ),
        "related": ["HostContext", "ContextSnapshot", "PermissionBoundary", "YASII Core"],
        "modules": ["app/modules/ai_context"],
        "sources": [ArchitectKnowledgeSource.ADR_ACE_BOUNDARY, ArchitectKnowledgeSource.SYSTEM_MAP],
        "rationale": (
            "ACE отделяет инфраструктуру платформы от role-driven intelligence YASII: "
            "Host → ACE → YASII, без прямого Host → YASII."
        ),
    },
    "ContextSnapshot": {
        "summary": (
            "ContextSnapshot — нормализованный снимок ситуации пользователя на surface; "
            "владелец формирования — ACE, YASII потребляет как immutable input."
        ),
        "related": ["ACE", "PermissionBoundary", "YASII Core", "HostContext"],
        "modules": ["app/modules/ai_context/context_snapshot"],
        "sources": [ArchitectKnowledgeSource.DOMAIN_MODEL, ArchitectKnowledgeSource.ADR_ACE_BOUNDARY],
        "rationale": "Context First: каждый Request YASII обязан опираться на ContextSnapshot, а не на сырой UI-state.",
    },
    "PermissionBoundary": {
        "summary": (
            "PermissionBoundary вычисляется ACE до handoff; YASII не пересчитывает boundary "
            "и использует EffectiveScope = PB ∩ Current Context."
        ),
        "related": ["ACE", "ContextSnapshot", "YASII Core"],
        "modules": ["app/modules/ai_context"],
        "sources": [ArchitectKnowledgeSource.DOMAIN_MODEL, ArchitectKnowledgeSource.ADR_ACE_BOUNDARY],
        "rationale": "Permission First: границы доступа задаются платформой до reasoning YASII.",
    },
    "YASII Core": {
        "summary": (
            "YASII Core — единая инфраструктура: Memory, Knowledge, Graph, Runtime pipeline, "
            "Answer Builder и Audit для всех ролей (Developer, Owner, Architect knowledge)."
        ),
        "related": ["ACE", "Memory Layer", "Knowledge Layer", "Embedded Runtime", "Strategy Layer"],
        "modules": ["app/modules/yasii"],
        "sources": [ArchitectKnowledgeSource.SYSTEM_MAP, ArchitectKnowledgeSource.CONSTITUTION],
        "rationale": "One Core: один YASII на платформу без параллельных AI cores.",
    },
    "Memory Layer": {
        "summary": (
            "Memory Layer — User, Tenant, Session, Decision, Process Memory Schema и Memory Graph; "
            "основа для Strategy Engine, Blocker Detection и Recommendation Templates."
        ),
        "related": ["YASII Core", "Strategy Layer", "Memory Graph", "Decision Memory"],
        "modules": ["app/modules/yasii/memory", "app/modules/yasii/decision_memory_store"],
        "sources": [ArchitectKnowledgeSource.DOMAIN_MODEL, ArchitectKnowledgeSource.ROADMAP],
        "rationale": "Память хранит решения и контекст; YASII не изменяет данные без явной команды пользователя.",
    },
    "Memory Graph": {
        "summary": "Memory Graph связывает решения, процессы и сессии для трассировки влияния и стратегии.",
        "related": ["Memory Layer", "Decision Memory", "Strategy Layer"],
        "modules": ["app/modules/yasii/memory_graph"],
        "sources": [ArchitectKnowledgeSource.DOMAIN_MODEL, ArchitectKnowledgeSource.ROADMAP],
        "rationale": "Graph Mandatory в runtime path до финального Verdict (Constitution).",
    },
    "Strategy Layer": {
        "summary": (
            "Strategy Layer — Strategy Engine, Unlock Score, Blocker Detection, "
            "Recommendation Templates; оценка и рекомендации без автономных действий."
        ),
        "related": ["Memory Layer", "YASII Core", "Decision Memory"],
        "modules": [
            "app/modules/yasii/strategy_engine",
            "app/modules/yasii/recommendation_templates",
        ],
        "sources": [ArchitectKnowledgeSource.SYSTEM_MAP, ArchitectKnowledgeSource.ROADMAP],
        "rationale": "Strategy даёт структурированные рекомендации, не выполняет workflow и не меняет данные.",
    },
    "Embedded Runtime": {
        "summary": (
            "Embedded Runtime — demo/runtime pipeline, surface answers и orchestration "
            "поверх Memory и Strategy без отдельного чата."
        ),
        "related": ["YASII Core", "Surface Adapters", "ACE", "HostContext"],
        "modules": ["app/modules/yasii/runtime_demo_service"],
        "sources": [ArchitectKnowledgeSource.HOST_CONTRACT, ArchitectKnowledgeSource.SYSTEM_MAP],
        "rationale": "Embedded Intelligence: YASII встраивается в surfaces, standalone chat не моделируется.",
    },
    "Surface Adapters": {
        "summary": (
            "Surface Adapters нормализуют host payload в YASII surface context "
            "(Dashboard, Registry, Designer, Object Card, Document, Process)."
        ),
        "related": ["Platform Host Surfaces", "HostContext", "Embedded Runtime"],
        "modules": ["frontend/src/yasii/embedded"],
        "sources": [ArchitectKnowledgeSource.HOST_CONTRACT, ArchitectKnowledgeSource.SYSTEM_MAP],
        "rationale": "Единый embedded entry для всех MVP surfaces (System Map §Integrations).",
    },
    "Platform Host Surfaces": {
        "summary": (
            "Host Surfaces MVP: Dashboard, Designer, Registry, Object Card, Document, Process — "
            "точки встраивания ЯСИИ через ACE."
        ),
        "related": ["HostContext", "ACE", "Surface Adapters"],
        "modules": ["frontend/src/modules", "frontend/src/portal"],
        "sources": [ArchitectKnowledgeSource.HOST_CONTRACT, ArchitectKnowledgeSource.ARCHITECTURE_STATUS],
        "rationale": "Каждая surface передаёт HostContext; rollout по Roadmap не отменяет контракт профиля.",
    },
    "Knowledge Layer": {
        "summary": (
            "Knowledge Layer — tier model, Knowledge/Graph/Evidence resolvers в runtime pipeline YASII."
        ),
        "related": ["YASII Core", "Memory Layer"],
        "modules": ["app/modules/yasii/knowledge_resolver", "app/modules/yasii/graph_resolver"],
        "sources": [ArchitectKnowledgeSource.SYSTEM_MAP, ArchitectKnowledgeSource.DOMAIN_MODEL],
        "rationale": "Knowledge Domains группируют знания для Role Profiles поверх Core.",
    },
    "Single YASII": {
        "summary": (
            "На платформе один YASII (ЯСИИ) — единый Core, роли и capabilities; "
            "запрещены параллельный архитектурный агент, отдельный режим и второй AI core."
        ),
        "related": ["YASII Core", "ACE", "Strategy Layer"],
        "modules": ["app/modules/yasii"],
        "sources": [ArchitectKnowledgeSource.CONSTITUTION, ArchitectKnowledgeSource.ADR_ACE_BOUNDARY],
        "rationale": (
            "P9-W05 добавляет Architect Knowledge Layer как способность того же YASII, "
            "а не нового агента или режима."
        ),
    },
    "Decision Memory": {
        "summary": "Decision Memory хранит зафиксированные решения tenant для consistency, blockers и strategy.",
        "related": ["Memory Layer", "Memory Graph", "Strategy Layer"],
        "modules": ["app/modules/yasii/decision_memory_store"],
        "sources": [ArchitectKnowledgeSource.DOMAIN_MODEL, ArchitectKnowledgeSource.ROADMAP],
        "rationale": "Решения — опора для Strategy Engine и Blocker Detection без автоматического принятия решений за пользователя.",
    },
}

_PLATFORM_DEPENDENCY_MAP: dict[str, list[str]] = {
    "Platform Host Surfaces": ["HostContext", "Surface Adapters"],
    "HostContext": ["ACE", "Surface Adapters", "Embedded Runtime"],
    "ACE": ["ContextSnapshot", "PermissionBoundary", "YASII Core"],
    "ContextSnapshot": ["YASII Core", "Embedded Runtime"],
    "PermissionBoundary": ["YASII Core"],
    "YASII Core": ["Knowledge Layer", "Memory Layer", "Embedded Runtime", "Strategy Layer"],
    "Knowledge Layer": ["Embedded Runtime"],
    "Memory Layer": ["Strategy Layer", "Memory Graph", "Decision Memory"],
    "Memory Graph": ["Strategy Layer"],
    "Decision Memory": ["Strategy Layer"],
    "Strategy Layer": ["Embedded Runtime"],
    "Surface Adapters": ["Embedded Runtime", "HostContext"],
    "Embedded Runtime": [],
    "Single YASII": ["ACE", "YASII Core", "Platform Host Surfaces"],
}

_DOC_NAVIGATION: dict[str, ArchitectKnowledgeSource] = {
    "hostcontext": ArchitectKnowledgeSource.HOST_CONTRACT,
    "ace": ArchitectKnowledgeSource.ADR_ACE_BOUNDARY,
    "contextsnapshot": ArchitectKnowledgeSource.DOMAIN_MODEL,
    "permissionboundary": ArchitectKnowledgeSource.DOMAIN_MODEL,
    "memory": ArchitectKnowledgeSource.DOMAIN_MODEL,
    "strategy": ArchitectKnowledgeSource.ROADMAP,
    "platform": ArchitectKnowledgeSource.ARCHITECTURE_STATUS,
    "subsystem": ArchitectKnowledgeSource.SYSTEM_MAP,
    "surface": ArchitectKnowledgeSource.HOST_CONTRACT,
    "yasii": ArchitectKnowledgeSource.SYSTEM_MAP,
}

OVERVIEW_KEYWORDS = (
    "как устроена платформа",
    "архитектура яснопро",
    "архитектура ясно про",
    "расскажи архитектуру",
    "основные подсистемы",
    "из каких модулей состоит платформа",
    "из чего состоит платформа",
    "структура платформы",
)

DEPENDENCY_KEYWORDS = (
    "как связаны",
    "что зависит от",
    "какие части платформы используют",
    "покажи зависимости",
    "цепочка зависимостей",
    "dependency",
)

IMPACT_KEYWORDS = (
    "что произойдёт если изменить",
    "что произойдет если изменить",
    "на что повлияет изменение",
    "какие компоненты будут затронуты",
    "затронутые компоненты",
)

RATIONALE_KEYWORDS = (
    "почему эта архитектура",
    "архитектура устроена",
    "почему сделано именно так",
    "почему используется hostcontext",
    "почему используется host context",
    "зачем нужен ace",
    "зачем нужен ai context engine",
    "почему один ясии",
    "почему один yasii",
    "почему архитектура",
    "почему используется",
    "зачем нужен",
)

NAVIGATION_KEYWORDS = (
    "где находится",
    "где реализован",
    "какой документ описывает",
    "в каком модуле",
    "где в коде",
    "какой adr",
)

ARCHITECT_COMMAND_KEYWORDS = (
    *OVERVIEW_KEYWORDS,
    *DEPENDENCY_KEYWORDS,
    *IMPACT_KEYWORDS,
    *RATIONALE_KEYWORDS,
    *NAVIGATION_KEYWORDS,
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def is_architect_query(query_text: str) -> bool:
    from app.modules.yasii.improvement_answers import is_improvement_command
    from app.modules.yasii.recommendation_answers import is_recommendation_command

    if is_improvement_command(query_text) or is_recommendation_command(query_text):
        return False

    normalized = _normalize(query_text)
    if not normalized:
        return False
    if any(keyword in normalized for keyword in ARCHITECT_COMMAND_KEYWORDS):
        return True
    return find_architect_component(query_text) is not None and any(
        marker in normalized
        for marker in ("почему", "зачем", "завис", "влия", "изменить", "модул", "компонент")
    )


def find_architect_component(query_text: str) -> str | None:
    normalized = _normalize(query_text)
    if not normalized:
        return None

    for alias, canonical in sorted(_COMPONENT_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        if alias in normalized:
            return canonical

    for name in _KNOWLEDGE_ENTRIES:
        if name.casefold() in normalized:
            return name

    return None


def classify_architect_question(query_text: str) -> ArchitectQuestionType:
    normalized = _normalize(query_text)
    if any(keyword in normalized for keyword in NAVIGATION_KEYWORDS):
        return ArchitectQuestionType.NAVIGATION
    if any(keyword in normalized for keyword in IMPACT_KEYWORDS):
        return ArchitectQuestionType.IMPACT
    if any(keyword in normalized for keyword in DEPENDENCY_KEYWORDS):
        return ArchitectQuestionType.DEPENDENCY
    if any(keyword in normalized for keyword in RATIONALE_KEYWORDS):
        return ArchitectQuestionType.RATIONALE
    if any(keyword in normalized for keyword in OVERVIEW_KEYWORDS):
        return ArchitectQuestionType.OVERVIEW
    component = find_architect_component(query_text)
    if component and any(marker in normalized for marker in ("завис", "связан", "используют")):
        return ArchitectQuestionType.DEPENDENCY
    if component and any(marker in normalized for marker in ("измен", "влия", "затрон")):
        return ArchitectQuestionType.IMPACT
    if component and any(marker in normalized for marker in ("почему", "зачем")):
        return ArchitectQuestionType.RATIONALE
    return ArchitectQuestionType.OVERVIEW


def _source_labels(sources: list[ArchitectKnowledgeSource]) -> list[str]:
    return [item.value for item in sources]


def _entry(component: str) -> dict[str, object]:
    return _KNOWLEDGE_ENTRIES.get(component, {})


def _build_overview_answer(query_text: str) -> ArchitectAnswer:
    lines = [
        "Платформа ЯсноПро — AOBP (AI-native Object-centric Business Platform) с embedded YASII.",
        "Поток: Host Surfaces → HostContext → ACE → ContextSnapshot + PermissionBoundary → YASII Core.",
        "YASII = Core + Knowledge + Runtime × Role + Capabilities, один цифровой сотрудник на платформу.",
    ]
    return ArchitectAnswer(
        question=query_text,
        answer="\n".join(lines),
        evidence=_source_labels(
            [
                ArchitectKnowledgeSource.SYSTEM_MAP,
                ArchitectKnowledgeSource.ARCHITECTURE_STATUS,
                ArchitectKnowledgeSource.HOST_CONTRACT,
            ],
        ),
        affectedModules=["platform", "yasii", "ai_context"],
        relatedComponents=list(_PLATFORM_SUBSYSTEMS),
    )


def _build_rationale_answer(query_text: str, component: str | None) -> ArchitectAnswer:
    target = component or "Single YASII"
    entry = _entry(target)
    rationale = str(entry.get("rationale") or entry.get("summary") or "")
    sources = entry.get("sources") or [ArchitectKnowledgeSource.SYSTEM_MAP]
    if not isinstance(sources, list):
        sources = [ArchitectKnowledgeSource.SYSTEM_MAP]
    related = entry.get("related") or []
    modules = entry.get("modules") or []
    return ArchitectAnswer(
        question=query_text,
        answer=rationale,
        evidence=_source_labels(sources),  # type: ignore[arg-type]
        affectedModules=list(modules) if isinstance(modules, list) else [],
        relatedComponents=list(related) if isinstance(related, list) else [],
    )


def _build_dependency_answer(query_text: str, component: str | None) -> ArchitectAnswer:
    target = component or "HostContext"
    downstream = list(_PLATFORM_DEPENDENCY_MAP.get(target, []))
    entry = _entry(target)
    summary = str(entry.get("summary") or f"Компонент {target}.")
    answer = f"{summary}\n\nЗависимые компоненты (downstream): " + (
        ", ".join(downstream) if downstream else "(нет записей в platform dependency map)"
    )
    sources = entry.get("sources") or [ArchitectKnowledgeSource.SYSTEM_MAP]
    if not isinstance(sources, list):
        sources = [ArchitectKnowledgeSource.SYSTEM_MAP]
    return ArchitectAnswer(
        question=query_text,
        answer=answer,
        evidence=_source_labels(sources),  # type: ignore[arg-type]
        affectedModules=list(entry.get("modules") or []),
        relatedComponents=downstream,
    )


def _compute_platform_risk(affected_count: int) -> str:
    if affected_count <= 0:
        return "LOW"
    if affected_count <= 2:
        return "MEDIUM"
    return "HIGH"


def _build_impact_answer(query_text: str, component: str | None) -> ArchitectAnswer:
    target = component or "HostContext"
    affected = list(_PLATFORM_DEPENDENCY_MAP.get(target, []))
    risk = _compute_platform_risk(len(affected))
    entry = _entry(target)
    reason = (
        "Компонент участвует в передаче контекста на всех поверхностях."
        if target == "HostContext"
        else f"Изменение {target} затрагивает downstream-компоненты platform map."
    )
    answer = (
        f"Изменяемый компонент: {target}.\n"
        f"Затронутые компоненты: {', '.join(affected) if affected else '(нет в карте)'}.\n"
        f"Риск: {risk}.\n"
        f"Причина: {reason}"
    )
    sources = entry.get("sources") or [ArchitectKnowledgeSource.HOST_CONTRACT]
    if not isinstance(sources, list):
        sources = [ArchitectKnowledgeSource.HOST_CONTRACT]
    return ArchitectAnswer(
        question=query_text,
        answer=answer,
        evidence=_source_labels(sources),  # type: ignore[arg-type]
        affectedModules=list(entry.get("modules") or []),
        relatedComponents=affected,
    )


def _build_navigation_answer(query_text: str, component: str | None) -> ArchitectAnswer:
    normalized = _normalize(query_text)
    target = component
    doc = ArchitectKnowledgeSource.SYSTEM_MAP
    if target:
        entry = _entry(target)
        sources = entry.get("sources") or [ArchitectKnowledgeSource.SYSTEM_MAP]
        if isinstance(sources, list) and sources:
            doc = sources[0]
        modules = list(entry.get("modules") or [])
    else:
        for token, source in _DOC_NAVIGATION.items():
            if token in normalized:
                doc = source
                break
        modules = ["docs/architecture", "backend/app/modules/yasii"]

    answer = (
        f"Документ-источник: {doc.value}.\n"
        f"Модули реализации: {', '.join(modules) if modules else 'см. System Map и Roadmap'}."
    )
    return ArchitectAnswer(
        question=query_text,
        answer=answer,
        evidence=[doc.value],
        affectedModules=modules if isinstance(modules, list) else [],
        relatedComponents=[target] if target else [],
    )


def build_architect_assessment(query_text: str) -> ArchitectAssessment:
    question_type = classify_architect_question(query_text)
    component = find_architect_component(query_text)

    if question_type == ArchitectQuestionType.OVERVIEW:
        answer = _build_overview_answer(query_text)
    elif question_type == ArchitectQuestionType.RATIONALE:
        answer = _build_rationale_answer(query_text, component)
    elif question_type == ArchitectQuestionType.DEPENDENCY:
        answer = _build_dependency_answer(query_text, component)
    elif question_type == ArchitectQuestionType.IMPACT:
        answer = _build_impact_answer(query_text, component)
    else:
        answer = _build_navigation_answer(query_text, component)

    risk = None
    change_target = None
    if question_type == ArchitectQuestionType.IMPACT:
        change_target = component or "HostContext"
        affected = answer.relatedComponents
        risk = _compute_platform_risk(len(affected))

    return ArchitectAssessment(
        questionType=question_type,
        answer=answer,
        riskLevel=risk,
        changeTarget=change_target,
    )


def format_architect_message(assessment: ArchitectAssessment) -> str:
    answer = assessment.answer
    lines = [
        ASSESSMENT_HEADER,
        "",
        "Вопрос:",
        answer.question or "—",
        "",
        "Ответ:",
        answer.answer,
    ]
    if answer.relatedComponents:
        lines.extend(["", "Связанные компоненты:"])
        lines.extend(f"- {item}" for item in answer.relatedComponents)
    if answer.affectedModules:
        lines.extend(["", "Затронутые модули:"])
        lines.extend(f"- {item}" for item in answer.affectedModules)
    if answer.evidence:
        lines.extend(["", "Источник:"])
        lines.extend(f"- {item}" for item in answer.evidence)
    if assessment.riskLevel:
        lines.extend(["", f"Риск: {assessment.riskLevel}"])
    lines.append("")
    lines.append(
        "Architect Knowledge Layer — один YASII, без отдельного агента; "
        "ответы основаны на архитектурных документах проекта.",
    )
    return "\n".join(lines)
