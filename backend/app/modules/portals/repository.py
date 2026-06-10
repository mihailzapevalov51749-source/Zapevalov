from sqlalchemy.orm import Session
from .models import Portal


def create_portal(db: Session, name: str, description: str | None):
    portal = Portal(name=name, description=description)
    db.add(portal)
    db.commit()
    db.refresh(portal)
    return portal


def get_portals(db: Session):
    return db.query(Portal).order_by(Portal.id.asc()).all()


def get_portal(db: Session, portal_id: int) -> Portal | None:
    return db.query(Portal).filter(Portal.id == portal_id).one_or_none()