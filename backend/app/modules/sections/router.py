from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.shared.dependencies import require_portal_membership

from .schemas import (
    SectionCreate,
    SectionUpdate,
    SectionMove,
    SectionResponse,
)
from . import service

router = APIRouter(prefix="/sections", tags=["Sections"])


@router.post("/portal/{portal_id}/", response_model=SectionResponse)
def create_section(
    data: SectionCreate,
    db: Session = Depends(get_db),
    portal_id: int = Depends(require_portal_membership),
):
    return service.create_section(db, data, portal_id=portal_id)


@router.get("/portal/{portal_id}/page/{page_id}", response_model=list[SectionResponse])
def get_sections_by_page(
    page_id: int,
    db: Session = Depends(get_db),
    portal_id: int = Depends(require_portal_membership),
):
    return service.get_sections_by_page(db, page_id, portal_id=portal_id)


@router.get("/portal/{portal_id}/{section_id}", response_model=SectionResponse)
def get_section(
    section_id: int,
    db: Session = Depends(get_db),
    portal_id: int = Depends(require_portal_membership),
):
    section = service.get_section(db, section_id, portal_id=portal_id)

    if not section:
        raise HTTPException(status_code=404, detail="Раздел не найден")

    return section


@router.put("/portal/{portal_id}/{section_id}", response_model=SectionResponse)
def update_section(
    section_id: int,
    data: SectionUpdate,
    db: Session = Depends(get_db),
    portal_id: int = Depends(require_portal_membership),
):
    section = service.update_section(db, section_id, data, portal_id=portal_id)

    if not section:
        raise HTTPException(status_code=404, detail="Раздел не найден")

    return section


@router.delete("/portal/{portal_id}/{section_id}")
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    portal_id: int = Depends(require_portal_membership),
):
    section = service.delete_section(db, section_id, portal_id=portal_id)

    if not section:
        raise HTTPException(status_code=404, detail="Раздел не найден")

    return {"message": "Раздел удалён"}


@router.post("/portal/{portal_id}/move", response_model=list[SectionResponse])
def move_sections(
    items: list[SectionMove],
    db: Session = Depends(get_db),
    portal_id: int = Depends(require_portal_membership),
):
    return service.move_sections(db, items, portal_id=portal_id)
