import sys

sys.path.insert(0, ".")
from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem

db = SessionLocal()
for tid in (13, 1):
    print("=== tenant", tid, "all runtime ===")
    items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tid,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.menu_scope == "runtime",
        )
        .order_by(NavigationItem.parent_id.nullsfirst(), NavigationItem.sort_order, NavigationItem.id)
        .all()
    )
    by_id = {i.id: i for i in items}
    for i in items:
        ptitle = by_id[i.parent_id].title if i.parent_id and i.parent_id in by_id else None
        print(i.id, i.title, i.type, "parent=", ptitle, i.url)
db.close()
