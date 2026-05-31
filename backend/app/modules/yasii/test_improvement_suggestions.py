import app.modules.yasii.improvement_suggestions  # noqa: F401

from app.modules.yasii.improvement_suggestions import (
    ImprovementSuggestions,
    SuggestionPriority,
    format_improvement_suggestions_message,
    get_improvement_suggestions,
    resolve_improvement_suggestions_message,
)


def test_get_improvement_suggestions_mvp_counts():
    bundle = get_improvement_suggestions()

    assert isinstance(bundle, ImprovementSuggestions)
    assert bundle.totalCount == 3
    assert bundle.highPriorityCount == 1
    assert len(bundle.suggestions) == 3
    assert bundle.metadata.get("phase") == "P6-W06"
    assert bundle.metadata.get("sources") == "P6-W02,P6-W03,P6-W04,P6-W05"
    assert bundle.metadata.get("healthSnapshotId")
    assert bundle.metadata.get("realityCheckId")
    assert bundle.metadata.get("deviationRegistryId")
    assert bundle.metadata.get("ownerReportId")


def test_get_improvement_suggestions_priorities_and_content():
    bundle = get_improvement_suggestions()
    titles = [item.title for item in bundle.suggestions]

    assert titles[0] == "Подключить данные проекта"
    assert bundle.suggestions[0].priority == SuggestionPriority.HIGH
    assert "критическое отклонение" in bundle.suggestions[0].reason
    assert "Добавить статус задач проекта" in titles
    assert "Добавить контроль рисков" in titles


def test_format_improvement_suggestions_message_structure():
    message = format_improvement_suggestions_message()

    assert message.startswith("Improvement Suggestions")
    assert "Всего рекомендаций" in message
    assert "Высокий приоритет" in message
    assert "Подключить данные проекта" in message
    assert "Приоритет: Высокий" in message
    assert "реальным состоянием проекта" in message
    assert "Главная рекомендация" in message


def test_resolve_improvement_suggestions_message_keywords():
    message = resolve_improvement_suggestions_message("Что делать дальше?")

    assert message is not None
    assert "Improvement Suggestions" in message


def test_resolve_improvement_suggestions_message_show_suggestions():
    message = resolve_improvement_suggestions_message("Покажи предложения по улучшению")

    assert message is not None
    assert "Приоритет: Средний" in message


def test_resolve_improvement_suggestions_message_unknown():
    assert resolve_improvement_suggestions_message("Привет") is None
