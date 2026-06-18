"""Architecture Navigator API (DEV Studio)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.architecture_navigator.dependencies import (
    require_architecture_navigator_access,
)
from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.schemas import (
    ArchitectureComponentCard,
    ArchitectureLatestScanResponse,
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


@router.post("/scan", response_model=ArchitectureScanResponse)
def run_architecture_scan(
    db: Session = Depends(get_db),
    actor=Depends(require_designer_user),
    _tenant_id: int = Depends(require_architecture_navigator_access),
):
    user_id = getattr(actor, "id", None) or getattr(actor, "user_id", None)
    return service.execute_architecture_scan(db, user_id)
