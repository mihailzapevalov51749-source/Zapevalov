"""Object card embedded context answers — owner-style object-aware responses."""

from __future__ import annotations

import re
from typing import Any

_WHAT_IS_KEYWORDS = (
    "что это",
    "что это?",
    "что здесь",
)

_OBJECT_CARD_KEYWORDS = (
    "что это за объект",
    "что за объект",
    "что это за карточка",
    "что за карточка",
    "какая это карточка",
    "какая карточка сейчас открыта",
    "какая карточка открыта",
    "что открыто",
    "что я открыл",
    "расскажи про карточку",
    "информация по карточке",
    "как называется объект",
    "какой тип объекта открыт",
    "что я сейчас редактирую",
    "что известно об этом объекте",
    "какой объект открыт",
)


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def _extract_object_metadata(payload: dict) -> dict[str, str]:
    metadata = payload.get("objectCardMetadata")
    if isinstance(metadata, dict):
        return {str(key): str(value) for key, value in metadata.items() if str(value).strip()}
    return {}


def _value_or_dash(value: Any) -> str:
    text = str(value or "").strip()
    return text or "—"


def _build_object_card_what_is_answer(payload: dict) -> str:
    metadata = _extract_object_metadata(payload)
    object_type_name = _value_or_dash(payload.get("objectTypeName") or metadata.get("objectTypeName"))
    object_title = _value_or_dash(payload.get("objectTitle") or metadata.get("objectTitle"))

    return (
        f"Сейчас открыта карточка объекта «{object_title}».\n\n"
        f"Тип объекта: {object_type_name}."
    )


def _build_object_card_summary(payload: dict) -> str:
    metadata = _extract_object_metadata(payload)
    object_type_name = _value_or_dash(payload.get("objectTypeName") or metadata.get("objectTypeName"))
    object_title = _value_or_dash(payload.get("objectTitle") or metadata.get("objectTitle"))
    active_tab = _value_or_dash(payload.get("activeTab") or metadata.get("activeTab"))
    object_status = _value_or_dash(metadata.get("objectStatus"))
    object_owner = _value_or_dash(metadata.get("objectOwner"))
    object_created_at = _value_or_dash(metadata.get("objectCreatedAt"))

    lines = [
        "Сейчас открыта карточка объекта.",
        "",
        "Тип объекта:",
        object_type_name,
        "",
        "Название:",
        object_title,
        "",
        "Активная вкладка:",
        active_tab,
    ]

    has_extra = any(item != "—" for item in (object_status, object_owner, object_created_at))
    if has_extra:
        lines.extend(
            [
                "",
                "Дополнительные данные карточки:",
                f"• Статус: {object_status}",
                f"• Владелец: {object_owner}",
                f"• Создан: {object_created_at}",
            ]
        )
    else:
        lines.extend(
            [
                "",
                "Дополнительные данные карточки пока передаются ограниченно.",
            ]
        )

    return "\n".join(lines)


def resolve_object_card_surface_fallback(payload: dict) -> str | None:
    """Return fallback response for object_card when question is not recognized."""
    if payload.get("embedded") is not True:
        return None

    host_surface = str(payload.get("surfaceId") or payload.get("hostSurface") or "").strip().lower()
    if host_surface != "object_card":
        return None

    summary = _build_object_card_summary(payload)
    return (
        "Я вижу, что открыта карточка объекта, но пока не понял вопрос.\n\n"
        "Могу ответить:\n"
        "• что это за объект;\n"
        "• какой тип объекта открыт;\n"
        "• какая вкладка активна;\n"
        "• какие данные карточки переданы в контекст.\n\n"
        f"{summary}"
    )


def resolve_object_card_context_message(query_text: str, payload: dict) -> str | None:
    """Return object-aware response for embedded Object Card surface."""
    if payload.get("embedded") is not True:
        return None

    host_surface = str(payload.get("surfaceId") or payload.get("hostSurface") or "").strip().lower()
    if host_surface != "object_card":
        return None

    normalized = _normalize_query(query_text)
    if not normalized:
        return None

    if normalized in _WHAT_IS_KEYWORDS:
        return _build_object_card_what_is_answer(payload)

    if not any(keyword in normalized for keyword in _OBJECT_CARD_KEYWORDS):
        return None

    return _build_object_card_summary(payload)


def _matches_any(normalized: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized for keyword in keywords)
