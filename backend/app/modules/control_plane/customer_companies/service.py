from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.customer_companies.schemas import (
    CustomerCompanyCreate,
    CustomerCompanyUpdate,
)
from app.modules.portals.models import Portal
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


def create_customer_company(
    db: Session,
    *,
    payload: CustomerCompanyCreate,
    commit: bool = True,
) -> CustomerCompany:
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
