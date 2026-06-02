from app.modules.yasii.document_context_answers import (
    resolve_document_context_message,
    resolve_document_surface_fallback,
)


def _document_payload(**overrides):
    payload = {
        "embedded": True,
        "hostSurface": "document",
        "surfaceId": "document",
        "documentName": "Регламент по размещению и согласованию ПИР-документации",
        "documentType": "DOCX",
        "documentLibraryName": "Нормативные документы",
        "documentMetadata": {
            "documentName": "Регламент по размещению и согласованию ПИР-документации",
            "documentType": "DOCX",
            "documentLibraryName": "Нормативные документы",
            "viewerType": "file_viewer",
        },
    }
    payload.update(overrides)
    return payload


def test_document_open_question():
    message = resolve_document_context_message(
        "Что сейчас открыто?",
        _document_payload(),
    )
    assert message is not None
    assert "Сейчас открыт документ" in message
    assert "ПИР-документации" in message


def test_document_name_question():
    message = resolve_document_context_message(
        "Какой документ открыт?",
        _document_payload(),
    )
    assert message is not None
    assert "Открыт документ" in message


def test_document_type_question():
    message = resolve_document_context_message(
        "Какой тип файла?",
        _document_payload(documentType="PDF", documentMetadata={"documentType": "PDF"}),
    )
    assert message is not None
    assert "Тип документа: PDF" in message


def test_document_where_question():
    message = resolve_document_context_message(
        "Где я нахожусь?",
        _document_payload(),
    )
    assert message is not None
    assert "Вы просматриваете документ" in message


def test_document_selected_question():
    message = resolve_document_context_message(
        "Что сейчас выбрано?",
        _document_payload(),
    )
    assert message is not None
    assert "Сейчас активен документ" in message


def test_document_surface_fallback():
    message = resolve_document_surface_fallback(_document_payload())
    assert message is not None
    assert "YASII runtime pipeline is available" not in message
