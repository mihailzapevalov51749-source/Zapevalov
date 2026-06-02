"""Process embedded context answers — HostContext-aware responses."""

from __future__ import annotations

import re
from typing import Any

_PROCESS_SURFACE = "process"

_OPEN_KEYWORDS = (
    "что сейчас открыто",
    "что открыто",
    "что я смотрю",
    "что на экране",
)

_PROCESS_NAME_KEYWORDS = (
    "какой процесс открыт",
    "какой процесс сейчас",
    "название процесса",
    "имя процесса",
)

_STEP_KEYWORDS = (
    "на каком этапе",
    "какой этап",
    "текущий этап",
    "где этап",
)

_ACTIVE_STEP_KEYWORDS = (
    "что сейчас выполняется",
    "что выполняется",
    "активный шаг",
    "текущий шаг",
)

_WHERE_KEYWORDS = (
    "где я нахожусь",
    "где я сейчас",
    "где я",
)

_SELECTED_KEYWORDS = (
    "что выбрано",
    "что сейчас выбрано",
)


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def _matches_any(normalized: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized for keyword in keywords)


def _host_surface(payload: dict) -> str:
    return str(payload.get("surfaceId") or payload.get("hostSurface") or "").strip().lower()


def _is_process_embedded(payload: dict) -> bool:
    return payload.get("embedded") is True and _host_surface(payload) == _PROCESS_SURFACE


def _extract_process_metadata(payload: dict) -> dict[str, str]:
    metadata = payload.get("processMetadata")
    if isinstance(metadata, dict):
        return {str(key): str(value) for key, value in metadata.items() if str(value).strip()}

    surface_metadata = payload.get("surfaceMetadata")
    if isinstance(surface_metadata, dict):
        return {str(key): str(value) for key, value in surface_metadata.items() if str(value).strip()}

    return {}


def _value_or_dash(value: Any) -> str:
    text = str(value or "").strip()
    return text or "—"


def _process_field(payload: dict, metadata: dict[str, str], key: str) -> str:
    direct = payload.get(key)
    if direct is not None and str(direct).strip():
        return str(direct).strip()
    return metadata.get(key, "").strip()


def _has_active_process(payload: dict) -> bool:
    metadata = _extract_process_metadata(payload)
    process_name = _process_field(payload, metadata, "processName")
    process_id = _process_field(payload, metadata, "processId")
    return bool(process_name or process_id)


def _build_integration_ready_answer() -> str:
    return (
        "Процессная интеграция ЯСИИ подготовлена.\n\n"
        "Откройте экземпляр процесса на платформе — тогда я смогу отвечать "
        "о названии процесса, этапе и активном шаге."
    )


def _process_name(payload: dict, metadata: dict[str, str]) -> str:
    return _value_or_dash(_process_field(payload, metadata, "processName"))


def _active_step_name(payload: dict, metadata: dict[str, str]) -> str:
    step = _process_field(payload, metadata, "activeStepName")
    if step:
        return step
    return _process_field(payload, metadata, "activeStepId") or "—"


def _build_open_answer(payload: dict) -> str:
    if not _has_active_process(payload):
        return _build_integration_ready_answer()

    metadata = _extract_process_metadata(payload)
    process_name = _process_name(payload, metadata)
    return f"Сейчас открыт процесс «{process_name}»."


def _build_process_name_answer(payload: dict) -> str:
    if not _has_active_process(payload):
        return _build_integration_ready_answer()

    metadata = _extract_process_metadata(payload)
    process_name = _process_name(payload, metadata)
    return f"Открыт процесс «{process_name}»."


def _build_step_answer(payload: dict) -> str:
    if not _has_active_process(payload):
        return _build_integration_ready_answer()

    metadata = _extract_process_metadata(payload)
    step_name = _active_step_name(payload, metadata)
    return f"Текущий этап:\n{step_name}."


def _build_active_step_answer(payload: dict) -> str:
    if not _has_active_process(payload):
        return _build_integration_ready_answer()

    metadata = _extract_process_metadata(payload)
    step_name = _active_step_name(payload, metadata)
    return f"Активный шаг:\n{step_name}."


def _build_where_answer(payload: dict) -> str:
    if not _has_active_process(payload):
        return _build_integration_ready_answer()

    metadata = _extract_process_metadata(payload)
    process_name = _process_name(payload, metadata)
    return f"Вы работаете с процессом «{process_name}»."


def _build_selected_answer(payload: dict) -> str:
    if not _has_active_process(payload):
        return _build_integration_ready_answer()

    metadata = _extract_process_metadata(payload)
    step_name = _active_step_name(payload, metadata)
    return f"Сейчас активен шаг «{step_name}»."


def _build_process_summary(payload: dict) -> str:
    metadata = _extract_process_metadata(payload)
    if not _has_active_process(payload):
        return "Процессная поверхность — интеграция подготовлена, экземпляр процесса не выбран."

    process_name = _process_name(payload, metadata)
    step_name = _active_step_name(payload, metadata)
    status = _value_or_dash(_process_field(payload, metadata, "processStatus"))
    return (
        f"Процесс — «{process_name}».\n"
        f"Статус: {status}.\n"
        f"Активный шаг: {step_name}."
    )


def resolve_process_surface_fallback(payload: dict) -> str | None:
    if not _is_process_embedded(payload):
        return None

    summary = _build_process_summary(payload)
    return (
        "Я вижу процессную поверхность, но пока не понял вопрос.\n\n"
        "Могу ответить:\n"
        "• что сейчас открыто;\n"
        "• какой процесс открыт;\n"
        "• на каком этапе вы находитесь;\n"
        "• что сейчас выполняется;\n"
        "• где вы находитесь.\n\n"
        f"{summary}"
    )


def resolve_process_context_message(query_text: str, payload: dict) -> str | None:
    if not _is_process_embedded(payload):
        return None

    normalized = _normalize_query(query_text)
    if not normalized:
        return None

    if _matches_any(normalized, _OPEN_KEYWORDS):
        return _build_open_answer(payload)

    if _matches_any(normalized, _PROCESS_NAME_KEYWORDS):
        return _build_process_name_answer(payload)

    if _matches_any(normalized, _STEP_KEYWORDS):
        return _build_step_answer(payload)

    if _matches_any(normalized, _ACTIVE_STEP_KEYWORDS):
        return _build_active_step_answer(payload)

    if _matches_any(normalized, _SELECTED_KEYWORDS):
        return _build_selected_answer(payload)

    if _matches_any(normalized, _WHERE_KEYWORDS):
        return _build_where_answer(payload)

    return None
