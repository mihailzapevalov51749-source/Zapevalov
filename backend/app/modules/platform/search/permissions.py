"""Role-aware search domain permissions."""

from app.modules.users.models import User

CROSS_MODE_SEARCH_ROLES = frozenset(
    {
        "admin",
        "superadmin",
    }
)

SEARCH_DOMAIN_RUNTIME = "runtime"
SEARCH_DOMAIN_DESIGNER = "designer"


def resolve_user_role_name(user: User | None) -> str | None:
    if user is None or user.role is None:
        return None
    role_name = str(user.role.name or "").strip()
    return role_name or None


def can_access_cross_mode_search(user: User | None) -> bool:
    role_name = resolve_user_role_name(user)
    return role_name in CROSS_MODE_SEARCH_ROLES


def resolve_allowed_search_domains(user: User | None) -> list[str]:
    if can_access_cross_mode_search(user):
        return [SEARCH_DOMAIN_RUNTIME, SEARCH_DOMAIN_DESIGNER]
    return [SEARCH_DOMAIN_RUNTIME]


def resolve_effective_search_domains(
    user: User | None,
    *,
    requested_domains: list[str] | None,
    current_mode: str | None,
) -> list[str]:
    allowed = set(resolve_allowed_search_domains(user))
    normalized_requested = [
        str(domain).strip().lower()
        for domain in (requested_domains or [])
        if str(domain).strip()
    ]

    if normalized_requested:
        return [domain for domain in normalized_requested if domain in allowed]

    mode = str(current_mode or "").strip().lower()
    if mode == SEARCH_DOMAIN_DESIGNER and SEARCH_DOMAIN_DESIGNER in allowed:
        return [SEARCH_DOMAIN_DESIGNER, SEARCH_DOMAIN_RUNTIME]

    if SEARCH_DOMAIN_RUNTIME in allowed and SEARCH_DOMAIN_DESIGNER in allowed:
        return [SEARCH_DOMAIN_RUNTIME, SEARCH_DOMAIN_DESIGNER]

    return [SEARCH_DOMAIN_RUNTIME]
