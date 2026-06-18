from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.customer_companies.schemas import (
    CustomerCompanyCatalogDetail,
    CustomerCompanyCatalogListItem,
    CustomerCompanyCreate,
    CustomerCompanyRead,
    CustomerCompanyUpdate,
)
from app.modules.control_plane.customer_companies.catalog_service import (
    get_customer_company_catalog_item,
    list_customer_company_catalog,
)
from app.modules.control_plane.customer_companies.service import (
    create_customer_company,
    get_customer_company,
    list_customer_companies,
    update_customer_company,
)
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.control_plane.platform_identity.session_bridge.dependencies import (
    require_platform_owner_principal,
)
from app.modules.control_plane.platform_identity.session_bridge.mint_service import (
    mint_catalog_bridge_ticket,
)
from app.modules.control_plane.platform_identity.session_bridge.schemas import (
    BridgeTicketMintResponse,
)

router = APIRouter(
    prefix="/control-plane/customer-companies",
    tags=["Control Plane — Customer Companies"],
)


@router.get("/catalog", response_model=list[CustomerCompanyCatalogListItem])
def list_customer_company_catalog_endpoint(
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    return list_customer_company_catalog(db)


@router.get("/catalog/{portal_id}", response_model=CustomerCompanyCatalogDetail)
def get_customer_company_catalog_endpoint(
    portal_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    item = get_customer_company_catalog_item(db, portal_id=portal_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Клиентская компания не найдена в каталоге",
        )
    return item


@router.post(
    "/catalog/{portal_id}/bridge-ticket",
    response_model=BridgeTicketMintResponse,
    status_code=status.HTTP_201_CREATED,
)
def mint_customer_company_bridge_ticket_endpoint(
    portal_id: int,
    db: Session = Depends(get_db),
    principal=Depends(require_platform_owner_principal),
):
    return mint_catalog_bridge_ticket(db, principal=principal, portal_id=portal_id)


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
