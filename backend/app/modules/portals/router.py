from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from .schemas import PortalCreate, PortalResponse
from . import service

router = APIRouter(prefix="/portals", tags=["Portals"])


@router.post("/", response_model=PortalResponse)
def create_portal(data: PortalCreate, db: Session = Depends(get_db)):
    return service.create_portal(db, data)


@router.get("/", response_model=list[PortalResponse])
def get_portals(db: Session = Depends(get_db)):
    return service.get_portals(db)