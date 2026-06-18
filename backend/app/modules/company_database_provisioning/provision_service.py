"""Provision a new CLIENT company in its own database cloned from TEMPLATE."""

from __future__ import annotations

from dataclasses import dataclass

from contextlib import contextmanager
from typing import Iterator

from fastapi import HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app.modules.company_database_provisioning.provisioning_consistency import (
    cleanup_failed_company_provisioning,
    finalize_client_company_provisioning,
)

from app.modules.company_database_provisioning.naming import build_company_database_name
from app.modules.auth.security import hash_password
from app.modules.company_database_provisioning.database_admin import (
    CompanyDatabaseAdminError,
    create_company_database_from_template,
)
from app.modules.company_database_provisioning.database_urls import build_database_url
from app.modules.control_plane.customer_companies.catalog_fields import apply_catalog_metadata
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.customer_companies.schemas import CustomerCompanyCreate
from app.modules.platform.designer.publish.service import publish_tenant_catalog
from app.modules.portals.models import Portal
from app.modules.portals.public_slug_service import resolve_portal_public_slug_for_create
from app.modules.portals.schemas import (
    CompanyFirstAdminCreate,
    CompanySuperadminRead,
    PortalCreateWithFirstAdmin,
    PortalWithSuperadminResponse,
)
from app.modules.tenant_bootstrap.minimal_runtime_shell import resolve_tenant_home_page_id
from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantStatus,
    TenantType,
)
from app.modules.tenant_environment.resolver import resolve_template_tenant_id
from app.modules.tenant_roles.constants import TENANT_SUPERADMIN
from app.modules.tenant_roles.superadmin_service import assign_tenant_superadmin
from app.modules.users.bootstrap_owner_constants import USER_ACCOUNT_STATUS_ACTIVE
from app.modules.users.models import User
from app.modules.users.provisioning_credentials import generate_provisioning_password
from app.shared.platform_keys import generate_platform_key, is_valid_platform_key


@dataclass(frozen=True)
class CompanyProvisioningResult:
    portal: Portal
    database_name: str
    home_page_id: int
    customer_company_id: int
    admin_user: User
    temporary_password: str
    template_tenant_id: int


def collect_existing_company_codes(db: Session) -> list[str]:
    codes: list[str] = []
    for row in db.query(CustomerCompany.code).filter(CustomerCompany.code.isnot(None)).all():
        if row[0]:
            codes.append(str(row[0]))
    for row in db.query(Portal.code).filter(Portal.code.isnot(None)).all():
        if row[0]:
            codes.append(str(row[0]))
    return codes


def resolve_unique_company_code(db: Session, company_name: str) -> str:
    code = generate_platform_key(company_name, collect_existing_company_codes(db))
    if not is_valid_platform_key(code):
        raise HTTPException(status_code=500, detail="Не удалось сформировать код компании")
    return code


def _open_company_session(database_name: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(build_database_url(database_name))
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine, factory, factory()


def _personalize_cloned_portal(
    company_db: Session,
    *,
    template_tenant_id: int,
    company_name: str,
    company_code: str,
    description: str | None,
) -> Portal:
    portal = (
        company_db.query(Portal)
        .filter(Portal.id == template_tenant_id)
        .one_or_none()
    )
    if portal is None:
        raise HTTPException(
            status_code=500,
            detail="TEMPLATE portal not found in company database",
        )

    portal.name = company_name
    portal.original_name = company_name
    portal.code = company_code
    portal.description = description
    portal.tenant_type = TenantType.CLIENT.value
    portal.environment_role = None
    portal.tenant_status = TenantStatus.ACTIVE.value
    portal.source_tenant_id = template_tenant_id
    portal.public_slug = resolve_portal_public_slug_for_create(
        company_db,
        short_name=None,
        company_name=company_name,
    )
    portal.public_slug_locked = False
    company_db.add(portal)
    company_db.flush()
    return portal


def _create_company_admin(
    company_db: Session,
    *,
    tenant_id: int,
    admin: CompanyFirstAdminCreate,
    temporary_password: str,
) -> User:
    admin_user = User(
        email=str(admin.email).strip(),
        full_name=str(admin.full_name).strip(),
        phone=str(admin.phone or "").strip() or None,
        position=str(admin.position or "").strip() or None,
        hashed_password=hash_password(temporary_password),
        is_active=True,
        tenant_id=None,
        role_id=None,
        is_company_owner=False,
        account_status=USER_ACCOUNT_STATUS_ACTIVE,
    )
    company_db.add(admin_user)
    company_db.flush()
    assign_tenant_superadmin(
        company_db,
        tenant_id=tenant_id,
        user=admin_user,
        profile_payload={
            "full_name": admin_user.full_name,
            "phone": admin_user.phone,
            "position": admin_user.position,
        },
    )
    return admin_user


def _register_catalog_entry(
    cp_db: Session,
    *,
    payload: CustomerCompanyCreate,
    portal: Portal,
    database_name: str,
    home_page_id: int,
) -> CustomerCompany:
    company = CustomerCompany(
        name=payload.name.strip(),
        status=payload.status.value,
        primary_portal_id=None,
        users_limit=payload.users_limit,
        sales_owner_id=payload.sales_owner_id,
        support_owner_id=payload.support_owner_id,
    )
    apply_catalog_metadata(
        company,
        portal_id=int(portal.id),
        database_name=database_name,
        code=portal.code,
        tenant_type=str(portal.tenant_type or TenantType.CLIENT.value),
        environment_role=portal.environment_role,
        tenant_status=str(portal.tenant_status or TenantStatus.ACTIVE.value),
        original_name=str(portal.original_name or portal.name),
        name=str(portal.name),
        short_name=portal.short_name,
        public_slug=portal.public_slug,
        template_version=str(portal.template_version or DEFAULT_TEMPLATE_VERSION),
        platform_version=None,
        home_page_id=home_page_id,
    )
    cp_db.add(company)
    cp_db.flush()
    return company


def _serialize_superadmin(admin_user: User) -> CompanySuperadminRead:
    return CompanySuperadminRead(
        user_id=admin_user.id,
        full_name=admin_user.full_name,
        email=admin_user.email,
        phone=admin_user.phone,
        position=admin_user.position,
        is_active=bool(admin_user.is_active),
        role=TENANT_SUPERADMIN,
        role_label="Суперадминистратор",
        is_owner=True,
    )


def provision_client_company_in_dedicated_database(
    cp_db: Session,
    payload: PortalCreateWithFirstAdmin,
) -> CompanyProvisioningResult:
    with client_company_provisioning(cp_db, payload) as result:
        return result


@contextmanager
def client_company_provisioning(
    cp_db: Session,
    payload: PortalCreateWithFirstAdmin,
) -> Iterator[CompanyProvisioningResult]:
    name = str(payload.name or "").strip()
    description = str(payload.description or "").strip() or None
    company_code = resolve_unique_company_code(cp_db, name)
    database_name = build_company_database_name(company_code)
    temporary_password = generate_provisioning_password()

    created_database = False
    company_engine = None
    company_db: Session | None = None

    try:
        create_company_database_from_template(database_name)
        created_database = True
        company_engine, _company_session_factory, company_db = _open_company_session(database_name)

        template_tenant_id = resolve_template_tenant_id(company_db)
        if template_tenant_id is None:
            raise HTTPException(
                status_code=500,
                detail="TEMPLATE tenant not found in cloned company database",
            )

        portal = _personalize_cloned_portal(
            company_db,
            template_tenant_id=template_tenant_id,
            company_name=name,
            company_code=company_code,
            description=description,
        )
        publish_tenant_catalog(
            company_db,
            portal.id,
            None,
            bypass_write_policy=True,
        )

        admin_user = _create_company_admin(
            company_db,
            tenant_id=portal.id,
            admin=payload.first_admin,
            temporary_password=temporary_password,
        )

        home_page_id = resolve_tenant_home_page_id(company_db, portal.id)
        if home_page_id is None:
            raise HTTPException(
                status_code=500,
                detail="Home page not found after TEMPLATE clone",
            )

        company = _register_catalog_entry(
            cp_db,
            payload=CustomerCompanyCreate(name=name),
            portal=portal,
            database_name=database_name,
            home_page_id=home_page_id,
        )
        cp_db.flush()

        result = CompanyProvisioningResult(
            portal=portal,
            database_name=database_name,
            home_page_id=int(home_page_id),
            customer_company_id=company.id,
            admin_user=admin_user,
            temporary_password=temporary_password,
            template_tenant_id=template_tenant_id,
        )

        try:
            yield result
            finalize_client_company_provisioning(
                cp_db=cp_db,
                company_db=company_db,
                database_name=database_name,
                created_database=created_database,
            )
        except Exception:
            cleanup_failed_company_provisioning(
                database_name=database_name,
                created_database=created_database,
                company_db=company_db,
                cp_db=cp_db,
            )
            raise
    except HTTPException:
        cleanup_failed_company_provisioning(
            database_name=database_name,
            created_database=created_database,
            company_db=company_db,
            cp_db=cp_db,
        )
        raise
    except CompanyDatabaseAdminError as exc:
        cleanup_failed_company_provisioning(
            database_name=database_name,
            created_database=created_database,
            company_db=company_db,
            cp_db=cp_db,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось создать базу компании: {exc}",
        ) from exc
    except Exception as exc:
        cleanup_failed_company_provisioning(
            database_name=database_name,
            created_database=created_database,
            company_db=company_db,
            cp_db=cp_db,
        )
        raise HTTPException(
            status_code=500,
            detail="Не удалось выполнить provisioning компании",
        ) from exc
    finally:
        if company_db is not None:
            company_db.close()
        if company_engine is not None:
            company_engine.dispose()


def build_portal_with_superadmin_response(
    result: CompanyProvisioningResult,
    *,
    invitation_sent: bool = False,
) -> PortalWithSuperadminResponse:
    portal = result.portal
    return PortalWithSuperadminResponse(
        id=portal.id,
        name=portal.name,
        original_name=str(portal.original_name or portal.name),
        code=portal.code,
        description=portal.description,
        is_active=portal.is_active,
        created_at=portal.created_at,
        tenant_type=TenantType(portal.tenant_type),
        template_version=str(portal.template_version or DEFAULT_TEMPLATE_VERSION),
        tenant_status=TenantStatus(portal.tenant_status),
        source_tenant_id=portal.source_tenant_id,
        notes=portal.notes,
        structure_cloned_from=result.template_tenant_id,
        catalog_version=None,
        company_superadmin=_serialize_superadmin(result.admin_user),
        customer_company_id=result.customer_company_id,
        invitation_sent=invitation_sent,
    )
