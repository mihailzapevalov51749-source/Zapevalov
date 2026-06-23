"""Architecture Navigator API (DEV Studio)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.architecture_navigator.dependencies import (
    require_architecture_navigator_access,
)
from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.architecture_file_owner import resolve_file_owner
from app.modules.platform.architecture_navigator.schemas import (
    ArchitectureComponentCard,
    ArchitectureFileOwnerResponse,
    ArchitectureLatestScanResponse,
    ArchitectureRegistryDocumentResponse,
    ArchitectureRegistryElementsResponse,
    ArchitectureRegistryListItem,
    ArchitectureRegistryOverviewResponse,
    ArchitectureScanResponse,
    ArchitectureTreeResponse,
)
from app.modules.platform.shared.dependencies import require_designer_user

router = APIRouter(
    prefix="/dev/architecture",
    tags=["Architecture Navigator"],
    dependencies=[Depends(require_architecture_navigator_access)],
)


@router.get("/tree", response_model=ArchitectureTreeResponse)
def get_architecture_tree(
    db: Session = Depends(get_db),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    return service.get_architecture_tree(db)


@router.get("/registries", response_model=list[ArchitectureRegistryListItem])
def list_architecture_registries(
    db: Session = Depends(get_db),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    return service.list_registries(db)


@router.get("/registries/overview", response_model=ArchitectureRegistryOverviewResponse)
def get_architecture_registry_overview(
    db: Session = Depends(get_db),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    return service.get_registry_overview(db)


@router.get("/registries/{registry_key}/elements", response_model=ArchitectureRegistryElementsResponse)
def list_architecture_registry_elements(
    registry_key: str,
    db: Session = Depends(get_db),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    return service.list_registry_elements(db, registry_key)


@router.get("/registries/{registry_key}/document", response_model=ArchitectureRegistryDocumentResponse)
def get_architecture_registry_document(
    registry_key: str,
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    return service.get_registry_document(registry_key)


@router.get("/scan/latest", response_model=ArchitectureLatestScanResponse)
def get_latest_architecture_scan(
    db: Session = Depends(get_db),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    return service.get_latest_scan(db)


@router.get("/component/{component_id}", response_model=ArchitectureComponentCard)
def get_architecture_component(
    component_id: str,
    db: Session = Depends(get_db),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    return service.get_component_card(db, component_id)


@router.get("/file-owner", response_model=ArchitectureFileOwnerResponse)
def get_architecture_file_owner(
    path: str = Query(..., min_length=1, description="Platform file path"),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    resolution = resolve_file_owner(path)
    return ArchitectureFileOwnerResponse(**resolution.to_dict())


@router.post("/scan", response_model=ArchitectureScanResponse)
def run_architecture_scan(
    db: Session = Depends(get_db),
    actor=Depends(require_designer_user),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    user_id = getattr(actor, "id", None) or getattr(actor, "user_id", None)
    return service.execute_architecture_scan(db, user_id)
