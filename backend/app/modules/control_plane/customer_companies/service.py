from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.company_database_provisioning.naming import is_company_runtime_database
from app.modules.control_plane.customer_companies.catalog_fields import (
    apply_portal_catalog_metadata,
    resolve_catalog_runtime_database_name,
)
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.customer_companies.schemas import (
    CustomerCompanyCreate,
    CustomerCompanyUpdate,
)
from app.modules.tenant_bootstrap.minimal_runtime_shell import resolve_tenant_home_page_id
from app.modules.platform_version_registry.crud import build_active_platform_version_map
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantType
from app.modules.users.models import User


def list_customer_companies(db: Session) -> list[CustomerCompany]:
    query = (
        select(CustomerCompany)
        .order_by(CustomerCompany.created_at.desc(), CustomerCompany.id.desc())
    )
    return list(db.scalars(query).all())


def get_customer_company(db: Session, *, company_id: int) -> CustomerCompany | None:
    return db.get(CustomerCompany, company_id)


def _validate_portal_id(db: Session, portal_id: int | None) -> None:
    if portal_id is None:
        return

    portal = db.get(Portal, portal_id)

    if portal is None:
        raise ValueError("primary_portal_id: портал не найден")


def _validate_user_id(db: Session, user_id: int | None, *, field_name: str) -> None:
    if user_id is None:
        return

    user = db.get(User, user_id)

    if user is None:
        raise ValueError(f"{field_name}: пользователь не найден")


def _resolve_local_home_page_id(db: Session, portal_id: int) -> int | None:
    return resolve_tenant_home_page_id(db, portal_id)


def _apply_catalog_metadata_from_local_portal(
    db: Session,
    company: CustomerCompany,
    *,
    portal: Portal,
) -> None:
    version_by_tenant = build_active_platform_version_map(db)
    platform_version = version_by_tenant.get(portal.id)
    company_code = str(portal.code or "").strip() or None
    database_name = resolve_catalog_runtime_database_name(
        tenant_type=str(portal.tenant_type or TenantType.CLIENT.value),
        environment_role=portal.environment_role,
        company_code=company_code,
    )
    home_page_id = None
    if not is_company_runtime_database(database_name):
        home_page_id = _resolve_local_home_page_id(db, portal.id)
    apply_portal_catalog_metadata(
        company,
        portal=portal,
        database_name=database_name,
        platform_version=platform_version,
        home_page_id=home_page_id,
    )


def create_customer_company(
    db: Session,
    *,
    payload: CustomerCompanyCreate,
    portal: Portal | None = None,
    commit: bool = True,
) -> CustomerCompany:
    if portal is None and payload.primary_portal_id is not None:
        portal = db.get(Portal, payload.primary_portal_id)

    if payload.primary_portal_id is not None:
        _validate_portal_id(db, payload.primary_portal_id)

    _validate_user_id(db, payload.sales_owner_id, field_name="sales_owner_id")
    _validate_user_id(db, payload.support_owner_id, field_name="support_owner_id")

    company = CustomerCompany(
        name=payload.name.strip(),
        status=payload.status.value,
        primary_portal_id=payload.primary_portal_id,
        users_limit=payload.users_limit,
        sales_owner_id=payload.sales_owner_id,
        support_owner_id=payload.support_owner_id,
    )

    if portal is not None:
        _apply_catalog_metadata_from_local_portal(db, company, portal=portal)

    db.add(company)
    if commit:
        db.commit()
        db.refresh(company)
    else:
        db.flush()
    return company


def update_customer_company(
    db: Session,
    *,
    company: CustomerCompany,
    payload: CustomerCompanyUpdate,
) -> CustomerCompany:
    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates:
        company.name = str(updates["name"]).strip()

    if "status" in updates:
        company.status = updates["status"].value

    if "primary_portal_id" in updates:
        portal_id = updates["primary_portal_id"]
        _validate_portal_id(db, portal_id)
        company.primary_portal_id = portal_id
        portal = db.get(Portal, portal_id) if portal_id is not None else None
        if portal is not None:
            _apply_catalog_metadata_from_local_portal(db, company, portal=portal)

    if "users_limit" in updates:
        company.users_limit = updates["users_limit"]

    if "sales_owner_id" in updates:
        owner_id = updates["sales_owner_id"]
        _validate_user_id(db, owner_id, field_name="sales_owner_id")
        company.sales_owner_id = owner_id

    if "support_owner_id" in updates:
        owner_id = updates["support_owner_id"]
        _validate_user_id(db, owner_id, field_name="support_owner_id")
        company.support_owner_id = owner_id

    db.add(company)
    db.commit()
    db.refresh(company)
    return company
