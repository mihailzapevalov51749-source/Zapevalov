from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import PlatformEventJournalSource
from app.modules.platform_event_journal.service import record_platform_event
from app.modules.portals.create_with_first_admin import get_company_superadmin
from app.modules.portals.models import Portal
from app.modules.portals.schemas import CompanySuperadminRead
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_roles.constants import TENANT_ADMIN, TENANT_ROLE_LABELS, TENANT_SUPERADMIN
from app.modules.tenant_roles.owner_service import assign_company_owner, get_company_owner
from app.modules.tenant_roles.role_registry import resolve_tenant_role_id
from app.modules.tenant_users.administration_service import list_tenant_users
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.bootstrap_owner_constants import USER_ACCOUNT_STATUS_ACTIVE
from app.modules.users.company_invite_email import send_company_superadmin_appointment_email
from app.modules.users.models import User
from app.modules.users.provisioning_credentials import generate_provisioning_password

from .schemas import (
    ChangeCompanyAdministratorRequest,
    CompanyAdministratorActionResponse,
    CompanyTenantUserRead,
    CompanyTenantUsersResponse,
    InviteCompanyAdministratorRequest,
)


def _sync_membership_role(db: Session, *, tenant_id: int, user: User, role_key: str) -> None:
    membership = (
        db.query(TenantUserMembership)
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.user_id == user.id)
        .one_or_none()
    )

    if membership is None:
        membership = TenantUserMembership(
            tenant_id=tenant_id,
            user_id=user.id,
            role_key=role_key,
            is_active=True,
        )
        db.add(membership)
    else:
        membership.role_key = role_key
        membership.is_active = True
        db.add(membership)


def _get_manageable_portal(db: Session, tenant_id: int) -> Portal:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        raise HTTPException(status_code=404, detail="Компания не найдена")

    status = str(portal.tenant_status or TenantStatus.ACTIVE.value).upper()
    if status == TenantStatus.ARCHIVED.value:
        raise HTTPException(
            status_code=400,
            detail="Нельзя изменить администратора архивной компании",
        )

    if portal.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Нельзя изменить администратора неактивной компании",
        )

    return portal


def _serialize_tenant_user(user: User) -> CompanyTenantUserRead:
    role_name = user.role.name if user.role else "user"
    return CompanyTenantUserRead(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=role_name,
        role_label=TENANT_ROLE_LABELS.get(role_name, role_name),
        is_active=bool(user.is_active),
        is_company_owner=bool(getattr(user, "is_company_owner", False)),
    )


def list_company_tenant_users(db: Session, tenant_id: int) -> CompanyTenantUsersResponse:
    _get_manageable_portal(db, tenant_id)
    users = list_tenant_users(db, tenant_id)
    return CompanyTenantUsersResponse(
        items=[_serialize_tenant_user(user) for user in users],
    )


def _demote_previous_owner(
    db: Session,
    *,
    tenant_id: int,
    previous_owner: User | None,
    new_owner_id: int,
) -> int | None:
    if previous_owner is None or previous_owner.id == new_owner_id:
        return None

    admin_role_id = resolve_tenant_role_id(db, TENANT_ADMIN)
    previous_owner.role_id = admin_role_id
    previous_owner.is_company_owner = False
    db.add(previous_owner)
    _sync_membership_role(db, tenant_id=tenant_id, user=previous_owner, role_key=TENANT_ADMIN)
    return previous_owner.id


def _promote_company_superadmin(
    db: Session,
    *,
    tenant_id: int,
    user: User,
) -> User:
    superadmin_role_id = resolve_tenant_role_id(db, TENANT_SUPERADMIN)
    user.role_id = superadmin_role_id
    db.add(user)
    _sync_membership_role(db, tenant_id=tenant_id, user=user, role_key=TENANT_SUPERADMIN)
    return assign_company_owner(db, tenant_id=tenant_id, user=user, commit=False)


def change_company_administrator(
    db: Session,
    *,
    tenant_id: int,
    payload: ChangeCompanyAdministratorRequest,
    current_user: User | None = None,
) -> CompanyAdministratorActionResponse:
    portal = _get_manageable_portal(db, tenant_id)
    users = list_tenant_users(db, tenant_id)
    if not users:
        raise HTTPException(
            status_code=409,
            detail="В компании нет пользователей. Используйте приглашение.",
        )

    target_user = next((user for user in users if user.id == payload.user_id), None)
    if target_user is None:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден в этой компании",
        )

    previous_owner = get_company_owner(db, tenant_id)
    if previous_owner is not None and previous_owner.id == target_user.id:
        superadmin = get_company_superadmin(db, tenant_id)
        if superadmin is None:
            raise HTTPException(status_code=500, detail="Не удалось определить администратора компании")
        return CompanyAdministratorActionResponse(company_superadmin=superadmin)

    old_admin_user_id = _demote_previous_owner(
        db,
        tenant_id=tenant_id,
        previous_owner=previous_owner,
        new_owner_id=target_user.id,
    )
    _promote_company_superadmin(db, tenant_id=tenant_id, user=target_user)

    event_slug_suffix = f"{tenant_id}-{int(utc_now().timestamp() * 1000)}"
    record_platform_event(
        db,
        event_code=PlatformEventCode.COMPANY_ADMINISTRATOR_CHANGED.value,
        event_category=PlatformEventCategory.COMPANY.value,
        title=f"Сменён администратор компании «{portal.name}»",
        description=(
            f"Назначен новый суперадминистратор компании «{portal.name}» "
            f"(user_id={target_user.id})."
        ),
        status=PlatformAuditStatus.DONE.value,
        source=PlatformEventJournalSource.MANUAL.value,
        actor_user=current_user,
        target_type="user",
        target_id=target_user.id,
        target_name=target_user.full_name or target_user.email,
        tenant_id=tenant_id,
        metadata={
            "tenant_id": tenant_id,
            "tenant_name": portal.name,
            "old_admin_user_id": old_admin_user_id,
            "new_admin_user_id": target_user.id,
        },
        slug=f"company-administrator-changed-{event_slug_suffix}",
        commit=False,
    )

    db.commit()

    superadmin = get_company_superadmin(db, tenant_id)
    if superadmin is None:
        raise HTTPException(status_code=500, detail="Не удалось определить администратора компании")

    return CompanyAdministratorActionResponse(company_superadmin=superadmin)


def invite_company_administrator(
    db: Session,
    *,
    tenant_id: int,
    payload: InviteCompanyAdministratorRequest,
    current_user: User | None = None,
) -> CompanyAdministratorActionResponse:
    portal = _get_manageable_portal(db, tenant_id)
    users = list_tenant_users(db, tenant_id)
    if users:
        raise HTTPException(
            status_code=409,
            detail="В компании уже есть пользователи. Выберите существующего пользователя.",
        )

    full_name = str(payload.full_name or "").strip()
    email = str(payload.email or "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="ФИО обязательно")
    if not email:
        raise HTTPException(status_code=400, detail="Email обязателен")

    normalized_email = email.lower()
    existing = (
        db.query(User.id)
        .filter(User.email.ilike(normalized_email))
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email уже используется")

    temporary_password = generate_provisioning_password()
    admin_user = User(
        email=email,
        full_name=full_name,
        phone=str(payload.phone or "").strip() or None,
        position=str(payload.position or "").strip() or None,
        hashed_password=hash_password(temporary_password),
        is_active=True,
        tenant_id=tenant_id,
        role_id=resolve_tenant_role_id(db, TENANT_SUPERADMIN),
        is_company_owner=True,
        account_status=USER_ACCOUNT_STATUS_ACTIVE,
    )
    db.add(admin_user)
    db.flush()

    _sync_membership_role(
        db,
        tenant_id=tenant_id,
        user=admin_user,
        role_key=TENANT_SUPERADMIN,
    )
    assign_company_owner(db, tenant_id=tenant_id, user=admin_user, commit=False)

    event_slug_suffix = f"{tenant_id}-{int(utc_now().timestamp() * 1000)}"
    record_platform_event(
        db,
        event_code=PlatformEventCode.COMPANY_SUPERADMIN_INVITED.value,
        event_category=PlatformEventCategory.PROVISIONING.value,
        title=f"Приглашён суперадминистратор компании «{portal.name}»",
        description=(
            f"Отправлено приглашение суперадминистратору компании «{portal.name}» "
            f"на {email}."
        ),
        status=PlatformAuditStatus.DONE.value,
        source=PlatformEventJournalSource.MANUAL.value,
        actor_user=current_user,
        target_type="user",
        target_id=admin_user.id,
        target_name=full_name,
        tenant_id=tenant_id,
        metadata={
            "tenant_id": tenant_id,
            "tenant_name": portal.name,
            "email": email,
        },
        slug=f"company-superadmin-invited-{event_slug_suffix}",
        commit=False,
    )

    db.commit()
    db.refresh(admin_user)

    invitation_sent = send_company_superadmin_appointment_email(
        to_email=email,
        company_name=portal.name,
        tenant_id=tenant_id,
        login=email,
        temporary_password=temporary_password,
    )

    superadmin = get_company_superadmin(db, tenant_id)
    if superadmin is None:
        raise HTTPException(status_code=500, detail="Не удалось определить администратора компании")

    return CompanyAdministratorActionResponse(
        company_superadmin=superadmin,
        invitation_sent=invitation_sent,
    )
