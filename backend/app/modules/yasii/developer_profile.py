"""YASII Developer Profile (P5-W01) — MVP identity, capabilities, and limitations."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

DEVELOPER_PROFILE_SCHEMA_VERSION = "0.1.0"
DEVELOPER_PROFILE_ID = "yasii-developer"

YASII_OWNER_ROLES = (
    "Digital Employee",
    "Product Owner Assistant",
    "Business Navigation Assistant",
)

_DEFAULT_CAPABILITIES = [
    "Architecture Navigation",
    "Runtime Pipeline Inspection",
    "Phase Tracking",
    "Developer Assistance",
]

_DEFAULT_LIMITATIONS = [
    "No LLM",
    "No Repository Search",
    "No Real Code Analysis",
]

_PROFILE_KEYWORDS = (
    "кто ты",
    "что ты такое",
    "твоя роль",
    "какая твоя роль",
)

_CAPABILITIES_KEYWORDS = (
    "что ты умеешь",
    "возможности",
    "capabilities",
)

_LIMITATIONS_KEYWORDS = (
    "ограничения",
    "limitations",
    "что ты не умеешь",
)


@dataclass
class DeveloperProfile:
    schemaVersion: str = DEVELOPER_PROFILE_SCHEMA_VERSION
    profileId: str = DEVELOPER_PROFILE_ID
    name: str = "ЯСИИ"
    role: str = "Digital Employee"
    specialization: str = "Product Owner Assistant · YasnoPro Platform"
    version: str = "MVP"
    capabilities: list[str] = field(default_factory=lambda: list(_DEFAULT_CAPABILITIES))
    limitations: list[str] = field(default_factory=lambda: list(_DEFAULT_LIMITATIONS))
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class DeveloperProfileSnapshot:
    snapshotId: str
    profile: DeveloperProfile
    createdAt: str


def get_developer_profile() -> DeveloperProfile:
    return DeveloperProfile()


def get_capabilities() -> list[str]:
    return list(get_developer_profile().capabilities)


def get_limitations() -> list[str]:
    return list(get_developer_profile().limitations)


def get_profile_snapshot() -> DeveloperProfileSnapshot:
    return DeveloperProfileSnapshot(
        snapshotId=f"developer-profile-{uuid4()}",
        profile=get_developer_profile(),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )


def _format_bullet_list(items: list[str]) -> str:
    return "\n".join(f"• {item}" for item in items)


def format_developer_profile_message(profile: DeveloperProfile | None = None) -> str:
    current = profile or get_developer_profile()
    capabilities_block = _format_bullet_list(current.capabilities)
    roles_block = _format_bullet_list(list(YASII_OWNER_ROLES))
    return (
        f"Я {current.name}.\n\n"
        f"Роль:\n{current.role}\n\n"
        f"Роли для владельца продукта:\n{roles_block}\n\n"
        f"Специализация:\n{current.specialization}\n\n"
        f"Версия:\n{current.version}\n\n"
        f"Возможности:\n{capabilities_block}"
    )


def format_capabilities_message() -> str:
    return f"Возможности ЯСИИ:\n{_format_bullet_list(get_capabilities())}"


def format_limitations_message() -> str:
    return f"Ограничения ЯСИИ:\n{_format_bullet_list(get_limitations())}"


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def resolve_developer_profile_message(text: str) -> str | None:
    """Keyword-based developer profile responses; no LLM or repository access."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text:
        return None

    if _contains_keyword(normalized_text, _LIMITATIONS_KEYWORDS):
        return format_limitations_message()

    if _contains_keyword(normalized_text, _CAPABILITIES_KEYWORDS):
        return format_capabilities_message()

    if _contains_keyword(normalized_text, _PROFILE_KEYWORDS):
        return format_developer_profile_message()

    return None
