from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from .schemas import PageCreate, PageUpdate, PageResponse, PageFullResponse
from . import service

router = APIRouter(prefix="/pages", tags=["Pages"])


@router.post("/", response_model=PageResponse)
def create_page(data: PageCreate, db: Session = Depends(get_db)):
    return service.create_page(db, data)


@router.get("/portal/{portal_id}", response_model=list[PageResponse])
def get_pages_by_portal(portal_id: int, db: Session = Depends(get_db)):
    return service.get_pages_by_portal(db, portal_id)


@router.get("/{page_id}", response_model=PageResponse)
def get_page(page_id: int, db: Session = Depends(get_db)):
    page = service.get_page(db, page_id)

    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return page


# ===== НОВЫЙ ENDPOINT =====
@router.get("/{page_id}/full", response_model=PageFullResponse)
def get_page_full(page_id: int, db: Session = Depends(get_db)):
    data = service.get_page_full(db, page_id)

    if not data:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return data


@router.put("/{page_id}", response_model=PageResponse)
def update_page(
    page_id: int,
    data: PageUpdate,
    db: Session = Depends(get_db)
):
    page = service.update_page(db, page_id, data)

    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return page


@router.delete("/{page_id}")
def delete_page(page_id: int, db: Session = Depends(get_db)):
    page = service.delete_page(db, page_id)

    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return {"message": "Страница удалена"}