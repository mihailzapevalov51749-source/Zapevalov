"""Minimal runtime shell for tenants created without template clone."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page

DEFAULT_HOME_PAGE_TITLE = "Главная"


def resolve_tenant_home_page_id(db: Session, portal_id: int) -> int | None:
    page = (
        db.query(Page)
        .filter(Page.portal_id == portal_id, Page.is_home.is_(True))
        .order_by(Page.id.asc())
        .first()
    )
    if page is None:
        page = (
            db.query(Page)
            .filter(Page.portal_id == portal_id, Page.deleted_at.is_(None))
            .order_by(Page.id.asc())
            .first()
        )
    if page is None:
        return None
    return int(page.id)


def ensure_tenant_home_runtime_shell(
    db: Session,
    *,
    portal_id: int,
    title: str = DEFAULT_HOME_PAGE_TITLE,
    commit: bool = False,
) -> int:
    """
    Ensure tenant has a published home page and a runtime navigation entry.

    Idempotent: returns existing home page id when already present.
    """
    existing_id = resolve_tenant_home_page_id(db, portal_id)
    if existing_id is not None:
        return existing_id

    normalized_title = str(title or DEFAULT_HOME_PAGE_TITLE).strip() or DEFAULT_HOME_PAGE_TITLE
    page = Page(
        portal_id=portal_id,
        title=normalized_title,
        status="published",
        is_home=True,
        is_visible=True,
        sort_order=0,
    )
    db.add(page)
    db.flush()

    has_nav = (
        db.query(NavigationItem.id)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.page_id == page.id,
            NavigationItem.deleted_at.is_(None),
        )
        .first()
    )
    if has_nav is None:
        db.add(
            NavigationItem(
                portal_id=portal_id,
                type="page",
                title=normalized_title,
                page_id=page.id,
                menu_scope="runtime",
                is_visible=True,
                sort_order=0,
                is_system=False,
                is_protected=False,
            )
        )
        db.flush()

    if commit:
        db.commit()

    return int(page.id)
