from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.customer_companies.schemas import (
    CustomerCompanyCreate,
    CustomerCompanyRead,
    CustomerCompanyUpdate,
)
from app.modules.control_plane.customer_companies.service import (
    create_customer_company,
    get_customer_company,
    list_customer_companies,
    update_customer_company,
)
from app.modules.control_plane.dependencies import require_platform_admin

router = APIRouter(
    prefix="/control-plane/customer-companies",
    tags=["Control Plane — Customer Companies"],
)


@router.get("", response_model=list[CustomerCompanyRead])
def list_customer_companies_endpoint(
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    return list_customer_companies(db)


@router.get("/{company_id}", response_model=CustomerCompanyRead)
def get_customer_company_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    company = get_customer_company(db, company_id=company_id)

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Клиентская компания не найдена",
        )

    return company


@router.post("", response_model=CustomerCompanyRead, status_code=status.HTTP_201_CREATED)
def create_customer_company_endpoint(
    payload: CustomerCompanyCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    try:
        return create_customer_company(db, payload=payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.patch("/{company_id}", response_model=CustomerCompanyRead)
def patch_customer_company_endpoint(
    company_id: int,
    payload: CustomerCompanyUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    company = get_customer_company(db, company_id=company_id)

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Клиентская компания не найдена",
        )

    try:
        return update_customer_company(db, company=company, payload=payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
