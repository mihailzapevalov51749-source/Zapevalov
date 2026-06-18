"""Platform client company catalog — read model over customer_companies (no cross-db)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.company_database_provisioning.naming import is_company_runtime_database
from app.modules.control_plane.customer_companies.catalog_fields import (
    is_client_dev_database_misconfiguration,
    resolve_catalog_runtime_database_name,
)
from app.modules.control_plane.customer_companies.catalog_launch import (
    build_company_open_url,
    resolve_api_base_url,
    resolve_frontend_base_url,
)
from app.modules.control_plane.customer_companies.constants import CustomerCompanyStatus
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.customer_companies.schemas import (
    CustomerCompanyCatalogDetail,
    CustomerCompanyCatalogListItem,
)
from app.modules.tenant_bootstrap.minimal_runtime_shell import ensure_tenant_home_runtime_shell
from app.modules.tenant_environment.constants import TenantStatus, TenantType


def _resolve_portal_id(company: CustomerCompany) -> int | None:
    if company.portal_id is not None:
        return int(company.portal_id)
    if company.primary_portal_id is not None:
        return int(company.primary_portal_id)
    return None


def _repair_catalog_runtime_environment(
    db: Session,
    company: CustomerCompany,
) -> None:
    tenant_type = str(company.tenant_type or TenantType.CLIENT.value).strip().upper()
    database_name = str(company.database_name or "").strip()
    if is_company_runtime_database(database_name):
        return
    if not is_client_dev_database_misconfiguration(
        tenant_type=tenant_type,
        database_name=database_name,
    ):
        return

    company.database_name = resolve_catalog_runtime_database_name(
        tenant_type=tenant_type,
        environment_role=company.environment_role,
    )
    if company.frontend_base_url and ":5173" in str(company.frontend_base_url):
        company.frontend_base_url = None
    if company.api_base_url and ":8010" in str(company.api_base_url):
        company.api_base_url = None
    db.add(company)
    db.flush()


def _repair_catalog_home_page_id(
    db: Session,
    company: CustomerCompany,
    *,
    portal_id: int,
) -> int | None:
    if company.home_page_id is not None:
        return int(company.home_page_id)

    if is_company_runtime_database(str(company.database_name or "")):
        return None

    home_page_id = ensure_tenant_home_runtime_shell(
        db,
        portal_id=portal_id,
        title=company.name,
        commit=False,
    )
    company.home_page_id = home_page_id
    db.add(company)
    db.flush()
    return home_page_id


def _serialize_catalog_list_item(
    db: Session,
    company: CustomerCompany,
) -> CustomerCompanyCatalogListItem | None:
    portal_id = _resolve_portal_id(company)
    database_name = str(company.database_name or "").strip()
    if portal_id is None or not database_name:
        return None

    _repair_catalog_runtime_environment(db, company)
    database_name = str(company.database_name or "").strip()

    tenant_type_raw = str(company.tenant_type or TenantType.CLIENT.value).strip().upper()
    tenant_status_raw = str(company.tenant_status or TenantStatus.ACTIVE.value).strip().upper()
    frontend_base_url = resolve_frontend_base_url(
        database_name=database_name,
        stored_frontend_base_url=company.frontend_base_url,
    )
    api_base_url = resolve_api_base_url(
        database_name=database_name,
        stored_api_base_url=company.api_base_url,
    )
    home_page_id = int(company.home_page_id) if company.home_page_id is not None else None
    if home_page_id is None:
        home_page_id = _repair_catalog_home_page_id(db, company, portal_id=portal_id)
    open_url = build_company_open_url(
        frontend_base_url=frontend_base_url,
        portal_id=portal_id,
        home_page_id=home_page_id,
    )

    return CustomerCompanyCatalogListItem(
        id=portal_id,
        catalog_id=company.id,
        portal_id=portal_id,
        original_name=str(company.original_name or company.name),
        name=company.name,
        short_name=company.short_name,
        code=company.code,
        tenant_type=TenantType(tenant_type_raw),
        platform_version=str(company.platform_version or company.template_version or ""),
        template_version=str(company.template_version or ""),
        tenant_status=TenantStatus(tenant_status_raw),
        environment_role=company.environment_role,
        database_name=database_name,
        public_slug=company.public_slug,
        company_status=CustomerCompanyStatus(str(company.status)),
        home_page_id=home_page_id,
        frontend_base_url=frontend_base_url,
        api_base_url=api_base_url,
        open_url=open_url,
        created_at=company.created_at,
    )


def list_customer_company_catalog(db: Session) -> list[CustomerCompanyCatalogListItem]:
    query = (
        select(CustomerCompany)
        .where(CustomerCompany.tenant_type == TenantType.CLIENT.value)
        .order_by(CustomerCompany.portal_id.asc().nulls_last(), CustomerCompany.id.asc())
    )
    items: list[CustomerCompanyCatalogListItem] = []
    for company in db.scalars(query).all():
        serialized = _serialize_catalog_list_item(db, company)
        if serialized is not None:
            items.append(serialized)
    return items


def get_customer_company_catalog_item(
    db: Session,
    *,
    portal_id: int,
) -> CustomerCompanyCatalogDetail | None:
    company = (
        db.query(CustomerCompany)
        .filter(
            CustomerCompany.tenant_type == TenantType.CLIENT.value,
            CustomerCompany.portal_id == portal_id,
        )
        .order_by(CustomerCompany.id.asc())
        .first()
    )
    if company is None:
        company = (
            db.query(CustomerCompany)
            .filter(
                CustomerCompany.tenant_type == TenantType.CLIENT.value,
                CustomerCompany.primary_portal_id == portal_id,
            )
            .order_by(CustomerCompany.id.asc())
            .first()
        )
    if company is None:
        return None

    base = _serialize_catalog_list_item(db, company)
    if base is None:
        return None

    return CustomerCompanyCatalogDetail(
        **base.model_dump(),
        description=None,
        users_limit=company.users_limit,
        source_tenant_id=None,
        notes=None,
    )


def find_catalog_company_by_portal(
    db: Session,
    *,
    portal_id: int,
    database_name: str,
) -> CustomerCompany | None:
    return (
        db.query(CustomerCompany)
        .filter(
            CustomerCompany.portal_id == portal_id,
            CustomerCompany.database_name == database_name,
        )
        .one_or_none()
    )
