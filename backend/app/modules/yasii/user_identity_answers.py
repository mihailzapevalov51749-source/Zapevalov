"""User Identity answers from platform profile (YASII-IDENTITY-001 — not User Memory)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.ai_context.user_identity import UserIdentity, user_identity_from_mapping

WHO_AM_I_KEYWORDS = (
    "кто я",
    "расскажи обо мне",
    "что ты знаешь обо мне как о пользователе",
)

NAME_KEYWORDS = (
    "как меня зовут",
    "какое у меня имя",
)

POSITION_KEYWORDS = (
    "какая у меня должность",
    "кем я работаю",
)

DEPARTMENT_KEYWORDS = (
    "в каком подразделении я работаю",
    "к какому отделу я отношусь",
)

ROLE_KEYWORDS = (
    "какие у меня роли",
    "какая у меня роль",
)

EMAIL_KEYWORDS = (
    "какой у меня email",
    "какой у меня адрес электронной почты",
)

PERMISSION_KEYWORDS = (
    "какие у меня права",
    "что мне доступно",
)

OTHER_USER_KEYWORDS = (
    "кто такой",
    "профиль другого",
    "покажи профиль",
    "данные пользователя",
    "пользователь ",
)


@dataclass(frozen=True)
class UserIdentityCommandResult:
    message: str
    identity_loaded: bool = False
    identity_answered: bool = False


def _normalize_query(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _payload_user_id(payload: dict) -> str:
    return str(payload.get("userId") or "").strip()


def extract_user_identity(payload: dict) -> UserIdentity | None:
    raw = payload.get("userIdentity")
    if isinstance(raw, dict):
        identity = user_identity_from_mapping(raw)
        if identity is not None:
            return identity
    return None


def _identity_matches_current_user(identity: UserIdentity, payload: dict) -> bool:
    current_user_id = _payload_user_id(payload)
    if not current_user_id:
        return True
    return str(identity.userId).strip() == current_user_id


def _is_other_user_query(normalized: str) -> bool:
    if any(keyword in normalized for keyword in OTHER_USER_KEYWORDS):
        if "обо мне" in normalized or normalized.strip() in {"кто я", "кто я?"}:
            return False
        return True
    return False


def is_user_identity_command(query_text: str) -> bool:
    normalized = _normalize_query(query_text)
    if not normalized:
        return False
    if _is_other_user_query(normalized):
        return True
    keyword_groups = (
        WHO_AM_I_KEYWORDS,
        NAME_KEYWORDS,
        POSITION_KEYWORDS,
        DEPARTMENT_KEYWORDS,
        ROLE_KEYWORDS,
        EMAIL_KEYWORDS,
        PERMISSION_KEYWORDS,
    )
    return any(keyword in normalized for group in keyword_groups for keyword in group)


def _missing_field_message(field_label: str) -> str:
    return (
        "Я вижу ваш профиль пользователя платформы, "
        f"но в нём пока не заполнено поле «{field_label}»."
    )


def _format_roles(identity: UserIdentity) -> str:
    if identity.roles:
        return ", ".join(identity.roles)
    return ""


def _build_profile_summary(identity: UserIdentity) -> str:
    display = identity.displayName or identity.firstName or "пользователь платформы"
    lines = [f"Вы — {display}."]
    if identity.email:
        lines.append(f"Email: {identity.email}")
    if identity.position:
        lines.append(f"Должность: {identity.position}")
    if identity.department:
        lines.append(f"Подразделение: {identity.department}")
    roles = _format_roles(identity)
    if roles:
        lines.append(f"Роли: {roles}")
    return "\n".join(lines)


def resolve_user_identity_command(query_text: str, payload: dict) -> UserIdentityCommandResult | None:
    normalized = _normalize_query(query_text)
    if not normalized:
        return None

    if _is_other_user_query(normalized):
        return UserIdentityCommandResult(
            message=(
                "Я могу рассказать только о вашем текущем профиле пользователя платформы, "
                "а не о других пользователях."
            ),
            identity_loaded=True,
            identity_answered=True,
        )

    identity = extract_user_identity(payload)
    if identity is None:
        if not is_user_identity_command(query_text):
            return None
        return UserIdentityCommandResult(
            message=(
                "Профиль текущего пользователя не передан в HostContext. "
                "Войдите в платформу и обновите страницу."
            ),
            identity_loaded=False,
            identity_answered=True,
        )

    if not _identity_matches_current_user(identity, payload):
        return UserIdentityCommandResult(
            message="Профиль в запросе не совпадает с текущим userId.",
            identity_loaded=True,
            identity_answered=True,
        )

    if any(keyword in normalized for keyword in WHO_AM_I_KEYWORDS):
        return UserIdentityCommandResult(
            message=_build_profile_summary(identity),
            identity_loaded=True,
            identity_answered=True,
        )

    if any(keyword in normalized for keyword in NAME_KEYWORDS):
        if identity.displayName or identity.firstName:
            name = identity.displayName or identity.firstName
            return UserIdentityCommandResult(
                message=f"Вас зовут {name}.",
                identity_loaded=True,
                identity_answered=True,
            )
        return UserIdentityCommandResult(
            message=_missing_field_message("имя"),
            identity_loaded=True,
            identity_answered=True,
        )

    if any(keyword in normalized for keyword in POSITION_KEYWORDS):
        if identity.position:
            return UserIdentityCommandResult(
                message=f"Ваша должность: {identity.position}.",
                identity_loaded=True,
                identity_answered=True,
            )
        return UserIdentityCommandResult(
            message=_missing_field_message("должность"),
            identity_loaded=True,
            identity_answered=True,
        )

    if any(keyword in normalized for keyword in DEPARTMENT_KEYWORDS):
        if identity.department:
            return UserIdentityCommandResult(
                message=f"Вы работаете в подразделении: {identity.department}.",
                identity_loaded=True,
                identity_answered=True,
            )
        return UserIdentityCommandResult(
            message=_missing_field_message("подразделение"),
            identity_loaded=True,
            identity_answered=True,
        )

    if any(keyword in normalized for keyword in ROLE_KEYWORDS):
        roles = _format_roles(identity)
        if roles:
            return UserIdentityCommandResult(
                message=f"Ваши роли: {roles}.",
                identity_loaded=True,
                identity_answered=True,
            )
        return UserIdentityCommandResult(
            message=_missing_field_message("роль"),
            identity_loaded=True,
            identity_answered=True,
        )

    if any(keyword in normalized for keyword in EMAIL_KEYWORDS):
        if identity.email:
            return UserIdentityCommandResult(
                message=f"Ваш email: {identity.email}.",
                identity_loaded=True,
                identity_answered=True,
            )
        return UserIdentityCommandResult(
            message=_missing_field_message("email"),
            identity_loaded=True,
            identity_answered=True,
        )

    if any(keyword in normalized for keyword in PERMISSION_KEYWORDS):
        roles = _format_roles(identity)
        if roles:
            return UserIdentityCommandResult(
                message=(
                    f"Доступ определяется вашими ролями платформы: {roles}. "
                    "Детальные права зависят от политик портала для этих ролей."
                ),
                identity_loaded=True,
                identity_answered=True,
            )
        return UserIdentityCommandResult(
            message=(
                "Роль пользователя в профиле не указана — "
                "не могу перечислить права без данных платформы."
            ),
            identity_loaded=True,
            identity_answered=True,
        )

    return None
