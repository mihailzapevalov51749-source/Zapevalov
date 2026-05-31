import app.modules.yasii.owner_assistant_profile  # noqa: F401

from app.modules.yasii.owner_assistant_profile import (
    OWNER_ASSISTANT_PROFILE_ID,
    OwnerAssistantProfile,
    format_owner_assistant_profile_message,
    get_owner_assistant_profile,
    get_owner_assistant_profile_snapshot,
    resolve_owner_assistant_profile_message,
)


def test_get_owner_assistant_profile_returns_expected_fields():
    profile = get_owner_assistant_profile()

    assert isinstance(profile, OwnerAssistantProfile)
    assert profile.profileId == OWNER_ASSISTANT_PROFILE_ID
    assert profile.role == "Цифровой сотрудник владельца системы"
    assert "риски" in profile.mission
    assert "Объяснение архитектуры" in profile.currentCapabilities
    assert "Статус проекта" in profile.futureCapabilities
    assert "Не анализирует реальный код" in profile.limitations
    assert profile.metadata.get("phase") == "P6-W01"


def test_get_owner_assistant_profile_snapshot():
    snapshot = get_owner_assistant_profile_snapshot()

    assert snapshot.snapshotId.startswith("owner-assistant-profile-")
    assert snapshot.profile.profileId == OWNER_ASSISTANT_PROFILE_ID
    assert snapshot.createdAt


def test_format_owner_assistant_profile_message_structure():
    message = format_owner_assistant_profile_message()

    assert message.startswith("Owner Assistant Profile")
    assert "Роль" in message
    assert "Миссия" in message
    assert "Уже умею" in message
    assert "В будущем" in message
    assert "Ограничения" in message
    assert "объяснять архитектуру" in message


def test_resolve_owner_assistant_profile_message_identity():
    message = resolve_owner_assistant_profile_message("Кто ты для владельца?")

    assert message is not None
    assert "Owner Assistant Profile" in message
    assert "Цифровой сотрудник" in message


def test_resolve_owner_assistant_profile_message_help():
    message = resolve_owner_assistant_profile_message("Как ты помогаешь принимать решения?")

    assert message is not None
    assert "Как помогаю принимать решения" in message


def test_resolve_owner_assistant_profile_message_business_capabilities():
    message = resolve_owner_assistant_profile_message("Что ты умеешь для бизнеса?")

    assert message is not None
    assert "Уже умею" in message
    assert "Ограничения" not in message


def test_resolve_owner_assistant_profile_message_unknown():
    assert resolve_owner_assistant_profile_message("Какой сегодня день?") is None
