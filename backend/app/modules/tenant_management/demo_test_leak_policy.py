"""Strict demo test-leak identification — technical fields only."""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_management.tenant_write_policy import is_protected_tenant_portal
from app.modules.users.models import User

DEMO_TEST_LEAK_TENANT_CODE_PREFIXES = ("company_", "leak-tenant-", "login-brand-")

STRICT_TEST_USER_EMAIL_PREFIXES = (
    "invite_",
    "company_admin_",
    "global_admin_",
    "existing_global_admin_",
    "new_company_admin_",
    "new_admin_",
    "new_user_",
    "dev_member_user_",
    "dev_member_",
    "owner_recover_",
    "blocked_",
)

STRICT_TEST_USER_EMAIL_SUFFIXES = (
    "@example.com",
    "@example.org",
    "@example.net",
    "@test.local",
    "@client.example",
)


def _normalized_code(portal: Portal) -> str:
    return str(portal.code or "").strip().lower()


def _normalized_status(portal: Portal) -> str:
    return str(portal.tenant_status or TenantStatus.ACTIVE.value).strip().upper()


def _normalized_tenant_type(portal: Portal) -> str:
    return str(portal.tenant_type or "").strip().upper()


def _normalized_environment_role(portal: Portal) -> str:
    return str(portal.environment_role or "").strip().upper()


def is_demo_test_leak_tenant_archive_candidate(portal: Portal) -> bool:
    """Non-archived CLIENT leak tenant that must be archived before hard purge."""
    if is_protected_tenant_portal(portal):
        return False
    if bool(getattr(portal, "is_protected", False)):
        return False
    if _normalized_tenant_type(portal) != TenantType.CLIENT.value:
        return False
    if _normalized_environment_role(portal):
        return False
    code = _normalized_code(portal)
    if not code or not code.startswith(DEMO_TEST_LEAK_TENANT_CODE_PREFIXES):
        return False
    return _normalized_status(portal) != TenantStatus.ARCHIVED.value


def is_demo_test_leak_tenant_candidate(portal: Portal) -> bool:
    """Return True only when all technical leak markers match."""
    if is_protected_tenant_portal(portal):
        return False
    if bool(getattr(portal, "is_protected", False)):
        return False
    if _normalized_tenant_type(portal) != TenantType.CLIENT.value:
        return False
    if _normalized_environment_role(portal):
        return False
    if _normalized_status(portal) != TenantStatus.ARCHIVED.value:
        return False
    code = _normalized_code(portal)
    if not code:
        return False
    return code.startswith(DEMO_TEST_LEAK_TENANT_CODE_PREFIXES)


def demo_test_leak_tenant_reason(portal: Portal) -> str | None:
    if not is_demo_test_leak_tenant_candidate(portal):
        return None
    return (
        "archived_client_leak:"
        f"code={portal.code};status={portal.tenant_status};"
        f"tenant_type={portal.tenant_type};environment_role={portal.environment_role}"
    )


def email_local_part(email: str | None) -> str:
    return str(email or "").split("@", 1)[0].strip().lower()


def matches_strict_demo_test_user_email(email: str | None) -> bool:
    normalized = str(email or "").strip().lower()
    if not normalized:
        return False
    if any(normalized.endswith(suffix) for suffix in STRICT_TEST_USER_EMAIL_SUFFIXES):
        return True
    local = email_local_part(normalized)
    return any(local.startswith(prefix) for prefix in STRICT_TEST_USER_EMAIL_PREFIXES)


def is_demo_test_leak_user_candidate(db: Session, user: User) -> bool:
    from app.modules.user_management.demo_user_inventory import (
        PROTECTED_DEMO_EMAILS,
        is_protected_user,
        resolve_platform_owner_user_id,
    )
    from app.modules.users.bootstrap_owner_service import is_bootstrap_owner

    if bool(getattr(user, "is_hidden_user", False)):
        return False
    if not matches_strict_demo_test_user_email(user.email):
        return False

    email = str(user.email or "").strip().lower()
    owner_id = resolve_platform_owner_user_id(db)
    if owner_id is not None and int(user.id) == int(owner_id):
        return False
    if email in PROTECTED_DEMO_EMAILS:
        return False
    if is_bootstrap_owner(user):
        return False
    if is_protected_user(db, user) and not bool(getattr(user, "is_company_owner", False)):
        return False
    return True


def demo_test_leak_user_reason(db: Session, user: User) -> str | None:
    if not is_demo_test_leak_user_candidate(db, user):
        return None
    return f"strict_test_email:{user.email}"
