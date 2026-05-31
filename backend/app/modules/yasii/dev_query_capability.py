"""YASII Dev Query Capability (P5-W06) — developer FAQ over P5 knowledge base."""

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4

from app.modules.yasii.architecture_review import get_major_components
from app.modules.yasii.architecture_verdicts import ARCHITECTURE_VERDICTS
from app.modules.yasii.dependency_analysis import build_dependency_chain
from app.modules.yasii.impact_analysis import find_component_in_text

DEV_QUERY_SCHEMA_VERSION = "0.1.0"

_DEV_QUERY_TRIGGER_KEYWORDS = (
    "как работает",
    "что делает",
    "что такое",
    "покажи pipeline",
    "какие компоненты",
)

_PIPELINE_QUESTION_KEYWORDS = (
    "как проходит запрос",
    "покажи pipeline",
    "как работает pipeline",
    "как проходит",
)

_COMPONENTS_QUESTION_KEYWORDS = (
    "какие компоненты",
)

_COMPONENT_DEV_KEYWORDS = (
    "что делает",
    "что такое",
    "как работает",
)

_COMPONENT_PURPOSES: dict[str, str] = {
    "Intent Resolver": (
        "Intent Resolver определяет намерение пользователя и задаёт маршрут "
        "дальнейшей обработки запроса."
    ),
    "Knowledge Resolver": (
        "Knowledge Resolver подбирает знания, соответствующие намерению пользователя."
    ),
    "Graph Resolver": (
        "Graph Resolver определяет связанные сущности и зависимости после выбора знаний."
    ),
    "Evidence Resolver": (
        "Evidence Resolver собирает доказательства после анализа графа знаний."
    ),
    "Rule Engine": (
        "Rule Engine применяет правила к собранным доказательствам "
        "и передаёт результаты в Verdict Engine."
    ),
    "Verdict Engine": (
        "Verdict Engine формирует итоговое решение на основе результатов Rule Engine."
    ),
    "Answer Builder": (
        "Answer Builder формирует ответ после получения итогового решения Verdict Engine."
    ),
    "Runtime Orchestrator": (
        "Runtime Orchestrator координирует последовательное прохождение запроса "
        "через весь runtime pipeline."
    ),
}


class DeveloperQueryCategory(str, Enum):
    ARCHITECTURE = "ARCHITECTURE"
    DEPENDENCY = "DEPENDENCY"
    IMPACT = "IMPACT"
    COMPONENT = "COMPONENT"
    PIPELINE = "PIPELINE"
    UNKNOWN = "UNKNOWN"


@dataclass
class DeveloperQueryResponse:
    schemaVersion: str = DEV_QUERY_SCHEMA_VERSION
    queryId: str = field(default_factory=lambda: f"dev-query-{uuid4()}")
    question: str = ""
    answer: str = ""
    category: DeveloperQueryCategory = DeveloperQueryCategory.UNKNOWN
    metadata: dict[str, str] = field(default_factory=dict)


def _normalize_question(question: str) -> str:
    return str(question or "").strip().lower()


def _contains_any(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def _has_dev_query_trigger(normalized_text: str) -> bool:
    return _contains_any(normalized_text, _DEV_QUERY_TRIGGER_KEYWORDS)


def _is_pipeline_question(normalized_text: str) -> bool:
    return _contains_any(normalized_text, _PIPELINE_QUESTION_KEYWORDS)


def _is_components_list_question(normalized_text: str) -> bool:
    return _contains_any(normalized_text, _COMPONENTS_QUESTION_KEYWORDS)


def _is_component_dev_question(normalized_text: str) -> bool:
    return _contains_any(normalized_text, _COMPONENT_DEV_KEYWORDS)


def _format_pipeline_answer() -> str:
    chain = build_dependency_chain("Intent Resolver")
    chain_block = "\n↓\n".join(chain)
    return f"Запрос проходит через:\n\n{chain_block}"


def _format_components_list_answer() -> str:
    items = "\n".join(f"• {component}" for component in get_major_components())
    return f"Компоненты ЯСИИ:\n\n{items}"


def _format_component_purpose_answer(component: str) -> str:
    purpose = _COMPONENT_PURPOSES.get(component)
    if not purpose:
        verdict_text = ARCHITECTURE_VERDICTS.get(component, "")
        purpose = verdict_text or "Описание компонента недоступно в MVP-базе."
    return purpose


def answer_developer_query(question: str) -> DeveloperQueryResponse:
    """Answer typical developer questions using P5-W01..P5-W05 knowledge."""
    normalized = _normalize_question(question)
    original = str(question or "").strip()

    if not normalized:
        return DeveloperQueryResponse(
            question=original,
            answer="",
            category=DeveloperQueryCategory.UNKNOWN,
        )

    if _is_pipeline_question(normalized):
        return DeveloperQueryResponse(
            question=original,
            answer=_format_pipeline_answer(),
            category=DeveloperQueryCategory.PIPELINE,
        )

    if _is_components_list_question(normalized):
        return DeveloperQueryResponse(
            question=original,
            answer=_format_components_list_answer(),
            category=DeveloperQueryCategory.COMPONENT,
        )

    if not _has_dev_query_trigger(normalized):
        return DeveloperQueryResponse(
            question=original,
            answer="",
            category=DeveloperQueryCategory.UNKNOWN,
        )

    component = find_component_in_text(original)
    if component and _is_component_dev_question(normalized):
        return DeveloperQueryResponse(
            question=original,
            answer=_format_component_purpose_answer(component),
            category=DeveloperQueryCategory.COMPONENT,
            metadata={"component": component},
        )

    return DeveloperQueryResponse(
        question=original,
        answer="",
        category=DeveloperQueryCategory.UNKNOWN,
    )


def format_developer_query_message(response: DeveloperQueryResponse) -> str:
    if response.category == DeveloperQueryCategory.UNKNOWN or not response.answer:
        return ""

    if response.category == DeveloperQueryCategory.PIPELINE:
        return f"Developer Query\n\n{response.answer}"

    component = response.metadata.get("component", "")
    if component:
        return (
            "Developer Query\n\n"
            f"Компонент:\n{component}\n\n"
            f"Назначение:\n\n{response.answer}"
        )

    return f"Developer Query\n\n{response.answer}"


def resolve_developer_query_message(text: str) -> str | None:
    """Resolve developer FAQ; returns None when the question is out of MVP scope."""
    response = answer_developer_query(text)
    message = format_developer_query_message(response)
    return message or None
