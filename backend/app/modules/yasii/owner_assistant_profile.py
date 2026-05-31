"""YASII Owner Assistant Profile (P6-W01) — identity and capabilities for product owners."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

OWNER_ASSISTANT_PROFILE_SCHEMA_VERSION = "0.1.0"
OWNER_ASSISTANT_PROFILE_ID = "yasii-owner-assistant"

_DEFAULT_ROLE = "Цифровой сотрудник владельца системы"

_DEFAULT_MISSION = (
    "Помогать владельцу понимать текущее состояние платформы, "
    "видеть риски, контролировать развитие продукта, "
    "принимать решения на основе доступной информации."
)

_CURRENT_CAPABILITIES = [
    "Объяснение архитектуры",
    "Объяснение зависимостей",
    "Анализ влияния изменений",
    "Ответы на вопросы о платформе",
    "Навигация по текущему состоянию ЯСИИ",
]

_FUTURE_CAPABILITIES = [
    "Статус проекта",
    "Контроль рисков",
    "Отслеживание прогресса",
    "Работа с документами",
    "Анализ изменений",
    "Навигация по системе",
    "Помощь в принятии решений",
]

_DEFAULT_LIMITATIONS = [
    "Не анализирует реальный код",
    "Не изменяет платформу автоматически",
    "Не выполняет действия без подтверждения",
    "Не обладает доступом ко всем данным проекта",
]

_DECISION_SUPPORT = (
    "ЯСИИ собирает доступную информацию о платформе, объясняет связи и последствия "
    "изменений и показывает ограничения — чтобы владелец мог принять решение "
    "на основе уже проверенной картины, а не догадок."
)

_OWNER_IDENTITY_KEYWORDS = (
    "кто ты для владельца",
    "кто ты для бизнеса",
)

_OWNER_VALUE_KEYWORDS = (
    "чем ты полезен",
    "чем полезен",
    "чем ясии полезен",
)

_OWNER_HELP_KEYWORDS = (
    "как ты помогаешь",
    "как помогаешь",
    "как помогает принимать",
    "как ты помогаешь принимать",
)

_OWNER_ROLE_KEYWORDS = (
    "какая твоя роль",
    "твоя роль для владельца",
    "роль для владельца",
)

_OWNER_BUSINESS_CAPABILITIES_KEYWORDS = (
    "что ты умеешь для бизнеса",
    "что умеешь для бизнеса",
)


@dataclass
class OwnerAssistantProfile:
    schemaVersion: str = OWNER_ASSISTANT_PROFILE_SCHEMA_VERSION
    profileId: str = OWNER_ASSISTANT_PROFILE_ID
    role: str = _DEFAULT_ROLE
    mission: str = _DEFAULT_MISSION
    currentCapabilities: list[str] = field(
        default_factory=lambda: list(_CURRENT_CAPABILITIES),
    )
    futureCapabilities: list[str] = field(
        default_factory=lambda: list(_FUTURE_CAPABILITIES),
    )
    limitations: list[str] = field(default_factory=lambda: list(_DEFAULT_LIMITATIONS))
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class OwnerAssistantProfileSnapshot:
    snapshotId: str
    profile: OwnerAssistantProfile
    createdAt: str


def get_owner_assistant_profile() -> OwnerAssistantProfile:
    return OwnerAssistantProfile(
        metadata={
            "phase": "P6-W01",
            "decisionSupport": _DECISION_SUPPORT,
            "p5Capabilities": "architecture,dependencies,impact,platform-qa,navigation",
        },
    )


def get_owner_assistant_profile_snapshot() -> OwnerAssistantProfileSnapshot:
    return OwnerAssistantProfileSnapshot(
        snapshotId=f"owner-assistant-profile-{uuid4()}",
        profile=get_owner_assistant_profile(),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )


def _format_semicolon_bullets(items: list[str]) -> str:
    lines = []
    for index, item in enumerate(items):
        label = item[0].lower() + item[1:] if item else item
        suffix = ";" if index < len(items) - 1 else "."
        lines.append(f"• {label}{suffix}")
    return "\n".join(lines)


def _mission_summary(mission: str) -> str:
    return mission.replace(
        "Помогать владельцу понимать текущее состояние платформы, ",
        "Помогать понимать состояние платформы,\n",
    ).replace(
        "принимать решения на основе доступной информации.",
        "принимать решения.",
    )


def format_owner_assistant_profile_message(
    profile: OwnerAssistantProfile | None = None,
    *,
    include_limitations: bool = True,
    include_decision_support: bool = False,
) -> str:
    current = profile or get_owner_assistant_profile()
    sections = [
        "Owner Assistant Profile",
        "",
        "Роль",
        "",
        f"{current.role}.",
        "",
        "Миссия",
        "",
        _mission_summary(current.mission),
        "",
        "Уже умею",
        "",
        _format_semicolon_bullets(current.currentCapabilities),
        "",
        "В будущем",
        "",
        _format_semicolon_bullets(current.futureCapabilities[:3]),
    ]

    if include_limitations:
        sections.extend(
            [
                "",
                "Ограничения",
                "",
                _format_semicolon_bullets(current.limitations),
            ],
        )

    if include_decision_support:
        sections.extend(
            [
                "",
                "Как помогаю принимать решения",
                "",
                _DECISION_SUPPORT,
            ],
        )

    return "\n".join(sections)


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def resolve_owner_assistant_profile_message(text: str) -> str | None:
    """Keyword-based owner assistant profile; no LLM or repository access."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text:
        return None

    profile = get_owner_assistant_profile()

    if _contains_keyword(normalized_text, _OWNER_HELP_KEYWORDS):
        return format_owner_assistant_profile_message(
            profile,
            include_decision_support=True,
        )

    if _contains_keyword(normalized_text, _OWNER_BUSINESS_CAPABILITIES_KEYWORDS):
        return format_owner_assistant_profile_message(profile, include_limitations=False)

    if _contains_keyword(normalized_text, _OWNER_VALUE_KEYWORDS):
        return format_owner_assistant_profile_message(profile)

    if _contains_keyword(normalized_text, _OWNER_ROLE_KEYWORDS):
        return format_owner_assistant_profile_message(profile)

    if _contains_keyword(normalized_text, _OWNER_IDENTITY_KEYWORDS):
        return format_owner_assistant_profile_message(profile)

    return None
