"""Designer (Studio) embedded context answers — HostContext-aware responses."""

from __future__ import annotations

import re
from typing import Any

_DESIGNER_SURFACE = "designer"

_OPEN_KEYWORDS = (
    "что сейчас открыто",
    "что открыто",
    "что я смотрю",
    "что на экране",
)

_CONFIGURE_KEYWORDS = (
    "что я сейчас настраиваю",
    "что я настраиваю",
    "что я сейчас редактирую",
    "что я редактирую",
    "что сейчас редактируется",
    "что редактируется",
)

_SECTION_KEYWORDS = (
    "какой раздел конструктора открыт",
    "какой раздел открыт",
    "какой раздел сейчас",
    "активный раздел",
)

_SELECTED_KEYWORDS = (
    "что выбрано",
    "что сейчас выбрано",
    "что выделено",
)

_WHERE_KEYWORDS = (
    "где я нахожусь",
    "где я сейчас",
    "где я",
)


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def _matches_any(normalized: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized for keyword in keywords)


def _host_surface(payload: dict) -> str:
    return str(payload.get("surfaceId") or payload.get("hostSurface") or "").strip().lower()


def _is_designer_embedded(payload: dict) -> bool:
    return payload.get("embedded") is True and _host_surface(payload) == _DESIGNER_SURFACE


def _extract_designer_metadata(payload: dict) -> dict[str, str]:
    metadata = payload.get("designerMetadata")
    if isinstance(metadata, dict):
        return {str(key): str(value) for key, value in metadata.items() if str(value).strip()}

    surface_metadata = payload.get("surfaceMetadata")
    if isinstance(surface_metadata, dict):
        return {str(key): str(value) for key, value in surface_metadata.items() if str(value).strip()}

    return {}


def _value_or_dash(value: Any) -> str:
    text = str(value or "").strip()
    return text or "—"


def _designer_field(payload: dict, metadata: dict[str, str], key: str) -> str:
    direct = payload.get(key)
    if direct is not None and str(direct).strip():
        return str(direct).strip()
    return metadata.get(key, "").strip()


def _objects_area_label(entity_type: str) -> str:
    if entity_type in {"objects_catalog", "objects_section"}:
        return "конструктор объектов"
    if entity_type == "object_type":
        return "редактирование типа объекта"
    return "раздел «Объекты»"


def _build_open_answer(payload: dict) -> str:
    metadata = _extract_designer_metadata(payload)
    area = _value_or_dash(_designer_field(payload, metadata, "designerArea"))
    entity_type = _designer_field(payload, metadata, "designerEntityType")
    entity_name = _value_or_dash(_designer_field(payload, metadata, "designerEntityName"))

    if entity_type == "navigation":
        return "Сейчас открыт раздел навигации конструктора.\n\nРедактируется навигационная структура."

    if entity_type == "object_type":
        return (
            f"Сейчас открыт {_objects_area_label(entity_type)}.\n\n"
            f"Редактируется объект «{entity_name}»."
        )

    if entity_type in {"objects_catalog", "objects_section"}:
        return f"Сейчас открыт {_objects_area_label(entity_type)}."

    if entity_type == "page":
        return f"Сейчас открыт раздел страниц.\n\nРедактируется «{entity_name}»."

    if "portal" in entity_name.lower() or "портал" in entity_name.lower():
        return f"Сейчас открыт раздел порталов.\n\nРедактируется «{entity_name}»."

    return f"Сейчас открыт раздел «{area}»."


def _build_configure_answer(payload: dict) -> str:
    metadata = _extract_designer_metadata(payload)
    entity_name = _value_or_dash(_designer_field(payload, metadata, "designerEntityName"))
    section = _value_or_dash(
        _designer_field(payload, metadata, "designerSection")
        or metadata.get("activeTabLabel", "")
    )
    entity_type = _designer_field(payload, metadata, "designerEntityType")

    if entity_type == "navigation":
        return "Сейчас редактируется навигационная структура."

    lines = [f"Сейчас редактируется «{entity_name}»."]
    if section and section != "—" and section != entity_name:
        lines.extend(["", f"Активный раздел: {section}."])
    return "\n".join(lines)


def _build_section_answer(payload: dict) -> str:
    metadata = _extract_designer_metadata(payload)
    section = _value_or_dash(
        _designer_field(payload, metadata, "designerSection")
        or metadata.get("activeTabLabel", "")
        or _designer_field(payload, metadata, "designerArea")
    )
    return f"Сейчас открыт раздел «{section}»."


def _build_selected_answer(payload: dict) -> str:
    metadata = _extract_designer_metadata(payload)
    entity_type = _designer_field(payload, metadata, "designerEntityType")
    entity_name = _value_or_dash(_designer_field(payload, metadata, "designerEntityName"))
    node_name = _value_or_dash(_designer_field(payload, metadata, "selectedNodeName"))

    if entity_type == "object_type":
        return f"Выбран объект «{entity_name}»."

    if entity_type == "navigation":
        return "Выбрана навигационная структура."

    if node_name != "—":
        return f"Выбрано: {node_name}."

    return f"Выбрано: {entity_name}."


def _build_where_answer(payload: dict) -> str:
    metadata = _extract_designer_metadata(payload)
    area = _value_or_dash(_designer_field(payload, metadata, "designerArea"))
    entity_name = _value_or_dash(_designer_field(payload, metadata, "designerEntityName"))
    section = _value_or_dash(
        _designer_field(payload, metadata, "designerSection")
        or metadata.get("activeTabLabel", "")
    )
    entity_type = _designer_field(payload, metadata, "designerEntityType")

    lines = [
        "Вы работаете в Студии ЯсноПро.",
        "",
        f"Раздел: {area}.",
    ]

    if entity_type == "object_type" and entity_name != "—":
        lines.extend(["", f"Объект: {entity_name}."])
        if section and section != "—" and section != entity_name:
            lines.extend(["", f"Подраздел: {section}."])
    elif entity_type == "navigation":
        lines.extend(["", "Редактируется навигационная структура."])
    elif entity_name != "—" and entity_name != area:
        lines.extend(["", f"Сущность: {entity_name}."])

    return "\n".join(lines)


def _build_designer_summary(payload: dict) -> str:
    metadata = _extract_designer_metadata(payload)
    area = _value_or_dash(_designer_field(payload, metadata, "designerArea"))
    entity_name = _value_or_dash(_designer_field(payload, metadata, "designerEntityName"))
    section = _value_or_dash(
        _designer_field(payload, metadata, "designerSection")
        or metadata.get("activeTabLabel", "")
    )
    return (
        f"Студия — раздел «{area}».\n"
        f"Редактируется: {entity_name}.\n"
        f"Активный подраздел: {section}."
    )


def resolve_designer_surface_fallback(payload: dict) -> str | None:
    if not _is_designer_embedded(payload):
        return None

    summary = _build_designer_summary(payload)
    return (
        "Я вижу, что вы в Студии, но пока не понял вопрос.\n\n"
        "Могу ответить:\n"
        "• что сейчас открыто;\n"
        "• что вы настраиваете;\n"
        "• какой раздел конструктора открыт;\n"
        "• что выбрано;\n"
        "• где вы находитесь.\n\n"
        f"{summary}"
    )


def resolve_designer_context_message(query_text: str, payload: dict) -> str | None:
    if not _is_designer_embedded(payload):
        return None

    normalized = _normalize_query(query_text)
    if not normalized:
        return None

    if _matches_any(normalized, _OPEN_KEYWORDS):
        return _build_open_answer(payload)

    if _matches_any(normalized, _CONFIGURE_KEYWORDS):
        return _build_configure_answer(payload)

    if _matches_any(normalized, _SECTION_KEYWORDS):
        return _build_section_answer(payload)

    if _matches_any(normalized, _SELECTED_KEYWORDS):
        return _build_selected_answer(payload)

    if _matches_any(normalized, _WHERE_KEYWORDS):
        return _build_where_answer(payload)

    return None
