from app.modules.yasii.registry_context_answers import resolve_registry_context_message


def _registry_payload(**overrides):
    payload = {
        "embedded": True,
        "hostSurface": "registry",
        "registryName": "Проекты",
        "viewName": "Таблица",
        "selectedCount": "0",
        "registryMetadata": {
            "registryName": "Проекты",
            "viewName": "Таблица",
            "recordCount": "245",
            "activeFilters": "Статус равно В работе",
            "activeSorts": "Дата создания DESC",
            "selectedCount": "0",
            "visibleColumns": "Название|Статус",
        },
    }
    payload.update(overrides)
    return payload


def test_registry_context_resolver_returns_what_is_answer():
    answer = resolve_registry_context_message("Что это?", _registry_payload())

    assert answer is not None
    assert "реестр объекта" in answer
    assert "Проекты" in answer
    assert "245" in answer
    assert "табличном представлении" in answer


def test_registry_context_resolver_returns_open_summary():
    answer = resolve_registry_context_message("Что сейчас открыто?", _registry_payload())

    assert answer is not None
    assert "Проекты" in answer
    assert "245" in answer
    assert "Статус" in answer


def test_registry_context_resolver_lists_active_filters():
    answer = resolve_registry_context_message("Какие фильтры активны?", _registry_payload())

    assert answer is not None
    assert "Статус" in answer
    assert "В работе" in answer


def test_registry_context_resolver_reports_sorting():
    answer = resolve_registry_context_message(
        "По каким полям выполняется сортировка?",
        _registry_payload(),
    )

    assert answer is not None
    assert "Дата создания" in answer


def test_registry_context_resolver_reports_selection_count():
    payload = _registry_payload(selectedCount="3")
    payload["registryMetadata"]["selectedCount"] = "3"

    answer = resolve_registry_context_message("Сколько записей выбрано?", payload)

    assert answer is not None
    assert "3" in answer


def test_registry_context_resolver_reports_view_name():
    answer = resolve_registry_context_message("Какое представление открыто?", _registry_payload())

    assert answer is not None
    assert "Таблица" in answer
