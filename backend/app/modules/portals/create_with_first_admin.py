from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.company_database_provisioning.provision_service import (
    build_portal_with_superadmin_response,
    client_company_provisioning,
)
from app.modules.control_plane.customer_companies.schemas import CustomerCompanyCreate
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import PlatformEventJournalSource
from app.modules.platform_event_journal.service import record_platform_event
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.portals.models import Portal
from app.modules.portals.schemas import (
    CompanyFirstAdminCreate,
    CompanySuperadminRead,
    PortalCreateWithFirstAdmin,
    PortalWithSuperadminResponse,
)
from app.modules.tenant_environment.constants import PROVISIONING_TENANT_TYPES, TenantType
from app.modules.users.company_invite_email import send_company_welcome_email
from app.modules.users.models import User


def _validate_first_admin(payload: CompanyFirstAdminCreate) -> None:
    if not str(payload.full_name or "").strip():
        raise HTTPException(status_code=400, detail="ФИО администратора обязательно")
    if not str(payload.email or "").strip():
        raise HTTPException(status_code=400, detail="Email администратора обязателен")


def _ensure_admin_email_globally_available(db: Session, email: str) -> None:
    normalized_email = str(email or "").strip().lower()
    global_exists = (
        db.query(User.id)
        .filter(User.email.ilike(normalized_email))
        .first()
    )
    if global_exists is not None:
        raise HTTPException(status_code=409, detail="Email уже используется")


def get_company_superadmin(db: Session, tenant_id: int) -> CompanySuperadminRead | None:
    from app.modules.tenant_roles.superadmin_service import resolve_company_superadmin_read

    return resolve_company_superadmin_read(db, tenant_id)


def create_portal_with_first_admin(
    db: Session,
    payload: PortalCreateWithFirstAdmin,
    *,
    current_user: User | None = None,
) -> PortalWithSuperadminResponse:
    name = str(payload.name or "").strip()
    tenant_type = payload.tenant_type

    if not name:
        raise HTTPException(status_code=400, detail="Название компании обязательно")

    if tenant_type not in PROVISIONING_TENANT_TYPES:
        raise HTTPException(status_code=400, detail="Недопустимый тип компании")

    _validate_first_admin(payload.first_admin)
    _ensure_admin_email_globally_available(db, payload.first_admin.email)

    try:
        with client_company_provisioning(db, payload) as provisioning_result:
            portal = provisioning_result.portal
            admin_user = provisioning_result.admin_user
            customer_company_id = provisioning_result.customer_company_id
            code = str(portal.code or "")
            admin_name = str(payload.first_admin.full_name).strip()
            admin_email = str(payload.first_admin.email).strip()
            event_slug_suffix = f"{portal.id}-{int(utc_now().timestamp() * 1000)}"

            record_platform_event(
                db,
                event_code=PlatformEventCode.COMPANY_CREATED.value,
                event_category=PlatformEventCategory.COMPANY.value,
                title=f'Создана компания "{name}"',
                description=(
                    f"Создана компания с tenant_id={portal.id}, кодом {code} "
                    f"и базой {provisioning_result.database_name}."
                ),
                status=PlatformAuditStatus.DONE.value,
                source=PlatformEventJournalSource.MANUAL.value,
                actor_user=current_user,
                target_type="company",
                target_id=portal.id,
                target_name=name,
                tenant_id=portal.id,
                company_id=customer_company_id,
                metadata={
                    "tenant_type": tenant_type.value,
                    "portal_code": code,
                    "database_name": provisioning_result.database_name,
                },
                slug=f"company-created-{event_slug_suffix}",
                commit=False,
            )
            record_platform_event(
                db,
                event_code=PlatformEventCode.COMPANY_SUPERADMIN_CREATED.value,
                event_category=PlatformEventCategory.PROVISIONING.value,
                title=f"Создан владелец компании «{name}»",
                description=(
                    "Создан первый пользователь компании с ролью superadmin и признаком owner:\n"
                    f"{admin_name}\n\n"
                    "Email:\n"
                    f"{admin_email}"
                ),
                status=PlatformAuditStatus.DONE.value,
                source=PlatformEventJournalSource.MANUAL.value,
                actor_user=current_user,
                target_type="user",
                target_id=admin_user.id,
                target_name=admin_name,
                tenant_id=portal.id,
                company_id=customer_company_id,
                metadata={
                    "email": admin_email,
                    "role": "superadmin",
                    "is_company_owner": True,
                    "database_name": provisioning_result.database_name,
                },
                slug=f"company-superadmin-created-{event_slug_suffix}",
                commit=False,
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Не удалось выполнить provisioning компании",
        ) from exc

    invitation_sent = send_company_welcome_email(
        db,
        to_email=admin_email,
        company_name=name,
        tenant_id=portal.id,
        login=admin_email,
        temporary_password=provisioning_result.temporary_password,
    )

    record_platform_event(
        db,
        event_code=PlatformEventCode.COMPANY_INVITATION_SENT.value,
        event_category=PlatformEventCategory.PROVISIONING.value,
        title=f"Отправлено приглашение владельцу компании «{name}»",
        description=(
            f"Приглашение отправлено на {admin_email}."
            if invitation_sent
            else "SMTP не настроен — письмо подготовлено, но не отправлено."
        ),
        status=PlatformAuditStatus.DONE.value
        if invitation_sent
        else PlatformAuditStatus.WARNING.value,
        source=PlatformEventJournalSource.MANUAL.value,
        actor_user=current_user,
        target_type="user",
        target_id=admin_user.id,
        target_name=admin_name,
        tenant_id=portal.id,
        company_id=customer_company_id,
        metadata={
            "email": admin_email,
            "invitation_sent": invitation_sent,
            "database_name": provisioning_result.database_name,
        },
        slug=f"company-invitation-sent-{portal.id}-{int(utc_now().timestamp() * 1000)}",
        commit=True,
    )

    return build_portal_with_superadmin_response(
        provisioning_result,
        invitation_sent=invitation_sent,
    )
