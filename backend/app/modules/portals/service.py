from sqlalchemy.orm import Session
from . import repository


def create_portal(db: Session, data):
    return repository.create_portal(db, data.name, data.description)


def get_portals(db: Session):
    return repository.get_portals(db)