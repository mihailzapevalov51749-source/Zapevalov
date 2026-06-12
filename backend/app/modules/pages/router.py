from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User

from .schemas import PageCreate, PageUpdate, PageResponse, PageFullResponse
from .tenant_access import get_request_portal_id
from . import service

router = APIRouter(prefix="/pages", tags=["Pages"])


@router.post("/", response_model=PageResponse)
def create_page(
    data: PageCreate,
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    return service.create_page(db, data, portal_id=portal_id)


@router.get("/portal/{portal_id}", response_model=list[PageResponse])
def get_pages_by_portal(portal_id: int, db: Session = Depends(get_db)):
    return service.get_pages_by_portal(
        db,
        portal_id,
        request_portal_id=portal_id,
    )


@router.get("/{page_id}", response_model=PageResponse)
def get_page(
    page_id: int,
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    page = service.get_page(db, page_id, portal_id=portal_id)

    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return page


@router.get("/{page_id}/full", response_model=PageFullResponse)
def get_page_full(
    page_id: int,
    office_access: bool = Query(
        False,
        description="Проверка доступа страницы в Office runtime (draft блокируется).",
    ),
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    data = service.get_page_full(
        db,
        page_id,
        portal_id=portal_id,
        office_access=office_access,
    )

    if not data:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return data


@router.put("/{page_id}", response_model=PageResponse)
def update_page(
    page_id: int,
    data: PageUpdate,
    db: Session = Depends(get_db),
    portal_id: int = Depends(get_request_portal_id),
):
    page = service.update_page(db, page_id, data, portal_id=portal_id)

    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return page


@router.delete("/{page_id}")
def delete_page(
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    portal_id: int = Depends(get_request_portal_id),
):
    page = service.delete_page(
        db,
        page_id,
        portal_id=portal_id,
        deleted_by=current_user.id,
    )

    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    return {"message": "Страница удалена"}
