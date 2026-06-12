"""Public tenant branding for the login screen (no auth)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.portals.models import Portal


def resolve_tenant_login_display_name(db: Session, tenant_id: int) -> str | None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        return None

    display_name = str(portal.name or "").strip()
    if not display_name:
        return None

    return display_name
