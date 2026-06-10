import sys

sys.path.insert(0, ".")
from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem

db = SessionLocal()
for tid in (13, 1):
    print("=== tenant", tid, "designer ===")
    items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tid,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.menu_scope == "designer",
        )
        .order_by(NavigationItem.sort_order, NavigationItem.id)
        .all()
    )
    for i in items:
        print(i.id, i.title, i.type, i.system_key, i.url)
    print("=== tenant", tid, "runtime workspace ===")
    items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tid,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.type == "workspace",
        )
        .order_by(NavigationItem.title)
        .all()
    )
    for i in items:
        print(i.id, i.title, i.parent_id, i.url)
db.close()
