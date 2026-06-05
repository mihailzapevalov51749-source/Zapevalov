"""Normalize pages.status to match actual publication placements (dry-run / apply)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.page_status_filter import resolve_navigation_page_id
from app.modules.pages.models import Page
from app.modules.pages.runtime_access import (
    PAGE_STATUS_DRAFT,
    PAGE_STATUS_HIDDEN,
    PAGE_STATUS_PUBLISHED,
    normalize_page_status,
)
from app.modules.platform.designer.workspaces.models import (
    DesignerWorkspace,
    DesignerWorkspaceTab,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PlacementRecord:
    kind: str
    visible: bool
    detail: str


@dataclass(frozen=True)
class PageStatusChange:
    page_id: int
    title: str
    old_status: str
    new_status: str
    reason: str
    placements: tuple[PlacementRecord, ...] = ()
    nav_item_ids_to_reset_visible: tuple[int, ...] = ()


@dataclass
class NormalizationResult:
    dry_run: bool
    checked_count: int = 0
    changed_count: int = 0
    skipped_soft_deleted: int = 0
    result_published: int = 0
    result_hidden: int = 0
    result_draft: int = 0
    nav_items_reset_visible: int = 0
    changes: list[PageStatusChange] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _workspace_is_active(workspace: DesignerWorkspace | None) -> bool:
    if workspace is None:
        return False
    return str(workspace.status or "").strip().lower() == "active"


def navigation_placement_visible(
    item: NavigationItem,
    current_page_status: str,
) -> bool:
    """Legacy-aware: is_visible=false hides; otherwise visible only when page is published."""
    if item.is_visible is False:
        return False
    return normalize_page_status(current_page_status) == PAGE_STATUS_PUBLISHED


def workspace_home_placement_visible(workspace: DesignerWorkspace | None) -> bool:
    return _workspace_is_active(workspace)


def workspace_tab_placement_visible(
    workspace: DesignerWorkspace | None,
    tab: DesignerWorkspaceTab,
) -> bool:
    if tab.is_visible is False:
        return False
    return _workspace_is_active(workspace)


def compute_target_status(
    placements: list[PlacementRecord],
) -> tuple[str, str]:
    if not placements:
        return PAGE_STATUS_DRAFT, "no publication placements"

    if any(placement.visible for placement in placements):
        visible_kinds = sorted(
            {placement.kind for placement in placements if placement.visible}
        )
        return (
            PAGE_STATUS_PUBLISHED,
            f"has visible publication placement ({', '.join(visible_kinds)})",
        )

    hidden_kinds = sorted({placement.kind for placement in placements})
    return (
        PAGE_STATUS_HIDDEN,
        f"has publication placements, all hidden ({', '.join(hidden_kinds)})",
    )


def collect_page_placements(
    db: Session,
    *,
    tenant_id: int | None = None,
) -> dict[int, list[PlacementRecord]]:
    placements_by_page: dict[int, list[PlacementRecord]] = {}

    def append(page_id: int, record: PlacementRecord) -> None:
        placements_by_page.setdefault(page_id, []).append(record)

    workspace_query = db.query(DesignerWorkspace).filter(
        DesignerWorkspace.deleted_at.is_(None),
    )
    if tenant_id is not None:
        workspace_query = workspace_query.filter(DesignerWorkspace.tenant_id == tenant_id)
    workspaces = workspace_query.all()
    workspace_by_id = {workspace.id: workspace for workspace in workspaces}

    for workspace in workspaces:
        if workspace.home_page_id is None:
            continue
        page_id = int(workspace.home_page_id)
        visible = workspace_home_placement_visible(workspace)
        append(
            page_id,
            PlacementRecord(
                kind="workspace_home",
                visible=visible,
                detail=f'workspace "{workspace.title}" status={workspace.status}',
            ),
        )

    tab_query = db.query(DesignerWorkspaceTab).filter(
        DesignerWorkspaceTab.deleted_at.is_(None),
    )
    if tenant_id is not None:
        tab_query = tab_query.filter(DesignerWorkspaceTab.tenant_id == tenant_id)
    tabs = tab_query.all()

    for tab in tabs:
        if str(tab.tab_type or "") != "page":
            continue
        target_id = str(tab.target_id or "").strip()
        if not target_id.isdigit():
            continue
        page_id = int(target_id)
        workspace = workspace_by_id.get(tab.workspace_id)
        visible = workspace_tab_placement_visible(workspace, tab)
        workspace_title = workspace.title if workspace is not None else "?"
        append(
            page_id,
            PlacementRecord(
                kind="workspace_tab",
                visible=visible,
                detail=(
                    f'workspace "{workspace_title}" tab "{tab.title}" '
                    f'visible={tab.is_visible is not False}'
                ),
            ),
        )

    nav_query = db.query(NavigationItem).filter(NavigationItem.deleted_at.is_(None))
    if tenant_id is not None:
        nav_query = nav_query.filter(NavigationItem.portal_id == tenant_id)
    nav_items = nav_query.all()

    page_status_cache: dict[int, str] = {}

    def page_status_for(page_id: int) -> str:
        if page_id not in page_status_cache:
            row = db.query(Page.status).filter(Page.id == page_id).first()
            page_status_cache[page_id] = normalize_page_status(
                row[0] if row is not None else PAGE_STATUS_DRAFT
            )
        return page_status_cache[page_id]

    for item in nav_items:
        page_id = resolve_navigation_page_id(item)
        if page_id is None:
            continue
        current_status = page_status_for(page_id)
        visible = navigation_placement_visible(item, current_status)
        append(
            page_id,
            PlacementRecord(
                kind="navigation",
                visible=visible,
                detail=(
                    f'navigation "{item.title}" is_visible={item.is_visible} '
                    f'page_status={current_status}'
                ),
            ),
        )

    return placements_by_page


def plan_page_status_changes(
    db: Session,
    *,
    tenant_id: int | None = None,
) -> list[PageStatusChange]:
    placements_by_page = collect_page_placements(db, tenant_id=tenant_id)

    page_query = db.query(Page)
    if tenant_id is not None:
        page_query = page_query.filter(Page.portal_id == tenant_id)
    pages = page_query.order_by(Page.id.asc()).all()

    nav_query = db.query(NavigationItem).filter(NavigationItem.deleted_at.is_(None))
    if tenant_id is not None:
        nav_query = nav_query.filter(NavigationItem.portal_id == tenant_id)
    nav_items_by_page: dict[int, list[NavigationItem]] = {}
    for item in nav_query.all():
        page_id = resolve_navigation_page_id(item)
        if page_id is None:
            continue
        nav_items_by_page.setdefault(page_id, []).append(item)

    changes: list[PageStatusChange] = []

    for page in pages:
        if page.deleted_at is not None:
            continue

        page_id = int(page.id)
        old_status = normalize_page_status(page.status)
        placements = placements_by_page.get(page_id, [])
        new_status, reason = compute_target_status(placements)

        nav_reset_ids: list[int] = []
        for item in nav_items_by_page.get(page_id, []):
            if item.is_visible is False:
                nav_reset_ids.append(int(item.id))

        if old_status == new_status and not nav_reset_ids:
            continue

        if old_status != new_status and "navigation binding" not in reason:
            if any(
                placement.kind == "navigation" and not placement.visible
                for placement in placements
            ) and new_status == PAGE_STATUS_HIDDEN:
                reason = "has navigation binding, all placements hidden"

        changes.append(
            PageStatusChange(
                page_id=page_id,
                title=str(page.title or ""),
                old_status=old_status,
                new_status=new_status,
                reason=reason,
                placements=tuple(placements),
                nav_item_ids_to_reset_visible=tuple(nav_reset_ids),
            )
        )

    return changes


def normalize_page_statuses(
    db: Session,
    *,
    dry_run: bool = True,
    tenant_id: int | None = None,
) -> NormalizationResult:
    result = NormalizationResult(dry_run=dry_run)

    page_query = db.query(Page)
    if tenant_id is not None:
        page_query = page_query.filter(Page.portal_id == tenant_id)
    all_pages = page_query.all()

    result.checked_count = len(all_pages)
    result.skipped_soft_deleted = sum(1 for page in all_pages if page.deleted_at is not None)

    changes = plan_page_status_changes(db, tenant_id=tenant_id)
    result.changes = changes
    result.changed_count = sum(
        1
        for change in changes
        if change.old_status != change.new_status
    )

    status_counts = {PAGE_STATUS_PUBLISHED: 0, PAGE_STATUS_HIDDEN: 0, PAGE_STATUS_DRAFT: 0}
    for page in all_pages:
        if page.deleted_at is not None:
            continue
        page_id = int(page.id)
        change = next((item for item in changes if item.page_id == page_id), None)
        final_status = change.new_status if change else normalize_page_status(page.status)
        status_counts[final_status] = status_counts.get(final_status, 0) + 1

    result.result_published = status_counts[PAGE_STATUS_PUBLISHED]
    result.result_hidden = status_counts[PAGE_STATUS_HIDDEN]
    result.result_draft = status_counts[PAGE_STATUS_DRAFT]

    nav_ids_to_reset: set[int] = set()
    for change in changes:
        nav_ids_to_reset.update(change.nav_item_ids_to_reset_visible)
    result.nav_items_reset_visible = len(nav_ids_to_reset)

    if dry_run:
        _log_normalization_result(result)
        return result

    now = datetime.now(timezone.utc)
    try:
        for change in changes:
            if change.old_status != change.new_status:
                db.execute(
                    text(
                        """
                        UPDATE pages
                        SET status = :status, updated_at = :updated_at
                        WHERE id = :page_id
                        """
                    ),
                    {
                        "status": change.new_status,
                        "updated_at": now,
                        "page_id": change.page_id,
                    },
                )

            for nav_item_id in change.nav_item_ids_to_reset_visible:
                db.execute(
                    text(
                        """
                        UPDATE navigation_items
                        SET is_visible = TRUE
                        WHERE id = :nav_item_id
                        """
                    ),
                    {"nav_item_id": nav_item_id},
                )

        db.commit()
    except Exception as exc:
        db.rollback()
        result.errors.append(str(exc))
        logger.exception("page status normalization failed")
        raise

    _log_normalization_result(result)
    return result


def _log_normalization_result(result: NormalizationResult) -> None:
    mode: Literal["dry-run", "apply"] = "dry-run" if result.dry_run else "apply"
    logger.info(
        "page status normalization (%s): checked=%s changed=%s skipped_soft_deleted=%s "
        "published=%s hidden=%s draft=%s nav_items_reset=%s errors=%s",
        mode,
        result.checked_count,
        result.changed_count,
        result.skipped_soft_deleted,
        result.result_published,
        result.result_hidden,
        result.result_draft,
        result.nav_items_reset_visible,
        len(result.errors),
    )
    for change in result.changes:
        if change.old_status == change.new_status and not change.nav_item_ids_to_reset_visible:
            continue
        logger.info(
            "page_id=%s title=%r old_status=%s new_status=%s reason=%s nav_reset=%s",
            change.page_id,
            change.title,
            change.old_status,
            change.new_status,
            change.reason,
            list(change.nav_item_ids_to_reset_visible),
        )


def format_change_report(change: PageStatusChange) -> str:
    lines = [
        f"page_id: {change.page_id}",
        f"title: {change.title}",
        f"old_status: {change.old_status}",
        f"new_status: {change.new_status}",
        f"reason: {change.reason}",
    ]
    if change.nav_item_ids_to_reset_visible:
        lines.append(
            f"nav_items_reset_visible: {list(change.nav_item_ids_to_reset_visible)}"
        )
    return "\n".join(lines)
