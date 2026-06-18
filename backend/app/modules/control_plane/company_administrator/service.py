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

from app.modules.tenant_environment.constants import TenantStatus

from app.modules.tenant_roles.constants import TENANT_ROLE_LABELS, TENANT_SUPERADMIN

from app.modules.tenant_roles.superadmin_service import (

    assign_tenant_superadmin,

    demote_other_tenant_superadmins,

    user_is_active_tenant_superadmin,

)

from app.modules.tenant_users.administration_service import list_tenant_users

from app.modules.tenant_users.constants import MEMBERSHIP_STATUS_ACTIVE, MEMBERSHIP_STATUS_DISMISSED

from app.modules.tenant_users.membership_service import (

    find_global_user_by_email,

    get_tenant_membership,

    normalize_email,

)

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





def _get_manageable_portal(db: Session, tenant_id: int) -> Portal:

    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()

    if portal is None:

        raise HTTPException(status_code=404, detail="Компания не найдена")



    status = str(portal.tenant_status or TenantStatus.ACTIVE.value).upper()

    if status == TenantStatus.ARCHIVED.value:

        raise HTTPException(

            status_code=400,

            detail="Нельзя изменить Superadmin архивной компании",

        )



    if portal.is_active is False:

        raise HTTPException(

            status_code=400,

            detail="Нельзя изменить Superadmin неактивной компании",

        )



    return portal





def _serialize_tenant_user(user: dict) -> CompanyTenantUserRead:

    role_name = str(user.get("role") or "user")

    return CompanyTenantUserRead(

        user_id=int(user["id"]),

        full_name=user.get("full_name") or user.get("display_name"),

        email=str(user["email"]),

        phone=user.get("phone"),

        role=role_name,

        role_label=TENANT_ROLE_LABELS.get(role_name, role_name),

        is_active=bool(user.get("is_active")),

        is_company_owner=bool(user.get("is_company_owner")),

    )





def list_company_tenant_users(db: Session, tenant_id: int) -> CompanyTenantUsersResponse:

    _get_manageable_portal(db, tenant_id)

    users = list_tenant_users(db, tenant_id)

    return CompanyTenantUsersResponse(

        items=[_serialize_tenant_user(user) for user in users],

    )





def _raise_existing_membership_conflict(

    db: Session,

    *,

    tenant_id: int,

    user: User,

    membership,

) -> None:

    if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_ACTIVE:

        if user_is_active_tenant_superadmin(db, tenant_id=tenant_id, user=user):

            raise HTTPException(

                status_code=409,

                detail="Пользователь уже назначен Superadmin",

            )

        raise HTTPException(

            status_code=409,

            detail="Пользователь уже состоит в компании",

        )





def _create_company_superadmin_user(

    db: Session,

    *,

    tenant_id: int,

    email: str,

    full_name: str,

    phone: str | None,

    position: str | None,

) -> tuple[User, str]:

    temporary_password = generate_provisioning_password()

    admin_user = User(

        email=email,

        full_name=full_name,

        phone=phone,

        position=position,

        hashed_password=hash_password(temporary_password),

        is_active=True,

        tenant_id=None,

        role_id=None,

        is_company_owner=False,

        account_status=USER_ACCOUNT_STATUS_ACTIVE,

    )

    db.add(admin_user)

    db.flush()



    assign_tenant_superadmin(

        db,

        tenant_id=tenant_id,

        user=admin_user,

        profile_payload={

            "full_name": full_name,

            "phone": phone,

            "position": position,

        },

    )

    return admin_user, temporary_password





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

            detail="В компании нет пользователей. Используйте назначение Superadmin.",

        )



    target_summary = next((user for user in users if user["id"] == payload.user_id), None)

    if target_summary is None:

        raise HTTPException(

            status_code=404,

            detail="Пользователь не найден в этой компании",

        )



    target_user = db.query(User).filter(User.id == payload.user_id).one_or_none()

    if target_user is None:

        raise HTTPException(

            status_code=404,

            detail="Пользователь не найден в этой компании",

        )



    if user_is_active_tenant_superadmin(db, tenant_id=tenant_id, user=target_user):

        superadmin = get_company_superadmin(db, tenant_id)

        if superadmin is None:

            raise HTTPException(status_code=500, detail="Не удалось определить Superadmin компании")

        return CompanyAdministratorActionResponse(company_superadmin=superadmin)



    old_superadmin_membership = get_tenant_membership(

        db,

        tenant_id=tenant_id,

        user_id=target_user.id,

    )

    old_superadmin_user_id = None

    current_superadmin = get_company_superadmin(db, tenant_id)

    if current_superadmin is not None:

        old_superadmin_user_id = current_superadmin.user_id



    assign_tenant_superadmin(db, tenant_id=tenant_id, user=target_user)



    event_slug_suffix = f"{tenant_id}-{int(utc_now().timestamp() * 1000)}"

    record_platform_event(

        db,

        event_code=PlatformEventCode.COMPANY_ADMINISTRATOR_CHANGED.value,

        event_category=PlatformEventCategory.COMPANY.value,

        title=f"Сменён Superadmin компании «{portal.name}»",

        description=(

            f"Назначен Superadmin компании «{portal.name}» "

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

            "old_superadmin_user_id": old_superadmin_user_id,

            "old_admin_user_id": old_superadmin_user_id,

            "new_superadmin_user_id": target_user.id,

            "new_admin_user_id": target_user.id,

            "previous_membership_id": (

                old_superadmin_membership.id if old_superadmin_membership is not None else None

            ),

        },

        slug=f"company-superadmin-changed-{event_slug_suffix}",

        commit=False,

    )



    db.commit()



    superadmin = get_company_superadmin(db, tenant_id)

    if superadmin is None:

        raise HTTPException(status_code=500, detail="Не удалось определить Superadmin компании")



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



    normalized_email = normalize_email(email)

    phone = str(payload.phone or "").strip() or None

    position = str(payload.position or "").strip() or None

    profile_payload = {

        "full_name": full_name,

        "phone": phone,

        "position": position,

    }



    existing_user = find_global_user_by_email(db, normalized_email)

    temporary_password: str | None = None

    invitation_sent = False



    if existing_user is None:

        admin_user, temporary_password = _create_company_superadmin_user(

            db,

            tenant_id=tenant_id,

            email=email,

            full_name=full_name,

            phone=phone,

            position=position,

        )

    else:

        membership = get_tenant_membership(

            db,

            tenant_id=tenant_id,

            user_id=existing_user.id,

        )

        _raise_existing_membership_conflict(

            db,

            tenant_id=tenant_id,

            user=existing_user,

            membership=membership,

        )

        demote_other_tenant_superadmins(

            db,

            tenant_id=tenant_id,

            keep_user_id=existing_user.id,

        )

        admin_user = assign_tenant_superadmin(

            db,

            tenant_id=tenant_id,

            user=existing_user,

            profile_payload=profile_payload,

        )



    event_slug_suffix = f"{tenant_id}-{int(utc_now().timestamp() * 1000)}"

    record_platform_event(

        db,

        event_code=PlatformEventCode.COMPANY_SUPERADMIN_INVITED.value,

        event_category=PlatformEventCategory.PROVISIONING.value,

        title=f"Назначен Superadmin компании «{portal.name}»",

        description=(

            f"Отправлено приглашение Superadmin компании «{portal.name}» "

            f"на {email}."

            if existing_user is None

            else (

                f"Назначен существующий пользователь Superadmin компании "

                f"«{portal.name}» ({email})."

            )

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

            "existing_user": existing_user is not None,

        },

        slug=f"company-superadmin-invited-{event_slug_suffix}",

        commit=False,

    )



    db.commit()

    db.refresh(admin_user)



    if temporary_password is not None:

        invitation_sent = send_company_superadmin_appointment_email(
            db,
            to_email=email,

            company_name=portal.name,

            tenant_id=tenant_id,

            login=email,

            temporary_password=temporary_password,

        )



    superadmin = get_company_superadmin(db, tenant_id)

    if superadmin is None:

        raise HTTPException(status_code=500, detail="Не удалось определить Superadmin компании")



    return CompanyAdministratorActionResponse(

        company_superadmin=superadmin,

        invitation_sent=invitation_sent,

    )

