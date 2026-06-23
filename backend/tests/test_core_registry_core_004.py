"""WI-ARCH-CORE-004 / WI-ARCH-REG-DATA-002 — core registry composition and card metadata."""

from __future__ import annotations

from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.registry_constants import (
    CORE_REGISTRY_COMPONENT_KEYS,
    REGISTRY_CORE,
    REGISTRY_DATA,
)


CORE_CARD_SPEC: dict[str, dict[str, str]] = {
    "company-model": {
        "title": "Компания",
        "description": (
            "Базовый контейнер платформы, внутри которого существуют пользователи, "
            "объекты, данные, настройки и рабочее пространство организации."
        ),
    },
    "entity-engine": {
        "title": "Движок объектов",
        "description": "Источник истины бизнес-данных tenant: записи объектов и их версии.",
    },
    "object-types-engine": {
        "title": "Объект",
        "description": (
            "Универсальный инструмент конструктора, предназначенный для описания любой "
            "сущности компании: клиента, проекта, договора, сотрудника, задачи, документа "
            "и других элементов деятельности."
        ),
    },
    "fields-engine": {
        "title": "Поля",
        "description": (
            "Атрибуты объекта, определяющие какие данные могут храниться в экземплярах объекта."
        ),
    },
    "relation-engine": {
        "title": "Связи",
        "description": (
            "Механизм установления отношений между объектами и их экземплярами, "
            "позволяющий формировать единую модель данных компании."
        ),
    },
    "view-engine": {
        "title": "Представления",
        "description": (
            "Способы отображения объектов и их данных для пользователя: таблицы, карточки, "
            "планы, календари и другие формы визуализации."
        ),
    },
    "action-engine": {
        "title": "Действия",
        "description": (
            "Операции, которые могут выполняться над объектами, экземплярами объектов "
            "и другими элементами платформы."
        ),
    },
    "event-engine": {
        "title": "Движок событий",
        "description": "Журналы событий, аудит и dev-development записи.",
    },
    "navigation-engine": {
        "title": "Навигация",
        "description": (
            "Механизм организации перемещения пользователя по платформе и доступа к её "
            "разделам, объектам и функциям."
        ),
    },
    "permission-engine": {
        "title": "Доступ",
        "description": (
            "Механизм управления правами пользователей, определяющий кто, что и в каком "
            "объёме может видеть, изменять или выполнять."
        ),
    },
    "portal-composition-engine": {
        "title": "Композиция портала",
        "description": (
            "Механизм построения пользовательского пространства компании из страниц, "
            "секций, блоков, объектов, модулей и элементов интерфейса."
        ),
    },
    "process-engine": {
        "title": "Движок процессов",
        "description": "Исполнение бизнес-процессов поверх объектов и действий.",
    },
}


def _merged(component_key: str) -> dict:
    for row in service._all_seed_rows():
        if row["component_key"] == component_key:
            return service._merged_seed_row(row)
    raise KeyError(component_key)


def _core_rows() -> list[dict]:
    return [
        service._merged_seed_row(row)
        for row in service._all_seed_rows()
        if service._merged_seed_row(row).get("registry_key") == REGISTRY_CORE
    ]


def test_core_registry_has_exactly_twelve_mechanisms():
    core_keys = {row["component_key"] for row in _core_rows()}
    assert len(core_keys) == 12
    assert core_keys == set(CORE_REGISTRY_COMPONENT_KEYS)


def test_entity_engine_mechanism_stays_in_core_registry():
    row = _merged("entity-engine")
    assert row["registry_key"] == REGISTRY_CORE
    assert row["title"] == "Движок объектов"
    assert "entity-engine" in {r["component_key"] for r in _core_rows()}


def test_event_engine_mechanism_stays_in_core_not_data():
    row = _merged("event-engine")
    assert row["registry_key"] == REGISTRY_CORE
    assert row["registry_key"] != REGISTRY_DATA
    assert "event-engine" in {r["component_key"] for r in _core_rows()}


def test_process_engine_in_core_registry():
    assert _merged("process-engine")["registry_key"] == REGISTRY_CORE


def test_core_card_titles_and_descriptions_match_spec():
    for component_key, spec in CORE_CARD_SPEC.items():
        row = _merged(component_key)
        assert row["registry_key"] == REGISTRY_CORE, component_key
        assert row["title"] == spec["title"], component_key
        assert row["description"] == spec["description"], component_key
