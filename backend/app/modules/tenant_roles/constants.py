"""Canonical tenant system roles and access role sets."""

from __future__ import annotations

TENANT_SUPERADMIN = "superadmin"
TENANT_ADMIN = "admin"
TENANT_USER = "user"

TENANT_SYSTEM_ROLES = frozenset(
    {
        TENANT_SUPERADMIN,
        TENANT_ADMIN,
        TENANT_USER,
    }
)

TENANT_DESIGNER_ROLES = frozenset(
    {
        TENANT_SUPERADMIN,
        TENANT_ADMIN,
    }
)

TENANT_ADMINISTRATION_ROLES = frozenset({TENANT_SUPERADMIN})
TENANT_USER_MANAGEMENT_ROLES = frozenset({TENANT_SUPERADMIN})

TENANT_ROLE_LABELS: dict[str, str] = {
    TENANT_SUPERADMIN: "Суперадминистратор",
    TENANT_ADMIN: "Администратор",
    TENANT_USER: "Пользователь",
}

TENANT_ROLE_DESCRIPTIONS: dict[str, str] = {
    TENANT_SUPERADMIN: "Полный доступ внутри компании, включая администрирование.",
    TENANT_ADMIN: "Доступ к Designer Studio и рабочим функциям без администрирования компании.",
    TENANT_USER: "Доступ только к разрешённым рабочим пространствам и объектам.",
}

LEGACY_TENANT_ROLE_ALIASES: dict[str, str] = {
    "company_superadmin": TENANT_SUPERADMIN,
    "company_super_admin": TENANT_SUPERADMIN,
    "tenant_admin": TENANT_ADMIN,
    "company_admin": TENANT_ADMIN,
}

FORBIDDEN_TENANT_SYSTEM_ROLES = frozenset(
    {
        "tenant_admin",
        "company_superadmin",
        "company_super_admin",
        "platform_designer",
        "platform_architect",
        "platform_admin",
        "designer",
        "owner",
        "manager",
        "editor",
    }
)

PLATFORM_DESIGNER_ROLES = frozenset(
    {
        TENANT_SUPERADMIN,
        TENANT_ADMIN,
        "platform_designer",
        "platform_architect",
    }
)
