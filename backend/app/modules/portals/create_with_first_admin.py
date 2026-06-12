from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.modules.control_plane.customer_companies.schemas import CustomerCompanyCreate
from app.modules.control_plane.customer_companies.service import create_customer_company
from app.modules.platform.designer.publish.service import publish_tenant_catalog
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
from app.modules.tenant_bootstrap import clone_tenant_structure
from app.modules.tenant_bootstrap.clone_tenant_structure import CloneTenantStructureResult
from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    PROVISIONING_TENANT_TYPES,
    TenantStatus,
    TenantType,
)
from app.modules.tenant_environment.resolver import resolve_template_tenant_id
from app.modules.tenant_roles.constants import TENANT_ROLE_LABELS, TENANT_SUPERADMIN
from app.modules.tenant_roles.owner_service import assign_company_owner, get_company_owner
from app.modules.tenant_roles.role_registry import resolve_tenant_role_id
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.bootstrap_owner_constants import USER_ACCOUNT_STATUS_ACTIVE
from app.modules.users.company_invite_email import send_company_welcome_email
from app.modules.users.models import User
from app.modules.users.provisioning_credentials import generate_provisioning_password
from app.shared.platform_keys import generate_platform_key, is_valid_platform_key


def _resolve_bootstrap_source_tenant_id(db: Session, requested: int | None) -> int | None:
    if requested is not None:
        return requested
    return resolve_template_tenant_id(db)


def _template_version_for_source(db: Session, source_tenant_id: int | None) -> str:
    if source_tenant_id is None:
        return DEFAULT_TEMPLATE_VERSION

    source = db.query(Portal).filter(Portal.id == source_tenant_id).one_or_none()
    if source is None or not source.template_version:
        return DEFAULT_TEMPLATE_VERSION
    return str(source.template_version)


def _collect_existing_portal_codes(db: Session) -> list[str]:
    return [
        str(row[0])
        for row in db.query(Portal.code).filter(Portal.code.isnot(None)).all()
        if row[0]
    ]


def _resolve_unique_portal_code(db: Session, company_name: str) -> str:
    code = generate_platform_key(company_name, _collect_existing_portal_codes(db))
    if not is_valid_platform_key(code):
        raise HTTPException(status_code=500, detail="Не удалось сформировать код компании")
    return code


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
    user = get_company_owner(db, tenant_id)
    if user is None:
        return None

    role_name = user.role.name if user.role else TENANT_SUPERADMIN

    return CompanySuperadminRead(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        position=user.position,
        is_active=bool(user.is_active),
        last_login_at=user.last_login_at,
        role=role_name,
        role_label=TENANT_ROLE_LABELS.get(role_name, role_name),
        is_owner=True,
    )


def _serialize_portal_with_superadmin(
    db: Session,
    portal: Portal,
    *,
    clone_result: CloneTenantStructureResult | None = None,
    customer_company_id: int | None = None,
    invitation_sent: bool = False,
) -> PortalWithSuperadminResponse:
    return PortalWithSuperadminResponse(
        id=portal.id,
        name=portal.name,
        code=portal.code,
        description=portal.description,
        is_active=portal.is_active,
        created_at=portal.created_at,
        tenant_type=TenantType(portal.tenant_type),
        template_version=str(portal.template_version or DEFAULT_TEMPLATE_VERSION),
        tenant_status=TenantStatus(portal.tenant_status),
        source_tenant_id=portal.source_tenant_id,
        notes=portal.notes,
        structure_cloned_from=(
            clone_result.source_tenant_id if clone_result is not None else None
        ),
        catalog_version=(
            clone_result.catalog_version if clone_result is not None else None
        ),
        company_superadmin=get_company_superadmin(db, portal.id),
        customer_company_id=customer_company_id,
        invitation_sent=invitation_sent,
    )


def create_portal_with_first_admin(
    db: Session,
    payload: PortalCreateWithFirstAdmin,
    *,
    current_user: User | None = None,
) -> PortalWithSuperadminResponse:
    name = str(payload.name or "").strip()
    description = str(payload.description or "").strip() or None
    tenant_type = payload.tenant_type

    if not name:
        raise HTTPException(status_code=400, detail="Название компании обязательно")

    if tenant_type not in PROVISIONING_TENANT_TYPES:
        raise HTTPException(status_code=400, detail="Недопустимый тип компании")

    _validate_first_admin(payload.first_admin)
    _ensure_admin_email_globally_available(db, payload.first_admin.email)

    code = _resolve_unique_portal_code(db, name)
    source_tenant_id = _resolve_bootstrap_source_tenant_id(db, payload.bootstrap_from_tenant_id)
    temporary_password = generate_provisioning_password()

    portal = Portal(
        name=name,
        code=code,
        description=description,
        tenant_type=tenant_type.value,
        template_version=_template_version_for_source(db, source_tenant_id),
        tenant_status=TenantStatus.ACTIVE.value,
        source_tenant_id=source_tenant_id,
    )
    db.add(portal)

    clone_result: CloneTenantStructureResult | None = None
    customer_company_id: int | None = None
    admin_user: User | None = None

    try:
        db.flush()

        if source_tenant_id is not None:
            clone_result = clone_tenant_structure(
                db,
                source_tenant_id,
                portal.id,
                auto_publish=False,
                commit=False,
            )

        customer_company = create_customer_company(
            db,
            payload=CustomerCompanyCreate(
                name=name,
                primary_portal_id=portal.id,
            ),
            commit=False,
        )
        customer_company_id = customer_company.id

        admin = payload.first_admin
        admin_user = User(
            email=str(admin.email).strip(),
            full_name=str(admin.full_name).strip(),
            phone=str(admin.phone or "").strip() or None,
            position=str(admin.position or "").strip() or None,
            hashed_password=hash_password(temporary_password),
            is_active=True,
            tenant_id=portal.id,
            role_id=resolve_tenant_role_id(db, TENANT_SUPERADMIN),
            is_company_owner=True,
            account_status=USER_ACCOUNT_STATUS_ACTIVE,
        )
        db.add(admin_user)
        db.flush()
        assign_company_owner(
            db,
            tenant_id=portal.id,
            user=admin_user,
            commit=False,
        )

        membership = TenantUserMembership(
            tenant_id=portal.id,
            user_id=admin_user.id,
            role_key=TENANT_SUPERADMIN,
            is_active=True,
        )
        db.add(membership)
        db.flush()

        admin_name = str(admin.full_name).strip()
        admin_email = str(admin.email).strip()
        event_slug_suffix = f"{portal.id}-{int(utc_now().timestamp() * 1000)}"

        record_platform_event(
            db,
            event_code=PlatformEventCode.COMPANY_CREATED.value,
            event_category=PlatformEventCategory.COMPANY.value,
            title=f'Создана компания "{name}"',
            description=(
                f"Создана компания с tenant_id={portal.id} и кодом {code}."
            ),
            status=PlatformAuditStatus.DONE.value,
            source=PlatformEventJournalSource.MANUAL.value,
            actor_user=current_user,
            target_type="company",
            target_id=portal.id,
            target_name=name,
            tenant_id=portal.id,
            company_id=customer_company_id,
            metadata={"tenant_type": tenant_type.value, "portal_code": code},
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
                "role": TENANT_SUPERADMIN,
                "is_company_owner": True,
            },
            slug=f"company-superadmin-created-{event_slug_suffix}",
            commit=False,
        )

        db.commit()
        db.refresh(portal)

        if source_tenant_id is not None:
            publish_result = publish_tenant_catalog(db, portal.id, current_user)
            if clone_result is not None:
                clone_result = CloneTenantStructureResult(
                    source_tenant_id=clone_result.source_tenant_id,
                    target_tenant_id=clone_result.target_tenant_id,
                    pages_cloned=clone_result.pages_cloned,
                    navigation_items_cloned=clone_result.navigation_items_cloned,
                    object_types_cloned=clone_result.object_types_cloned,
                    workspaces_cloned=clone_result.workspaces_cloned,
                    designer_system_menu_settings_cloned=clone_result.designer_system_menu_settings_cloned,
                    catalog_version=publish_result.catalog_version,
                )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Не удалось выполнить provisioning компании",
        ) from exc

    invitation_sent = send_company_welcome_email(
        to_email=str(payload.first_admin.email).strip(),
        company_name=name,
        tenant_id=portal.id,
        login=str(payload.first_admin.email).strip(),
        temporary_password=temporary_password,
    )

    record_platform_event(
        db,
        event_code=PlatformEventCode.COMPANY_INVITATION_SENT.value,
        event_category=PlatformEventCategory.PROVISIONING.value,
        title=f"Отправлено приглашение владельцу компании «{name}»",
        description=(
            f"Приглашение отправлено на {str(payload.first_admin.email).strip()}."
            if invitation_sent
            else "SMTP не настроен — письмо подготовлено, но не отправлено."
        ),
        status=PlatformAuditStatus.DONE.value
        if invitation_sent
        else PlatformAuditStatus.WARNING.value,
        source=PlatformEventJournalSource.MANUAL.value,
        actor_user=current_user,
        target_type="user",
        target_id=admin_user.id if admin_user is not None else None,
        target_name=str(payload.first_admin.full_name).strip(),
        tenant_id=portal.id,
        company_id=customer_company_id,
        metadata={
            "email": str(payload.first_admin.email).strip(),
            "invitation_sent": invitation_sent,
        },
        slug=f"company-invitation-sent-{portal.id}-{int(utc_now().timestamp() * 1000)}",
        commit=True,
    )

    return _serialize_portal_with_superadmin(
        db,
        portal,
        clone_result=clone_result,
        customer_company_id=customer_company_id,
        invitation_sent=invitation_sent,
    )
