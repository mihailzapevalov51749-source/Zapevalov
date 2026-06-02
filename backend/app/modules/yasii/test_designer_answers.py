from app.modules.yasii.designer_context_answers import (
    resolve_designer_context_message,
    resolve_designer_surface_fallback,
)


def _designer_payload(**overrides):
    payload = {
        "embedded": True,
        "hostSurface": "designer",
        "designerArea": "Объекты",
        "designerEntityType": "object_type",
        "designerEntityId": "mikhail",
        "designerEntityName": "Михаил",
        "selectedNodeId": "mikhail:fields",
        "selectedNodeName": "Поля",
        "designerMetadata": {
            "designerMode": "designer",
            "designerPath": "/designer/tenant/1/object-types/mikhail/fields",
            "designerSection": "Поля",
            "activeTabLabel": "Поля",
        },
    }
    payload.update(overrides)
    return payload


def test_open_objects_workspace():
    message = resolve_designer_context_message(
        "Что сейчас открыто?",
        _designer_payload(designerEntityType="objects_catalog", designerEntityName="Каталог объектов"),
    )
    assert message is not None
    assert "конструктор объектов" in message.lower()


def test_configure_object_with_section():
    message = resolve_designer_context_message("Что я сейчас настраиваю?", _designer_payload())
    assert message is not None
    assert "Михаил" in message
    assert "Поля" in message


def test_section_question():
    message = resolve_designer_context_message("Какой раздел конструктора открыт?", _designer_payload())
    assert message is not None
    assert "Поля" in message


def test_selected_object():
    message = resolve_designer_context_message("Что выбрано?", _designer_payload())
    assert message is not None
    assert "Михаил" in message


def test_where_am_i():
    message = resolve_designer_context_message("Где я нахожусь?", _designer_payload())
    assert message is not None
    assert "Студии" in message
    assert "Объекты" in message
    assert "Михаил" in message


def test_navigation_section():
    message = resolve_designer_context_message(
        "Что сейчас редактируется?",
        _designer_payload(
            designerArea="Навигация",
            designerEntityType="navigation",
            designerEntityId="navigation",
            designerEntityName="Навигационная структура",
            designerMetadata={
                "designerSection": "Навигация",
                "designerMode": "designer",
                "designerPath": "/designer/tenant/1/navigation",
            },
        ),
    )
    assert message is not None
    assert "навигац" in message.lower()


def test_designer_fallback_not_demo_pipeline():
    message = resolve_designer_surface_fallback(_designer_payload())
    assert message is not None
    assert "runtime pipeline" not in message.lower()
    assert "Студии" in message or "Студия" in message
