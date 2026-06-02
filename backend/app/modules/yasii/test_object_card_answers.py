from app.modules.yasii.object_card_context_answers import (
    resolve_object_card_context_message,
    resolve_object_card_surface_fallback,
)


def test_object_card_context_resolver_returns_what_is_answer():
    payload = {
        "embedded": True,
        "hostSurface": "object_card",
        "objectTypeName": "Михаил",
        "objectTitle": "Михаил первый",
        "objectCardMetadata": {},
    }

    answer = resolve_object_card_context_message("Что это?", payload)

    assert answer is not None
    assert "Михаил первый" in answer
    assert "Тип объекта" in answer


def test_object_card_context_resolver_returns_object_summary():
    payload = {
        "embedded": True,
        "surfaceId": "object_card",
        "objectTypeName": "Контрагент",
        "objectTitle": "ООО Ромашка",
        "activeTab": "Документы",
        "objectCardMetadata": {
            "objectStatus": "active",
            "objectOwner": "Иван Петров",
            "objectCreatedAt": "2026-05-31T12:00:00Z",
        },
    }

    answer = resolve_object_card_context_message("Что это за карточка?", payload)

    assert answer is not None
    assert "карточка объекта" in answer.lower()
    assert "Контрагент" in answer
    assert "ООО Ромашка" in answer
    assert "Документы" in answer
    assert "Статус" in answer


def test_object_card_context_resolver_supports_extended_phrases():
    payload = {
        "embedded": True,
        "surfaceId": "object_card",
        "objectTypeName": "michael",
        "objectTitle": "MICHAEL",
        "activeTab": "main",
        "objectCardMetadata": {},
    }

    for question in (
        "что это за карточка?",
        "что за карточка?",
        "какая это карточка?",
        "что открыто?",
        "что я открыл?",
        "расскажи про карточку",
        "информация по карточке",
        "какая карточка открыта?",
        "что я сейчас редактирую?",
    ):
        answer = resolve_object_card_context_message(question, payload)
        assert answer is not None
        assert "карточка объекта" in answer.lower()
        assert "michael" in answer.lower()
        assert "main" in answer.lower()


def test_object_card_context_resolver_honest_fallback_when_metadata_missing():
    payload = {
        "embedded": True,
        "surfaceId": "object_card",
        "objectTypeName": "Контрагент",
        "objectTitle": "ООО Ромашка",
        "activeTab": "Основное",
        "objectCardMetadata": {},
    }

    answer = resolve_object_card_context_message("Что известно об этом объекте?", payload)

    assert answer is not None
    assert "Дополнительные данные карточки пока передаются ограниченно." in answer


def test_object_card_surface_fallback_when_question_not_recognized():
    payload = {
        "embedded": True,
        "surfaceId": "object_card",
        "objectTypeName": "michael",
        "objectTitle": "MICHAEL",
        "activeTab": "main",
        "objectCardMetadata": {},
    }

    answer = resolve_object_card_surface_fallback(payload)

    assert answer is not None
    assert "не понял вопрос" in answer
    assert "что это за объект" in answer
    assert "карточка объекта" in answer.lower()
    assert "michael" in answer.lower()
