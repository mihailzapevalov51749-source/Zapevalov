"""Audit Workspace Home Tab / Page / Root Section per workspace."""

from __future__ import annotations

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.platform.designer.workspaces.models import DesignerWorkspace
from app.modules.platform.designer.workspaces.service import (
    ensure_workspace_home_page,
    ensure_workspace_tabs,
)
from app.modules.portals.models import Portal  # noqa: F401
from app.modules.users.models import User  # noqa: F401


def main() -> None:
    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    w.tenant_id,
                    w.id AS workspace_id,
                    w.slug AS workspace_slug,
                    w.home_page_id,
                    COUNT(t.id) FILTER (
                        WHERE t.deleted_at IS NULL
                          AND t.is_system IS TRUE
                          AND t.slug = 'home'
                    ) AS home_tab_count,
                    COUNT(t.id) FILTER (
                        WHERE t.deleted_at IS NULL AND t.slug = 'home'
                    ) AS home_slug_tab_count,
                    CASE
                        WHEN w.home_page_id IS NULL THEN 0
                        WHEN p.id IS NULL THEN 0
                        WHEN p.deleted_at IS NOT NULL THEN 0
                        ELSE 1
                    END AS home_page_count,
                    COALESCE(sec.section_count, 0) AS root_section_count,
                    COALESCE(sec.section_total, 0) AS section_total
                FROM designer_workspaces w
                LEFT JOIN designer_workspace_tabs t ON t.workspace_id = w.id
                LEFT JOIN pages p
                    ON p.id = w.home_page_id AND p.portal_id = w.tenant_id
                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(*) FILTER (WHERE s.sort_order = 0) AS section_count,
                        COUNT(*) AS section_total
                    FROM sections s
                    WHERE s.page_id = w.home_page_id
                ) sec ON w.home_page_id IS NOT NULL
                WHERE w.deleted_at IS NULL
                GROUP BY
                    w.tenant_id,
                    w.id,
                    w.slug,
                    w.home_page_id,
                    p.id,
                    p.deleted_at,
                    sec.section_count,
                    sec.section_total
                ORDER BY w.tenant_id, w.slug
                """
            )
        ).mappings().all()

        dup_tabs = [r for r in rows if int(r["home_tab_count"] or 0) > 1]
        dup_slug_tabs = [r for r in rows if int(r["home_slug_tab_count"] or 0) > 1]
        missing_tab = [r for r in rows if int(r["home_tab_count"] or 0) == 0]
        missing_page = [r for r in rows if int(r["home_page_count"] or 0) == 0]
        multi_root = [r for r in rows if int(r["root_section_count"] or 0) > 1]
        no_section = [
            r for r in rows
            if int(r["home_page_count"] or 0) == 1 and int(r["section_total"] or 0) == 0
        ]

        print("TOTAL_WORKSPACES", len(rows))
        print("DUP_HOME_TABS", len(dup_tabs))
        print("DUP_SLUG_HOME_TABS", len(dup_slug_tabs))
        print("MISSING_HOME_TAB", len(missing_tab))
        print("MISSING_HOME_PAGE", len(missing_page))
        print("MULTI_ROOT_SECTIONS", len(multi_root))
        print("NO_SECTION", len(no_section))

        for label, items in (
            ("DUP_TAB", dup_tabs),
            ("MISSING_TAB", missing_tab),
            ("MISSING_PAGE", missing_page),
            ("MULTI_ROOT", multi_root),
            ("NO_SECTION", no_section),
        ):
            for r in items[:15]:
                print(label, dict(r))
            if len(items) > 15:
                print(label, "...", len(items) - 15, "more")

        print("---TABLE---")
        print("tenant\tworkspace\thome_tab\thome_page\troot_sections\ttotal_sections")
        for r in rows:
            print(
                f"{r['tenant_id']}\t{r['workspace_slug']}\t{r['home_tab_count']}\t"
                f"{r['home_page_count']}\t{r['root_section_count']}\t{r['section_total']}"
            )

        changed = 0
        for workspace in (
            db.query(DesignerWorkspace)
            .filter(DesignerWorkspace.deleted_at.is_(None))
            .order_by(DesignerWorkspace.tenant_id, DesignerWorkspace.slug)
            .all()
        ):
            ensure_workspace_home_page(
                db,
                tenant_id=workspace.tenant_id,
                workspace_id=workspace.id,
            )
            ensure_workspace_tabs(
                db,
                tenant_id=workspace.tenant_id,
                workspace_id=workspace.id,
            )
            changed += 1
        if changed:
            print("ENSURE_WORKSPACES", changed)

        post_rows = db.execute(
            text(
                """
                SELECT
                    w.tenant_id,
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
                GROUP BY w.tenant_id, w.slug, w.home_page_id, p.id, p.deleted_at, sec.root_section_count
                ORDER BY w.tenant_id, w.slug
                """
            )
        ).mappings().all()
        post_dups = sum(
            1
            for r in post_rows
            if int(r["home_tab_count"] or 0) > 1
            or int(r["home_page_count"] or 0) > 1
            or int(r["root_section_count"] or 0) > 1
        )
        post_missing = sum(
            1
            for r in post_rows
            if int(r["home_tab_count"] or 0) != 1
            or int(r["home_page_count"] or 0) != 1
            or int(r["root_section_count"] or 0) < 1
        )
        print("POST_DUPLICATES", post_dups)
        print("POST_INVALID", post_missing)
        print("---POST_TABLE---")
        for r in post_rows:
            print(
                f"{r['tenant_id']}\t{r['workspace_slug']}\t{r['home_tab_count']}\t"
                f"{r['home_page_count']}\t{r['root_section_count']}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
