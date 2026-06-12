from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.pages.tenant_access import get_request_portal_id

from .schemas import BlockCreate, BlockUpdate, BlockMove, BlockResponse
from . import service

router = APIRouter(prefix="/blocks", tags=["Blocks"])


@router.post("/", response_model=BlockResponse)
def create_block(
    data: BlockCreate,
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    return service.create_block(db, data, portal_id=portal_id)


@router.get("/section/{section_id}", response_model=list[BlockResponse])
def get_blocks_by_section(
    section_id: int,
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    return service.get_blocks_by_section(db, section_id, portal_id=portal_id)


@router.get("/by-sections", response_model=list[BlockResponse])
def get_blocks_by_sections(
    section_ids: list[int] = Query(...),
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    return service.get_blocks_by_sections(db, section_ids, portal_id=portal_id)


@router.get("/{block_id}", response_model=BlockResponse)
def get_block(
    block_id: int,
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    block = service.get_block(db, block_id, portal_id=portal_id)

    if not block:
        raise HTTPException(status_code=404, detail="Блок не найден")

    return block


@router.put("/{block_id}", response_model=BlockResponse)
def update_block(
    block_id: int,
    data: BlockUpdate,
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    block = service.update_block(db, block_id, data, portal_id=portal_id)

    if not block:
        raise HTTPException(status_code=404, detail="Блок не найден")

    return block


@router.delete("/{block_id}")
def delete_block(
    block_id: int,
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    block = service.delete_block(db, block_id, portal_id=portal_id)

    if not block:
        raise HTTPException(status_code=404, detail="Блок не найден")

    return {"message": "Блок удалён"}


@router.post("/move", response_model=list[BlockResponse])
def move_blocks(
    items: list[BlockMove],
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    return service.move_blocks(db, items, portal_id=portal_id)
