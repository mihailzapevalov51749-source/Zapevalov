"""Catalog-backed validation for CLIENT runtime database routing (WI-15D)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from sqlalchemy.orm import Session

from app.core.environment_guard import ENVIRONMENT_MATRIX
from app.modules.company_database_provisioning.naming import is_company_runtime_database
from app.modules.company_database_provisioning.orphan_detection import catalog_database_exists
from app.modules.control_plane.customer_companies.constants import CustomerCompanyStatus
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.portals.models import Portal

RUNTIME_ROUTING_ALLOWED_COMPANY_STATUSES = frozenset(
    {
        CustomerCompanyStatus.ACTIVE.value,
        CustomerCompanyStatus.TRIAL.value,
    },
)

RuntimeRoutingDenialReason = Literal[
    "invalid_jwt_database",
    "catalog_missing",
    "portal_missing",
    "catalog_database_missing",
    "database_name_mismatch",
    "company_status_denied",
    "runtime_database_missing",
]


@dataclass(frozen=True, slots=True)
class RuntimeRoutingValidationResult:
    allowed: bool
    database_name: str | None = None
    reason_code: RuntimeRoutingDenialReason | None = None


def _normalize_database_name(database_name: str | None) -> str:
    return str(database_name or "").strip().lower()


def is_catalog_backed_client_runtime_database(database_name: str | None) -> bool:
    """True for per-company DBs and legacy demo CLIENT matrix database (ooo_rozetka)."""
    normalized = _normalize_database_name(database_name)
    if not normalized:
        return False
    if is_company_runtime_database(normalized):
        return True

    legacy_client_db = _normalize_database_name(ENVIRONMENT_MATRIX["CLIENT"].database)
    return normalized == legacy_client_db


def find_catalog_company_for_portal(db: Session, portal_id: int) -> CustomerCompany | None:
    company = (
        db.query(CustomerCompany)
        .filter(CustomerCompany.portal_id == portal_id)
        .order_by(CustomerCompany.id.asc())
        .first()
    )
    if company is not None:
        return company

    return (
        db.query(CustomerCompany)
        .filter(CustomerCompany.primary_portal_id == portal_id)
        .order_by(CustomerCompany.id.asc())
        .first()
    )


def validate_bridge_runtime_routing(
    cp_db: Session,
    *,
    portal_id: int,
    jwt_database_name: str,
) -> RuntimeRoutingValidationResult:
    """Validate Bridge JWT routing claims against customer_companies catalog."""
    jwt_db = _normalize_database_name(jwt_database_name)
    if not jwt_db:
        return RuntimeRoutingValidationResult(
            allowed=False,
            reason_code="invalid_jwt_database",
        )

    company = find_catalog_company_for_portal(cp_db, int(portal_id))
    if company is None:
        return RuntimeRoutingValidationResult(
            allowed=False,
            reason_code="catalog_missing",
        )

    portal = cp_db.get(Portal, int(portal_id))
    if portal is None:
        return RuntimeRoutingValidationResult(
            allowed=False,
            reason_code="portal_missing",
        )

    catalog_db = _normalize_database_name(company.database_name)
    if not catalog_db:
        return RuntimeRoutingValidationResult(
            allowed=False,
            reason_code="catalog_database_missing",
        )

    if not is_catalog_backed_client_runtime_database(catalog_db):
        return RuntimeRoutingValidationResult(
            allowed=False,
            reason_code="invalid_jwt_database",
        )

    if catalog_db != jwt_db:
        return RuntimeRoutingValidationResult(
            allowed=False,
            reason_code="database_name_mismatch",
        )

    status = str(company.status or "").strip().lower()
    if status not in RUNTIME_ROUTING_ALLOWED_COMPANY_STATUSES:
        return RuntimeRoutingValidationResult(
            allowed=False,
            reason_code="company_status_denied",
        )

    if not catalog_database_exists(cp_db, catalog_db):
        return RuntimeRoutingValidationResult(
            allowed=False,
            reason_code="runtime_database_missing",
        )

    return RuntimeRoutingValidationResult(
        allowed=True,
        database_name=catalog_db,
    )
