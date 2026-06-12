"""Tenant isolation for legacy pages / sections / blocks API."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from fastapi import HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.modules.blocks.models import Block
from app.modules.pages.models import Page
from app.modules.sections.models import Section

if TYPE_CHECKING:
    from collections.abc import Iterable

_PORTAL_REFERER_RE = re.compile(r"/portal/(\d+)(?:/|$)")
_DESIGNER_REFERER_RE = re.compile(r"/designer/tenant/(\d+)(?:/|$)")

PAGE_PORTAL_FORBIDDEN_DETAIL = "Страница недоступна в текущем tenant"
PORTAL_CONTEXT_REQUIRED_DETAIL = "Требуется контекст tenant (portal_id)"


def resolve_request_portal_id(
    *,
    portal_id: int | None = None,
    request: Request | None = None,
) -> int | None:
    if portal_id is not None:
        normalized = int(portal_id)
        if normalized > 0:
            return normalized

    if request is None:
        return None

    header_portal = request.headers.get("x-portal-id") or request.headers.get("X-Portal-Id")
    if header_portal is not None:
        header_text = str(header_portal).strip()
        if header_text.isdigit():
            normalized = int(header_text)
            if normalized > 0:
                return normalized

    referer = request.headers.get("referer") or request.headers.get("Referer") or ""
    for pattern in (_PORTAL_REFERER_RE, _DESIGNER_REFERER_RE):
        match = pattern.search(referer)
        if match:
            normalized = int(match.group(1))
            if normalized > 0:
                return normalized

    return None


def require_resolved_portal_id(portal_id: int | None) -> int:
    if portal_id is None or int(portal_id) <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=PORTAL_CONTEXT_REQUIRED_DETAIL,
        )
    return int(portal_id)


def get_request_portal_id(
    request: Request,
    portal_id: int | None = Query(
        None,
        description="Контекст tenant (portal). Также поддерживаются X-Portal-Id и Referer.",
    ),
) -> int:
    resolved = resolve_request_portal_id(portal_id=portal_id, request=request)
    return require_resolved_portal_id(resolved)


def assert_page_belongs_to_portal(page: Page | None, portal_id: int) -> None:
    if page is None:
        return

    if int(page.portal_id) != int(portal_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=PAGE_PORTAL_FORBIDDEN_DETAIL,
        )


def assert_portal_id_matches_expected(portal_id: int, expected_portal_id: int) -> None:
    if int(portal_id) != int(expected_portal_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=PAGE_PORTAL_FORBIDDEN_DETAIL,
        )


def get_page_for_portal(db: Session, page_id: int, portal_id: int) -> Page | None:
    page = (
        db.query(Page)
        .filter(Page.id == page_id, Page.deleted_at.is_(None))
        .first()
    )
    if page is None:
        return None

    assert_page_belongs_to_portal(page, portal_id)
    return page


def get_page_for_portal_any_state(db: Session, page_id: int, portal_id: int) -> Page | None:
    page = db.query(Page).filter(Page.id == page_id).first()
    if page is None:
        return None

    assert_page_belongs_to_portal(page, portal_id)
    return page


def get_page_portal_id(db: Session, page_id: int) -> int | None:
    row = db.query(Page.portal_id).filter(Page.id == page_id).first()
    return int(row.portal_id) if row is not None else None


def get_section_for_portal(db: Session, section_id: int, portal_id: int) -> Section | None:
    section = db.query(Section).filter(Section.id == section_id).first()
    if section is None:
        return None

    page_portal_id = get_page_portal_id(db, section.page_id)
    if page_portal_id is None:
        return section

    assert_portal_id_matches_expected(page_portal_id, portal_id)
    return section


def get_block_for_portal(db: Session, block_id: int, portal_id: int) -> Block | None:
    block = db.query(Block).filter(Block.id == block_id).first()
    if block is None:
        return None

    section = db.query(Section).filter(Section.id == block.section_id).first()
    if section is None:
        return block

    page_portal_id = get_page_portal_id(db, section.page_id)
    if page_portal_id is None:
        return block

    assert_portal_id_matches_expected(page_portal_id, portal_id)
    return block


def assert_page_id_belongs_to_portal(db: Session, page_id: int, portal_id: int) -> None:
    page_portal_id = get_page_portal_id(db, page_id)
    if page_portal_id is None:
        return
    assert_portal_id_matches_expected(page_portal_id, portal_id)


def assert_section_id_belongs_to_portal(db: Session, section_id: int, portal_id: int) -> None:
    section = db.query(Section).filter(Section.id == section_id).first()
    if section is None:
        return
    assert_page_id_belongs_to_portal(db, section.page_id, portal_id)


def assert_section_ids_belong_to_portal(
    db: Session,
    section_ids: Iterable[int],
    portal_id: int,
) -> None:
    for section_id in section_ids:
        assert_section_id_belongs_to_portal(db, int(section_id), portal_id)
