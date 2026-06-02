"""Registry embedded context answers — table-view aware responses from HostContext."""

from __future__ import annotations

import re
from typing import Any

_REGISTRY_SURFACE = "registry"

_OPEN_CONTEXT_KEYWORDS = (
    "что сейчас открыто",
    "что открыто",
    "что я смотрю",
    "что сейчас на экране",
    "что сейчас отображается",
    "что сейчас отображается в таблице",
    "что отображается в таблице",
)

_REGISTRY_NAME_KEYWORDS = (
    "какой реестр",
    "какой реестр я смотрю",
    "какой реестр открыт",
    "какой список открыт",
)

_RECORD_COUNT_KEYWORDS = (
    "сколько записей отображается",
    "сколько записей в таблице",
    "сколько записей сейчас",
    "сколько строк отображается",
)

_FILTER_KEYWORDS = (
    "какие фильтры активны",
    "какие фильтры применены",
    "есть ли активные фильтры",
    "активные фильтры",
    "какой фильтр",
)

_SORT_KEYWORDS = (
    "как сейчас отсортированы",
    "как отсортированы данные",
    "по каким полям выполняется сортировка",
    "по каким полям сортировка",
    "какая сортировка",
    "активная сортировка",
)

_SELECTION_KEYWORDS = (
    "сколько записей выбрано",
    "сколько выбрано",
    "сколько строк выбрано",
    "выбранные записи",
)

_VIEW_KEYWORDS = (
    "какое представление открыто",
    "какое представление активно",
    "какой вид открыт",
    "текущее представление",
)

_WHAT_IS_KEYWORDS = (
    "что это",
    "что это?",
    "что здесь",
    "что за экран",
)


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def _matches_any(normalized: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized for keyword in keywords)


def _host_surface(payload: dict) -> str:
    return str(payload.get("surfaceId") or payload.get("hostSurface") or "").strip().lower()


def _is_registry_embedded(payload: dict) -> bool:
    return payload.get("embedded") is True and _host_surface(payload) == _REGISTRY_SURFACE


def _extract_registry_metadata(payload: dict) -> dict[str, str]:
    metadata = payload.get("registryMetadata")
    if isinstance(metadata, dict):
        return {str(key): str(value) for key, value in metadata.items() if str(value).strip()}

    surface_metadata = payload.get("surfaceMetadata")
    if isinstance(surface_metadata, dict):
        return {str(key): str(value) for key, value in surface_metadata.items() if str(value).strip()}

    return {}


def _value_or_dash(value: Any) -> str:
    text = str(value or "").strip()
    return text or "—"


def _registry_field(payload: dict, metadata: dict[str, str], key: str) -> str:
    direct = payload.get(key)
    if direct is not None and str(direct).strip():
        return str(direct).strip()
    return metadata.get(key, "").strip()


def _format_filters(active_filters: str) -> str:
    text = str(active_filters or "").strip()
    if not text or text.lower() in {"—", "нет", "none", "нет активных фильтров"}:
        return "Активных фильтров нет."
    if text.startswith("Активен"):
        return text
    return f"Активен фильтр:\n{text}"


def _format_sorts(active_sorts: str) -> str:
    text = str(active_sorts or "").strip()
    if not text or text.lower() in {"—", "нет", "none", "сортировка не задана"}:
        return "Сортировка не задана."
    if text.startswith("Сортировка"):
        return text
    return f"Сортировка: {text}"


def _build_registry_what_is_answer(payload: dict) -> str:
    metadata = _extract_registry_metadata(payload)
    registry_name = _value_or_dash(_registry_field(payload, metadata, "registryName"))
    record_count = _value_or_dash(_registry_field(payload, metadata, "recordCount"))

    return (
        f"Сейчас открыт реестр объекта «{registry_name}».\n\n"
        f"Отображается {record_count} записей.\n\n"
        "Вы находитесь в табличном представлении объекта."
    )


def _build_registry_summary(payload: dict) -> str:
    metadata = _extract_registry_metadata(payload)
    registry_name = _value_or_dash(_registry_field(payload, metadata, "registryName"))
    view_name = _value_or_dash(_registry_field(payload, metadata, "viewName"))
    record_count = _value_or_dash(_registry_field(payload, metadata, "recordCount"))
    active_filters = _registry_field(payload, metadata, "activeFilters")
    active_sorts = _registry_field(payload, metadata, "activeSorts")
    visible_columns = _value_or_dash(_registry_field(payload, metadata, "visibleColumns"))
    search_query = _registry_field(payload, metadata, "searchQuery")

    lines = [
        f"Сейчас открыт реестр «{registry_name}».",
        f"Отображается {record_count} записей.",
    ]

    filter_line = _format_filters(active_filters)
    if "нет" not in filter_line.lower():
        lines.append(filter_line)

    sort_line = _format_sorts(active_sorts)
    if "не задана" not in sort_line.lower():
        lines.append(sort_line)

    if view_name != "—":
        lines.append(f"Представление: {view_name}.")

    if search_query:
        lines.append(f"Поиск: {search_query}.")

    if visible_columns != "—":
        lines.append(f"Видимые колонки: {visible_columns}.")

    return "\n".join(lines)


def resolve_registry_surface_fallback(payload: dict) -> str | None:
    """Return fallback response for registry when question is not recognized."""
    if not _is_registry_embedded(payload):
        return None

    summary = _build_registry_summary(payload)
    return (
        "Я вижу, что открыт реестр, но пока не понял вопрос.\n\n"
        "Могу ответить:\n"
        "• что сейчас открыто;\n"
        "• какой реестр вы смотрите;\n"
        "• сколько записей отображается;\n"
        "• какие фильтры и сортировка активны;\n"
        "• сколько записей выбрано;\n"
        "• какое представление открыто.\n\n"
        f"{summary}"
    )


def resolve_registry_context_message(query_text: str, payload: dict) -> str | None:
    """Return registry-aware response for embedded Registry surface."""
    if not _is_registry_embedded(payload):
        return None

    normalized = _normalize_query(query_text)
    if not normalized:
        return None

    metadata = _extract_registry_metadata(payload)
    registry_name = _value_or_dash(_registry_field(payload, metadata, "registryName"))
    view_name = _value_or_dash(_registry_field(payload, metadata, "viewName"))
    record_count = _value_or_dash(_registry_field(payload, metadata, "recordCount"))
    active_filters = _registry_field(payload, metadata, "activeFilters")
    active_sorts = _registry_field(payload, metadata, "activeSorts")
    selected_count_raw = _registry_field(payload, metadata, "selectedCount") or "0"
    search_query = _registry_field(payload, metadata, "searchQuery")
    visible_columns = _value_or_dash(_registry_field(payload, metadata, "visibleColumns"))

    try:
        selected_count = int(str(selected_count_raw).strip())
    except ValueError:
        selected_count = 0

    if normalized in _WHAT_IS_KEYWORDS:
        return _build_registry_what_is_answer(payload)

    if _matches_any(normalized, _OPEN_CONTEXT_KEYWORDS):
        return _build_registry_summary(payload)

    if _matches_any(normalized, _REGISTRY_NAME_KEYWORDS):
        return f"Сейчас открыт реестр «{registry_name}»."

    if _matches_any(normalized, _SELECTION_KEYWORDS):
        if selected_count <= 0:
            return "Сейчас не выбрано ни одной записи."
        return f"Выбрано записей: {selected_count}."

    if _matches_any(normalized, _RECORD_COUNT_KEYWORDS):
        return f"Сейчас отображается {record_count} записей."

    if _matches_any(normalized, _FILTER_KEYWORDS):
        filters_text = _format_filters(active_filters)
        if "нет" in filters_text.lower():
            return "Активных фильтров нет."
        return filters_text

    if _matches_any(normalized, _SORT_KEYWORDS):
        return _format_sorts(active_sorts)

    if _matches_any(normalized, _VIEW_KEYWORDS):
        return f"Открыто представление «{view_name}»."

    if "поиск" in normalized and search_query:
        return f"Активен поиск: {search_query}."

    if "колонк" in normalized and visible_columns != "—":
        return f"В таблице отображаются колонки: {visible_columns}."

    return None
