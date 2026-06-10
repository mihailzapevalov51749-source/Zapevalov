"""Provisioning-oriented service layer for customer companies (Control Plane).

Next steps (not implemented in MVP):
    create_customer_company()
        -> create_portal()
        -> create_superadmin()
        -> create_user_portal_membership()
        -> send_invitation_email()
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.customer_companies.schemas import CustomerCompanyCreate
from app.modules.control_plane.customer_companies.service import create_customer_company


@dataclass(frozen=True)
class CustomerCompanyProvisioningPlan:
    company_name: str
    users_limit: int
    create_portal: bool = True
    create_superadmin: bool = True
    send_invitation: bool = True


def create_customer_company_record(
    db: Session,
    *,
    payload: CustomerCompanyCreate,
) -> CustomerCompany:
    """MVP: persist customer company only (no portal/user provisioning)."""
    return create_customer_company(db, payload=payload)


def provision_customer_company(
    db: Session,
    *,
    plan: CustomerCompanyProvisioningPlan,
) -> CustomerCompany:
    """Future provisioning entry point — portal + superadmin + membership + invite."""
    raise NotImplementedError(
        "Provisioning Service is not implemented yet. "
        "Use create_customer_company_record for MVP registry-only flow."
    )
