import sys

sys.path.insert(0, ".")
from sqlalchemy import func

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import (
    DesignerWorkspace,
    DesignerWorkspaceTab,
)

db = SessionLocal()
for tid in (1, 13):
    pages_a = (
        db.query(func.count(Page.id))
        .filter(Page.portal_id == tid, Page.deleted_at.is_(None))
        .scalar()
    )
    pages_d = (
        db.query(func.count(Page.id))
        .filter(Page.portal_id == tid, Page.deleted_at.isnot(None))
        .scalar()
    )
    nav_a = (
        db.query(func.count(NavigationItem.id))
        .filter(NavigationItem.portal_id == tid, NavigationItem.deleted_at.is_(None))
        .scalar()
    )
    nav_d = (
        db.query(func.count(NavigationItem.id))
        .filter(NavigationItem.portal_id == tid, NavigationItem.deleted_at.isnot(None))
        .scalar()
    )
    views_a = (
        db.query(func.count(DesignerViewDefinition.id))
        .filter(
            DesignerViewDefinition.tenant_id == tid,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .scalar()
    )
    views_d = (
        db.query(func.count(DesignerViewDefinition.id))
        .filter(
            DesignerViewDefinition.tenant_id == tid,
            DesignerViewDefinition.deleted_at.isnot(None),
        )
        .scalar()
    )
    ws_a = (
        db.query(func.count(DesignerWorkspace.id))
        .filter(
            DesignerWorkspace.tenant_id == tid,
            DesignerWorkspace.deleted_at.is_(None),
        )
        .scalar()
    )
    tabs_a = (
        db.query(func.count(DesignerWorkspaceTab.id))
        .filter(
            DesignerWorkspaceTab.tenant_id == tid,
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .scalar()
    )
    print(
        f"tenant {tid}: pages active={pages_a} deleted={pages_d} "
        f"nav active={nav_a} deleted={nav_d} views active={views_a} deleted={views_d} "
        f"ws={ws_a} tabs={tabs_a}"
    )
db.close()
