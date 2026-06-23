"""Architecture Governance API (DEV Studio)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.architecture_governance import service
from app.modules.platform.architecture_governance.dependencies import (
    require_architecture_governance_access,
)
from app.modules.platform.architecture_governance.schemas import (
    AdrDetailRead,
    AdrListResponse,
    ConstitutionResponse,
    DeliveryContourResponse,
    GovernanceOverviewResponse,
    LegacyGovernanceRedirectResponse,
)

router = APIRouter(
    prefix="/dev/architecture-governance",
    tags=["Architecture Governance"],
    dependencies=[Depends(require_architecture_governance_access)],
)


@router.get("/overview", response_model=GovernanceOverviewResponse)
def get_governance_overview(
    db: Session = Depends(get_db),
    _tenant_id: int = Depends(require_architecture_governance_access),
):
    return service.get_governance_overview(db)


@router.get("/constitution", response_model=ConstitutionResponse)
def get_constitution_projection(
    _tenant_id: int = Depends(require_architecture_governance_access),
):
    return service.get_constitution_projection()


@router.get("/adr", response_model=AdrListResponse)
def list_architecture_decisions(
    _tenant_id: int = Depends(require_architecture_governance_access),
):
    return service.list_adrs()


@router.get("/adr/{slug}", response_model=AdrDetailRead)
def get_architecture_decision(
    slug: str,
    _tenant_id: int = Depends(require_architecture_governance_access),
):
    detail = service.get_adr_detail(slug)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ADR not found")
    return detail


@router.get("/delivery", response_model=DeliveryContourResponse)
def get_delivery_contour(
    _tenant_id: int = Depends(require_architecture_governance_access),
):
    return service.get_delivery_contour()


@router.get("/legacy-redirect/{registry_key}", response_model=LegacyGovernanceRedirectResponse)
def get_legacy_registry_redirect(
    registry_key: str,
    _tenant_id: int = Depends(require_architecture_governance_access),
):
    redirect = service.get_legacy_governance_redirect(registry_key)
    if redirect is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No redirect configured")
    return redirect
