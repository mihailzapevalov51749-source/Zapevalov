"""Dashboard embedded context answers — owner-style responses from HostContext metadata."""

from __future__ import annotations

import re
from typing import Any

_CURRENT_STAGE_KEYWORDS = (
    "какой этап",
    "какой сейчас этап",
    "что мы сейчас делаем",
    "что сейчас делаем",
    "какая текущая работа",
    "текущая работа",
    "что сейчас в работе",
    "что в работе",
    "текущий этап",
)

_NEXT_WORK_KEYWORDS = (
    "что дальше",
    "что дальше?",
    "следующие работы",
    "какие следующие работы",
    "что дальше по roadmap",
    "что дальше по дорожной карте",
)

_COMPLETED_WORK_KEYWORDS = (
    "что уже завершено",
    "что завершено",
    "что уже сделано",
    "что сделано",
    "завершённые работы",
    "завершенные работы",
)

_READINESS_KEYWORDS = (
    "readiness",
    "готовность",
    "процент готовности",
    "насколько готов",
)


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def _matches_any(normalized: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized for keyword in keywords)


def _split_metadata_list(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    text = str(raw).strip()
    if not text:
        return []
    if "|" in text:
        return [part.strip() for part in text.split("|") if part.strip()]
    if ";" in text:
        return [part.strip() for part in text.split(";") if part.strip()]
    return [text]


def _extract_dashboard_metadata(payload: dict) -> dict[str, str]:
    metadata = payload.get("dashboardMetadata")
    if isinstance(metadata, dict):
        return {str(key): str(value) for key, value in metadata.items() if str(value).strip()}

    snapshot_metadata = payload.get("snapshotMetadata")
    if isinstance(snapshot_metadata, dict):
        return {str(key): str(value) for key, value in snapshot_metadata.items() if str(value).strip()}

    return {}


def _format_bullets(items: list[str]) -> str:
    if not items:
        return "—"
    return "\n".join(f"• {item}" for item in items)


def _build_current_stage_answer(metadata: dict[str, str], payload: dict) -> str:
    current_items = _split_metadata_list(metadata.get("currentWorkItems"))
    if not current_items:
        current_items = _split_metadata_list(metadata.get("currentWorkItem"))

    active_phase = metadata.get("activePhase") or metadata.get("activePhaseTitle") or ""
    selected_scope = str(payload.get("selectedScope") or metadata.get("selectedScope") or "").strip()
    readiness = metadata.get("readiness") or metadata.get("yasiiReadiness") or metadata.get("containerReadiness") or ""

    if not current_items and not active_phase:
        return (
            "Я вижу, что вы находитесь в Platform Dashboard.\n\n"
            f"Контекст: {selected_scope or 'не указан'}.\n\n"
            "Но данные текущей работы Dashboard пока не передаются в HostContext.\n\n"
            "Следующий шаг — передать currentWorkItem, completedWorkItems и nextWorkItems "
            "из Dashboard в HostContext."
        )

    lines: list[str] = ["Сейчас активен этап:", ""]

    if current_items:
        lines.append(current_items[0])
        if len(current_items) > 1:
            lines.append("")
            lines.append("Также в работе:")
            lines.extend(f"• {item}" for item in current_items[1:])
    else:
        lines.append(active_phase)

    description = metadata.get("activePhaseDescription") or metadata.get("phaseDescription") or ""
    if description:
        lines.extend(["", "Что это значит:", description])

    completed = _split_metadata_list(metadata.get("completedWorkItems"))
    if completed:
        lines.extend(["", "Уже завершено:", _format_bullets(completed)])

    next_items = _split_metadata_list(metadata.get("nextWorkItems"))
    if next_items:
        lines.extend(["", "Следующие работы:", _format_bullets(next_items)])

    if readiness:
        lines.extend(["", f"Готовность: {readiness}"])

    return "\n".join(lines)


def _build_next_work_answer(metadata: dict[str, str]) -> str:
    next_items = _split_metadata_list(metadata.get("nextWorkItems"))
    if not next_items:
        return (
            "Следующие работы Dashboard пока не переданы в HostContext.\n\n"
            "Обновите контекст Dashboard или передайте nextWorkItems в metadata."
        )

    return "Следующие работы:\n" + _format_bullets(next_items)


def _build_completed_work_answer(metadata: dict[str, str]) -> str:
    completed = _split_metadata_list(metadata.get("completedWorkItems"))
    if not completed:
        return (
            "Завершённые работы Dashboard пока не переданы в HostContext.\n\n"
            "Передайте completedWorkItems в metadata HostContext."
        )

    return "Уже завершено:\n" + _format_bullets(completed)


def _build_readiness_answer(metadata: dict[str, str]) -> str:
    readiness = (
        metadata.get("readiness")
        or metadata.get("yasiiReadiness")
        or metadata.get("containerReadiness")
        or metadata.get("aceReadiness")
    )
    if not readiness:
        return (
            "Показатели readiness Dashboard пока не переданы в HostContext.\n\n"
            "Передайте readiness или yasiiReadiness в metadata."
        )

    lines = [f"Готовность по текущему контексту Dashboard: {readiness}"]
    active_phase = metadata.get("activePhase") or ""
    if active_phase:
        lines.append(f"Этап: {active_phase}")
    return "\n".join(lines)


def resolve_dashboard_context_message(query_text: str, payload: dict) -> str | None:
    """Return dashboard-specific answer when embedded query matches dashboard context."""
    if payload.get("embedded") is not True:
        return None

    host_surface = str(payload.get("surfaceId") or payload.get("hostSurface") or "").strip().lower()
    if host_surface != "dashboard":
        return None

    normalized = _normalize_query(query_text)
    if not normalized:
        return None

    metadata = _extract_dashboard_metadata(payload)

    if _matches_any(normalized, _NEXT_WORK_KEYWORDS):
        return _build_next_work_answer(metadata)

    if _matches_any(normalized, _COMPLETED_WORK_KEYWORDS):
        return _build_completed_work_answer(metadata)

    if _matches_any(normalized, _READINESS_KEYWORDS):
        return _build_readiness_answer(metadata)

    if _matches_any(normalized, _CURRENT_STAGE_KEYWORDS):
        return _build_current_stage_answer(metadata, payload)

    return None
