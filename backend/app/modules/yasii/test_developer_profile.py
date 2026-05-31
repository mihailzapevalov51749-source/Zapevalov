import app.modules.yasii.developer_profile  # noqa: F401

from app.modules.yasii.developer_profile import (
    DEVELOPER_PROFILE_ID,
    DeveloperProfile,
    format_developer_profile_message,
    get_capabilities,
    get_developer_profile,
    get_limitations,
    get_profile_snapshot,
    resolve_developer_profile_message,
)


def test_get_developer_profile_returns_mvp_values():
    profile = get_developer_profile()

    assert isinstance(profile, DeveloperProfile)
    assert profile.profileId == DEVELOPER_PROFILE_ID
    assert profile.name == "ЯСИИ"
    assert profile.role == "Digital Employee"
    assert "YasnoPro Platform" in profile.specialization
    assert profile.version == "MVP"
    assert "Architecture Navigation" in profile.capabilities
    assert "No LLM" in profile.limitations


def test_get_capabilities_returns_profile_capabilities():
    capabilities = get_capabilities()

    assert capabilities == get_developer_profile().capabilities
    assert "Runtime Pipeline Inspection" in capabilities


def test_get_limitations_returns_profile_limitations():
    limitations = get_limitations()

    assert limitations == get_developer_profile().limitations
    assert "No Repository Search" in limitations


def test_get_profile_snapshot_contains_profile():
    snapshot = get_profile_snapshot()

    assert snapshot.snapshotId.startswith("developer-profile-")
    assert snapshot.profile.profileId == DEVELOPER_PROFILE_ID
    assert snapshot.createdAt


def test_resolve_developer_profile_message_identity():
    message = resolve_developer_profile_message("Кто ты?")

    assert message is not None
    assert "Я ЯСИИ" in message
    assert "Digital Employee" in message
    assert "Product Owner Assistant" in message
    assert format_developer_profile_message() == message


def test_resolve_developer_profile_message_capabilities():
    message = resolve_developer_profile_message("Что ты умеешь?")

    assert message is not None
    assert "Возможности ЯСИИ" in message
    assert "Phase Tracking" in message


def test_resolve_developer_profile_message_limitations():
    message = resolve_developer_profile_message("Какие ограничения?")

    assert message is not None
    assert "Ограничения ЯСИИ" in message
    assert "No LLM" in message


def test_resolve_developer_profile_message_unknown_returns_none():
    assert resolve_developer_profile_message("Покажи статус платформы") is None
