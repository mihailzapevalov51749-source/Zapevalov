"""Detect orphan company databases vs Control Plane catalog (WI-15C)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from sqlalchemy.orm import Session

from app.modules.company_database_provisioning.database_admin import (
    database_exists,
    list_company_runtime_databases,
)
from app.modules.company_database_provisioning.naming import is_company_runtime_database
from app.modules.control_plane.customer_companies.models import CustomerCompany

OrphanKind = Literal["database_without_catalog", "catalog_without_database"]


@dataclass(frozen=True)
class OrphanProvisioningFinding:
    kind: OrphanKind
    database_name: str
    catalog_id: int | None = None
    catalog_code: str | None = None


def _catalog_company_database_names(cp_db: Session) -> dict[str, CustomerCompany]:
    rows = (
        cp_db.query(CustomerCompany)
        .filter(CustomerCompany.database_name.isnot(None))
        .all()
    )
    catalog_by_database: dict[str, CustomerCompany] = {}
    for row in rows:
        database_name = str(row.database_name or "").strip().lower()
        if not is_company_runtime_database(database_name):
            continue
        catalog_by_database[database_name] = row
    return catalog_by_database


def detect_orphan_company_provisioning(
    cp_db: Session,
    *,
    existing_database_names: set[str] | None = None,
) -> list[OrphanProvisioningFinding]:
    """Find company DBs without catalog entries and catalog entries without DBs."""
    catalog_by_database = _catalog_company_database_names(cp_db)
    catalog_names = set(catalog_by_database)
    runtime_names = existing_database_names
    if runtime_names is None:
        runtime_names = set(list_company_runtime_databases())

    findings: list[OrphanProvisioningFinding] = []

    for database_name in sorted(runtime_names - catalog_names):
        findings.append(
            OrphanProvisioningFinding(
                kind="database_without_catalog",
                database_name=database_name,
            ),
        )

    for database_name in sorted(catalog_names - runtime_names):
        company = catalog_by_database[database_name]
        findings.append(
            OrphanProvisioningFinding(
                kind="catalog_without_database",
                database_name=database_name,
                catalog_id=int(company.id),
                catalog_code=str(company.code or "") or None,
            ),
        )

    return findings


def catalog_database_exists(
    cp_db: Session,
    database_name: str,
    *,
    existing_database_names: set[str] | None = None,
) -> bool:
    normalized = str(database_name or "").strip().lower()
    if not is_company_runtime_database(normalized):
        return False
    if existing_database_names is not None:
        return normalized in existing_database_names
    return database_exists_for_company(normalized)


def database_exists_for_company(database_name: str) -> bool:
    from sqlalchemy import create_engine

    from app.modules.company_database_provisioning.database_urls import (
        build_postgres_admin_url,
    )

    admin_engine = create_engine(build_postgres_admin_url(), isolation_level="AUTOCOMMIT")
    try:
        return database_exists(admin_engine, database_name)
    finally:
        admin_engine.dispose()
