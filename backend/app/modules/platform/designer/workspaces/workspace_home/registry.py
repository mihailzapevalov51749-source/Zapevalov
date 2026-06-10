"""Structural registry and uniqueness guarantees for Workspace Home entities."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.pages.models import Page
from app.modules.sections.models import Section
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.platform.designer.workspaces.workspace_home.constants import (
    WORKSPACE_HOME_ROOT_SECTION_SORT_ORDER,
    WORKSPACE_HOME_TAB_SLUG,
    WORKSPACE_HOME_TAB_TITLE,
)

logger = logging.getLogger(__name__)


def workspace_home_lock_key(workspace_id: int) -> int:
    payload = f"workspace_home:{workspace_id}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return int(digest[:15], 16)


def acquire_workspace_home_lock(db: Session, workspace_id: int) -> None:
    db.execute(
        text("SELECT pg_advisory_xact_lock(:lock_key)"),
        {"lock_key": workspace_home_lock_key(workspace_id)},
    )


def list_active_home_tabs(
    db: Session,
    workspace_id: int,
) -> list[DesignerWorkspaceTab]:
    return (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.workspace_id == workspace_id,
            DesignerWorkspaceTab.slug == WORKSPACE_HOME_TAB_SLUG,
            DesignerWorkspaceTab.is_system.is_(True),
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .order_by(
            DesignerWorkspaceTab.created_at.asc(),
            DesignerWorkspaceTab.id.asc(),
        )
        .all()
    )


def _find_revivable_home_tab(
    db: Session,
    workspace_id: int,
) -> DesignerWorkspaceTab | None:
    return (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.workspace_id == workspace_id,
            DesignerWorkspaceTab.slug == WORKSPACE_HOME_TAB_SLUG,
            DesignerWorkspaceTab.is_system.is_(True),
            DesignerWorkspaceTab.deleted_at.isnot(None),
        )
        .order_by(
            DesignerWorkspaceTab.created_at.asc(),
            DesignerWorkspaceTab.id.asc(),
        )
        .first()
    )


def ensure_home_tab_metadata(
    tab: DesignerWorkspaceTab,
    *,
    workspace: DesignerWorkspace,
) -> bool:
    changed = False
    expected_target_id = (
        str(workspace.home_page_id) if workspace.home_page_id is not None else None
    )

    if tab.slug != WORKSPACE_HOME_TAB_SLUG:
        tab.slug = WORKSPACE_HOME_TAB_SLUG
        changed = True
    if not tab.is_system:
        tab.is_system = True
        changed = True
    if tab.title != WORKSPACE_HOME_TAB_TITLE:
        tab.title = WORKSPACE_HOME_TAB_TITLE
        changed = True
    if tab.sort_order != 0:
        tab.sort_order = 0
        changed = True
    if not tab.is_visible:
        tab.is_visible = True
        changed = True
    if tab.object_type_id is not None:
        tab.object_type_id = None
        changed = True
    if str(tab.tab_type or "") != "page":
        tab.tab_type = "page"
        changed = True
    if tab.target_type != "page":
        tab.target_type = "page"
        changed = True
    if tab.target_id != expected_target_id:
        tab.target_id = expected_target_id
        changed = True
    if tab.url is not None:
        tab.url = None
        changed = True

    if changed:
        tab.updated_at = datetime.now(timezone.utc)
    return changed


def reconcile_duplicate_home_tabs(
    db: Session,
    workspace: DesignerWorkspace,
) -> DesignerWorkspaceTab | None:
    tabs = list_active_home_tabs(db, workspace.id)

    if len(tabs) > 1:
        canonical = tabs[0]
        ensure_home_tab_metadata(canonical, workspace=workspace)
        now = datetime.now(timezone.utc)
        for duplicate in tabs[1:]:
            logger.warning(
                "Deactivating duplicate workspace home tab workspace=%s duplicate=%s canonical=%s",
                workspace.id,
                duplicate.id,
                canonical.id,
            )
            duplicate.deleted_at = now
            duplicate.updated_at = now
        db.flush()
        return canonical

    if tabs:
        canonical = tabs[0]
        if ensure_home_tab_metadata(canonical, workspace=workspace):
            db.flush()
        return canonical

    revivable = _find_revivable_home_tab(db, workspace.id)
    if revivable is None:
        return None

    logger.warning(
        "Reviving soft-deleted workspace home tab workspace=%s tab=%s",
        workspace.id,
        revivable.id,
    )
    revivable.deleted_at = None
    revivable.deleted_by = None
    ensure_home_tab_metadata(revivable, workspace=workspace)
    db.flush()
    return revivable


def resolve_workspace_home_page(
    db: Session,
    *,
    tenant_id: int,
    workspace: DesignerWorkspace,
) -> Page | None:
    if workspace.home_page_id is None:
        return None

    page = (
        db.query(Page)
        .filter(
            Page.id == workspace.home_page_id,
            Page.portal_id == tenant_id,
            Page.deleted_at.is_(None),
        )
        .first()
    )
    if page is not None:
        return page

    logger.warning(
        "Clearing broken workspace home_page_id tenant=%s workspace=%s page_id=%s",
        tenant_id,
        workspace.id,
        workspace.home_page_id,
    )
    workspace.home_page_id = None
    workspace.updated_at = datetime.now(timezone.utc)
    db.flush()
    return None


def list_home_page_sections(
    db: Session,
    page_id: int,
) -> list[Section]:
    return (
        db.query(Section)
        .filter(Section.page_id == page_id)
        .order_by(Section.sort_order.asc(), Section.id.asc())
        .all()
    )


def reconcile_workspace_home_root_sections(
    db: Session,
    *,
    page: Page,
    section_title: str,
) -> bool:
    sections = list_home_page_sections(db, page.id)
    if not sections:
        db.add(
            Section(
                page_id=page.id,
                title=(section_title or page.title or WORKSPACE_HOME_TAB_TITLE).strip()
                or WORKSPACE_HOME_TAB_TITLE,
                description=None,
                layout="one_column",
                sort_order=WORKSPACE_HOME_ROOT_SECTION_SORT_ORDER,
                is_visible=True,
                settings={},
            )
        )
        db.flush()
        return True

    root_sections = [
        section
        for section in sections
        if int(section.sort_order or 0) == WORKSPACE_HOME_ROOT_SECTION_SORT_ORDER
    ]
    canonical = root_sections[0] if root_sections else sections[0]

    changed = False
    if int(canonical.sort_order or 0) != WORKSPACE_HOME_ROOT_SECTION_SORT_ORDER:
        canonical.sort_order = WORKSPACE_HOME_ROOT_SECTION_SORT_ORDER
        changed = True
    if not canonical.is_visible:
        canonical.is_visible = True
        changed = True

    duplicates = root_sections[1:] if root_sections else []
    for duplicate in duplicates:
        if duplicate.id == canonical.id:
            continue
        logger.warning(
            "Deactivating duplicate workspace home root section page=%s duplicate=%s canonical=%s",
            page.id,
            duplicate.id,
            canonical.id,
        )
        duplicate.is_visible = False
        changed = True

    if changed:
        db.flush()
    return changed


def audit_workspace_home_entities(db: Session) -> list[dict[str, object]]:
    rows = db.execute(
        text(
            """
            SELECT
                w.tenant_id,
                w.id AS workspace_id,
                w.slug AS workspace_slug,
                COUNT(t.id) FILTER (
                    WHERE t.deleted_at IS NULL
                      AND t.is_system IS TRUE
                      AND t.slug = 'home'
                ) AS home_tab_count,
                CASE
                    WHEN w.home_page_id IS NULL THEN 0
                    WHEN p.id IS NULL THEN 0
                    WHEN p.deleted_at IS NOT NULL THEN 0
                    ELSE 1
                END AS home_page_count,
                COALESCE(sec.root_section_count, 0) AS root_section_count
            FROM designer_workspaces w
            LEFT JOIN designer_workspace_tabs t ON t.workspace_id = w.id
            LEFT JOIN pages p
                ON p.id = w.home_page_id AND p.portal_id = w.tenant_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) FILTER (WHERE s.sort_order = 0 AND s.is_visible IS TRUE) AS root_section_count
                FROM sections s
                WHERE s.page_id = w.home_page_id
            ) sec ON w.home_page_id IS NOT NULL
            WHERE w.deleted_at IS NULL
            GROUP BY w.tenant_id, w.id, w.slug, w.home_page_id, p.id, p.deleted_at, sec.root_section_count
            ORDER BY w.tenant_id, w.slug
            """
        )
    ).mappings().all()
    return [dict(row) for row in rows]
