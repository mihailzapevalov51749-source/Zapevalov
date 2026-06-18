"""Demo user inventory helpers — protected users and test cleanup discipline."""

from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy.orm import Session, joinedload

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.platform_module_publications.models import PlatformModulePublication
from app.modules.platform_release.models import PlatformRelease
from app.modules.tenant_management.demo_tenant_inventory import resolve_protected_tenant_ids
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.bootstrap_owner_constants import (
    BOOTSTRAP_OWNER_EMAIL,
    BOOTSTRAP_OWNER_FULL_NAME,
    LEGACY_BOOTSTRAP_OWNER_EMAIL,
)

PROTECTED_DEMO_EMAILS = frozenset(
    {
        "zmn8@ya.ru",
    }
)

LEGACY_DEMO_COMPANY_OWNER_EMAIL = "mihailzapevalov51749@gmail.com"
SECONDARY_DEMO_GLOBAL_USER_EMAILS = frozenset(
    {
        "yasno.pro@yandex.ru",
        "nino@yasnopro.ru",
    }
)
from app.modules.users.bootstrap_owner_service import ensure_bootstrap_owner_recovery
from app.modules.users.models import User

TEST_EMAIL_PATTERNS = (
    re.compile(r"^tenant_config_test_", re.I),
    re.compile(r"^quality_iso_", re.I),
    re.compile(r"^journal_iso_", re.I),
    re.compile(r"^company_admin_", re.I),
    re.compile(r"^module_config_", re.I),
    re.compile(r"^tenant_modules_", re.I),
    re.compile(r"^pages_registry_", re.I),
    re.compile(r"^nav_edit_", re.I),
    re.compile(r"^legacy_admin_", re.I),
    re.compile(r"^studio_admin_", re.I),
    re.compile(r"^(create|publish|offer|apply|auto|journal|dev|rev|reviewer)_", re.I),
    re.compile(r"^test_", re.I),
    re.compile(r"^demo_", re.I),
    re.compile(r"^tmp_", re.I),
    re.compile(r"^platform_designer_", re.I),
    re.compile(r"^platform_admin_", re.I),
    re.compile(r"^autotest_", re.I),
    re.compile(r"^pytest_", re.I),
    re.compile(r"@test\.local$", re.I),
    re.compile(r"@example\.(com|org|net)$", re.I),
)

TEST_NAME_MARKERS = (
    "tenant config test",
    "quality iso",
    "journal iso",
    "release test",
    "module config apply test",
    "tenant modules test",
    "pages registry test",
    "nav edit test",
    "legacy admin nav test",
    "studio admin route test",
    "company admin",
)


@dataclass(frozen=True)
class UserInventoryRow:
    id: int
    username: str
    email: str
    full_name: str | None
    tenant: str
    role: str | None
    created_at: str | None
    last_login: str | None
    is_active: bool
    category: str
    reasons: tuple[str, ...]
    safe_to_delete: bool


def email_local_part(email: str | None) -> str:
    return str(email or "").split("@", 1)[0].strip().lower()


def matches_test_email(email: str | None) -> bool:
    normalized = str(email or "").strip().lower()
    if not normalized:
        return False
    local = email_local_part(normalized)
    return any(pattern.search(local) or pattern.search(normalized) for pattern in TEST_EMAIL_PATTERNS)


def matches_test_name(full_name: str | None) -> bool:
    normalized = str(full_name or "").strip().lower()
    return any(marker in normalized for marker in TEST_NAME_MARKERS)


def resolve_platform_owner_user_id(db: Session) -> int | None:
    settings = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings is None or settings.platform_owner_user_id is None:
        return None
    return int(settings.platform_owner_user_id)


def resolve_protected_user_reasons(db: Session, user: User) -> list[str]:
    protected_tenant_ids = set(resolve_protected_tenant_ids(db).keys())
    owner_id = resolve_platform_owner_user_id(db)
    reasons: list[str] = []

    if owner_id is not None and user.id == owner_id:
        reasons.append("platform_owner")

    email = str(user.email or "").strip().lower()
    if email in PROTECTED_DEMO_EMAILS:
        reasons.append("protected_demo_email")
    if email in {BOOTSTRAP_OWNER_EMAIL.lower(), LEGACY_BOOTSTRAP_OWNER_EMAIL.lower()}:
        reasons.append("bootstrap_owner_email")
    if str(user.full_name or "").strip() == BOOTSTRAP_OWNER_FULL_NAME:
        reasons.append("bootstrap_owner_name")
    if email == "zmn8@ya.ru" or "запевалов" in str(user.full_name or "").lower():
        reasons.append("mikhail_zapevalov")
    if bool(getattr(user, "is_system_user", False)):
        reasons.append("system_user")
    if bool(getattr(user, "is_company_owner", False)):
        reasons.append("company_owner")
    if user.tenant_id in protected_tenant_ids and not matches_test_email(user.email) and not matches_test_name(user.full_name):
        reasons.append("protected_demo_tenant_user")

    return reasons


def is_protected_user(db: Session, user: User) -> bool:
    return bool(resolve_protected_user_reasons(db, user))


def is_test_leak_user(db: Session, user: User) -> bool:
    from app.modules.tenant_management.demo_test_leak_policy import is_demo_test_leak_user_candidate

    return is_demo_test_leak_user_candidate(db, user)


def snapshot_visible_user_ids(db: Session) -> set[int]:
    return {
        int(row[0])
        for row in db.query(User.id).filter(User.is_hidden_user.is_(False)).all()
    }


def list_visible_users(db: Session) -> list[User]:
    return (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.is_hidden_user.is_(False))
        .order_by(User.id.asc())
        .all()
    )


def build_user_inventory(db: Session) -> dict:
    from app.modules.portals.models import Portal

    portals = {portal.id: portal for portal in db.query(Portal).all()}
    rows: list[UserInventoryRow] = []
    stats = {"REAL": 0, "TEST": 0, "UNKNOWN": 0}

    for user in list_visible_users(db):
        protected_reasons = resolve_protected_user_reasons(db, user)
        if protected_reasons:
            category = "REAL"
            reasons = tuple(protected_reasons)
            safe = False
            stats["REAL"] += 1
        elif is_test_leak_user(db, user):
            category = "TEST"
            test_reasons = []
            if matches_test_email(user.email):
                test_reasons.append("test_email_pattern")
            if matches_test_name(user.full_name):
                test_reasons.append("test_name_marker")
            if user.last_login_at is None:
                test_reasons.append("never_logged_in")
            reasons = tuple(test_reasons)
            safe = True
            stats["TEST"] += 1
        else:
            category = "UNKNOWN"
            reasons = ("manual_review_required",)
            safe = False
            stats["UNKNOWN"] += 1

        portal = portals.get(user.tenant_id)
        tenant_label = "platform"
        if user.tenant_id is not None:
            tenant_label = " ".join(
                part
                for part in [
                    str(user.tenant_id),
                    str(getattr(portal, "code", "") or "").strip(),
                    str(getattr(portal, "title", "") or "").strip(),
                ]
                if part
            )

        rows.append(
            UserInventoryRow(
                id=user.id,
                username=email_local_part(user.email),
                email=str(user.email or ""),
                full_name=user.full_name,
                tenant=tenant_label,
                role=user.role.name if user.role else None,
                created_at=user.created_at.isoformat() if user.created_at else None,
                last_login=user.last_login_at.isoformat() if user.last_login_at else None,
                is_active=bool(user.is_active),
                category=category,
                reasons=reasons,
                safe_to_delete=safe,
            )
        )

    return {
        "stats": stats,
        "protected_users": [row for row in rows if row.category == "REAL"],
        "test_users": [row for row in rows if row.category == "TEST"],
        "unknown_users": [row for row in rows if row.category == "UNKNOWN"],
        "rows": rows,
    }


def audit_user_dependencies(db: Session, user_ids: list[int]) -> dict[str, int]:
    if not user_ids:
        return {}

    release_fields = (
        PlatformRelease.created_by,
        PlatformRelease.submitted_by,
        PlatformRelease.review_started_by,
        PlatformRelease.approved_by,
        PlatformRelease.changes_requested_by,
        PlatformRelease.published_by,
    )
    release_refs = sum(
        db.query(PlatformRelease).filter(field.in_(user_ids)).count()
        for field in release_fields
    )
    publication_fields = (
        PlatformModulePublication.created_by,
        PlatformModulePublication.reviewed_by,
        PlatformModulePublication.approved_by,
    )
    publication_refs = sum(
        db.query(PlatformModulePublication).filter(field.in_(user_ids)).count()
        for field in publication_fields
    )

    return {
        "memberships": db.query(TenantUserMembership).filter(TenantUserMembership.user_id.in_(user_ids)).count(),
        "platform_release_actor_refs": release_refs,
        "platform_module_publication_actor_refs": publication_refs,
    }


def _null_platform_actor_references(db: Session, user_id: int) -> None:
    release_fields = (
        PlatformRelease.created_by,
        PlatformRelease.submitted_by,
        PlatformRelease.review_started_by,
        PlatformRelease.approved_by,
        PlatformRelease.changes_requested_by,
        PlatformRelease.published_by,
    )
    for field in release_fields:
        db.query(PlatformRelease).filter(field == user_id).update(
            {field: None},
            synchronize_session=False,
        )

    publication_fields = (
        PlatformModulePublication.created_by,
        PlatformModulePublication.reviewed_by,
        PlatformModulePublication.approved_by,
    )
    for field in publication_fields:
        db.query(PlatformModulePublication).filter(field == user_id).update(
            {field: None},
            synchronize_session=False,
        )


def audit_legacy_demo_company_owner_impact(db: Session, user: User) -> dict:
    return _audit_removable_demo_global_user_impact(
        db,
        user,
        allowed_emails={LEGACY_DEMO_COMPANY_OWNER_EMAIL.lower()},
        audit_label="legacy_demo_company_owner",
    )


def audit_secondary_demo_global_user_impact(db: Session, user: User) -> dict:
    return _audit_removable_demo_global_user_impact(
        db,
        user,
        allowed_emails={email.lower() for email in SECONDARY_DEMO_GLOBAL_USER_EMAILS},
        audit_label="secondary_demo_global_user",
    )


def _audit_removable_demo_global_user_impact(
    db: Session,
    user: User,
    *,
    allowed_emails: set[str],
    audit_label: str,
) -> dict:
    from app.modules.portals.models import Portal
    from app.modules.tenant_roles.owner_service import get_company_owner

    email = str(user.email or "").strip().lower()
    if email not in allowed_emails:
        raise ValueError(
            f"Refusing {audit_label} audit for unexpected email id={user.id} email={user.email}"
        )

    owner_id = resolve_platform_owner_user_id(db)
    memberships = (
        db.query(TenantUserMembership, Portal)
        .join(Portal, TenantUserMembership.tenant_id == Portal.id)
        .filter(TenantUserMembership.user_id == user.id)
        .all()
    )
    profiles = (
        db.query(TenantUserProfile)
        .filter(TenantUserProfile.user_id == user.id)
        .all()
    )
    dependencies = audit_user_dependencies(db, [user.id])
    dev_owner = get_company_owner(db, 1)

    return {
        "audit_label": audit_label,
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "status": {
            "is_active": bool(user.is_active),
            "account_status": str(user.account_status or ""),
            "global_status": "active" if bool(user.is_active) else "blocked",
        },
        "tenant_id": user.tenant_id,
        "is_company_owner": bool(user.is_company_owner),
        "is_platform_owner": owner_id == user.id,
        "memberships": [
            {
                "membership_id": membership.id,
                "tenant_id": membership.tenant_id,
                "tenant_name": portal.name,
                "tenant_code": portal.code,
                "role_key": membership.role_key,
                "membership_status": membership.membership_status,
            }
            for membership, portal in memberships
        ],
        "tenant_user_profiles": [
            {
                "profile_id": profile.id,
                "tenant_id": profile.tenant_id,
                "display_name": profile.display_name,
            }
            for profile in profiles
        ],
        "platform_release_actor_refs": dependencies.get("platform_release_actor_refs", 0),
        "platform_module_publication_actor_refs": dependencies.get(
            "platform_module_publication_actor_refs",
            0,
        ),
        "other_dependencies": {
            key: value
            for key, value in dependencies.items()
            if key
            not in {
                "platform_release_actor_refs",
                "platform_module_publication_actor_refs",
            }
        },
        "dev_company_owner_before": (
            {
                "user_id": dev_owner.id,
                "email": dev_owner.email,
                "full_name": dev_owner.full_name,
            }
            if dev_owner is not None
            else None
        ),
        "will_delete": {
            "users": [user.id],
            "tenant_user_memberships": [membership.id for membership, _portal in memberships],
            "tenant_user_profiles": [profile.id for profile in profiles],
        },
        "will_not_touch": {
            "platform_owner_user_id": owner_id,
            "protected_tenant_ids": [1, 2, 21],
        },
    }


def _delete_removable_demo_global_user(
    db: Session,
    user: User,
    *,
    allowed_emails: set[str],
    audit_fn,
) -> dict:
    from app.modules.users.bootstrap_owner_service import is_bootstrap_owner

    email = str(user.email or "").strip().lower()
    if email not in allowed_emails:
        raise ValueError(
            f"Refusing removable demo global user delete id={user.id} email={user.email}"
        )

    owner_id = resolve_platform_owner_user_id(db)
    if owner_id is not None and int(user.id) == int(owner_id):
        raise ValueError(f"Refusing to delete platform owner id={user.id}")

    if is_bootstrap_owner(user):
        raise ValueError(f"Refusing to delete bootstrap owner id={user.id}")

    impact = audit_fn(db, user)
    deleted_user_id = int(user.id)

    _null_platform_actor_references(db, deleted_user_id)
    db.query(TenantUserMembership).filter(TenantUserMembership.user_id == deleted_user_id).delete(
        synchronize_session=False
    )
    db.query(TenantUserProfile).filter(TenantUserProfile.user_id == deleted_user_id).delete(
        synchronize_session=False
    )
    db.delete(user)
    db.flush()

    impact["deleted"] = True
    return impact


def delete_legacy_demo_company_owner_user(db: Session, user: User) -> dict:
    return _delete_removable_demo_global_user(
        db,
        user,
        allowed_emails={LEGACY_DEMO_COMPANY_OWNER_EMAIL.lower()},
        audit_fn=audit_legacy_demo_company_owner_impact,
    )


def delete_secondary_demo_global_user(db: Session, user: User) -> dict:
    return _delete_removable_demo_global_user(
        db,
        user,
        allowed_emails={email.lower() for email in SECONDARY_DEMO_GLOBAL_USER_EMAILS},
        audit_fn=audit_secondary_demo_global_user_impact,
    )


def delete_confirmed_test_user(db: Session, user: User) -> int:
    from app.modules.tenant_management.demo_test_leak_policy import is_demo_test_leak_user_candidate

    if not is_demo_test_leak_user_candidate(db, user):
        raise ValueError(f"Refusing to delete non-test or protected user id={user.id} email={user.email}")

    settings_row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings_row is not None and settings_row.platform_owner_user_id == user.id:
        raise ValueError(f"Refusing to delete platform owner id={user.id}")

    deleted_user_id = user.id
    _null_platform_actor_references(db, deleted_user_id)
    db.delete(user)
    ensure_bootstrap_owner_recovery(db)
    db.flush()
    return deleted_user_id


def cleanup_test_user_leaks(db: Session) -> list[int]:
    deleted_ids: list[int] = []
    for user in list_visible_users(db):
        if not is_test_leak_user(db, user):
            continue
        deleted_ids.append(delete_confirmed_test_user(db, user))
    if deleted_ids:
        db.commit()
    return deleted_ids


class DemoUserInventoryError(RuntimeError):
    pass


def assert_demo_user_inventory(db: Session) -> None:
    from app.modules.tenant_management.demo_environment_audit import assert_demo_environment_clean

    assert_demo_environment_clean(db)
