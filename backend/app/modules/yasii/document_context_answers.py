"""Document embedded context answers — HostContext-aware responses."""

from __future__ import annotations

import re
from typing import Any

_DOCUMENT_SURFACE = "document"

_OPEN_KEYWORDS = (
    "что сейчас открыто",
    "что открыто",
    "что я смотрю",
    "что на экране",
)

_DOCUMENT_NAME_KEYWORDS = (
    "какой документ открыт",
    "какой документ сейчас",
    "какой файл открыт",
    "какой файл сейчас",
    "название документа",
    "имя документа",
)

_FILE_TYPE_KEYWORDS = (
    "какой тип файла",
    "какой тип документа",
    "тип файла",
    "формат файла",
    "формат документа",
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


def _is_document_embedded(payload: dict) -> bool:
    return payload.get("embedded") is True and _host_surface(payload) == _DOCUMENT_SURFACE


def _extract_document_metadata(payload: dict) -> dict[str, str]:
    metadata = payload.get("documentMetadata")
    if isinstance(metadata, dict):
        return {str(key): str(value) for key, value in metadata.items() if str(value).strip()}

    surface_metadata = payload.get("surfaceMetadata")
    if isinstance(surface_metadata, dict):
        return {str(key): str(value) for key, value in surface_metadata.items() if str(value).strip()}

    return {}


def _value_or_dash(value: Any) -> str:
    text = str(value or "").strip()
    return text or "—"


def _document_field(payload: dict, metadata: dict[str, str], key: str) -> str:
    direct = payload.get(key)
    if direct is not None and str(direct).strip():
        return str(direct).strip()
    return metadata.get(key, "").strip()


def _document_name(payload: dict, metadata: dict[str, str]) -> str:
    return _value_or_dash(_document_field(payload, metadata, "documentName"))


def _document_type(payload: dict, metadata: dict[str, str]) -> str:
    return _value_or_dash(_document_field(payload, metadata, "documentType"))


def _build_open_answer(payload: dict) -> str:
    metadata = _extract_document_metadata(payload)
    document_name = _document_name(payload, metadata)
    return f"Сейчас открыт документ «{document_name}»."


def _build_document_name_answer(payload: dict) -> str:
    metadata = _extract_document_metadata(payload)
    document_name = _document_name(payload, metadata)
    return f"Открыт документ «{document_name}»."


def _build_file_type_answer(payload: dict) -> str:
    metadata = _extract_document_metadata(payload)
    document_type = _document_type(payload, metadata)
    return f"Тип документа: {document_type}."


def _build_selected_answer(payload: dict) -> str:
    metadata = _extract_document_metadata(payload)
    document_name = _document_name(payload, metadata)
    return f"Сейчас активен документ «{document_name}»."


def _build_where_answer(payload: dict) -> str:
    metadata = _extract_document_metadata(payload)
    document_name = _document_name(payload, metadata)
    library_name = _value_or_dash(
        _document_field(payload, metadata, "documentLibraryName")
    )
    return (
        f"Вы просматриваете документ «{document_name}».\n\n"
        f"Библиотека: {library_name}."
    )


def _build_document_summary(payload: dict) -> str:
    metadata = _extract_document_metadata(payload)
    document_name = _document_name(payload, metadata)
    document_type = _document_type(payload, metadata)
    library_name = _value_or_dash(_document_field(payload, metadata, "documentLibraryName"))
    return (
        f"Документ — «{document_name}».\n"
        f"Тип: {document_type}.\n"
        f"Библиотека: {library_name}."
    )


def resolve_document_surface_fallback(payload: dict) -> str | None:
    if not _is_document_embedded(payload):
        return None

    summary = _build_document_summary(payload)
    return (
        "Я вижу, что открыт документ, но пока не понял вопрос.\n\n"
        "Могу ответить:\n"
        "• что сейчас открыто;\n"
        "• какой документ открыт;\n"
        "• какой тип файла;\n"
        "• что выбрано;\n"
        "• где вы находитесь.\n\n"
        f"{summary}"
    )


def resolve_document_context_message(query_text: str, payload: dict) -> str | None:
    if not _is_document_embedded(payload):
        return None

    normalized = _normalize_query(query_text)
    if not normalized:
        return None

    if _matches_any(normalized, _OPEN_KEYWORDS):
        return _build_open_answer(payload)

    if _matches_any(normalized, _DOCUMENT_NAME_KEYWORDS):
        return _build_document_name_answer(payload)

    if _matches_any(normalized, _FILE_TYPE_KEYWORDS):
        return _build_file_type_answer(payload)

    if _matches_any(normalized, _SELECTED_KEYWORDS):
        return _build_selected_answer(payload)

    if _matches_any(normalized, _WHERE_KEYWORDS):
        return _build_where_answer(payload)

    return None
