import re
import sys

sys.path.insert(0, ".")
from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem

db = SessionLocal()
SOURCE, TARGET = 13, 1


def norm_url(url):
    if not url:
        return ""
    u = re.sub(r"/portal/\d+", "/portal/{id}", url)
    return u.replace("/designer/tenant/13", "/designer/tenant/{id}").replace(
        "/designer/tenant/1", "/designer/tenant/{id}"
    )


def item_key(item, parent_key):
    return (
        item.menu_scope,
        parent_key,
        item.title,
        item.type,
        norm_url(item.url),
        item.system_key or "",
    )


def collect(tenant_id):
    items = (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == tenant_id)
        .order_by(NavigationItem.id)
        .all()
    )
    by_id = {i.id: i for i in items}
    out = []
    for item in items:
        if item.deleted_at:
            continue
        pk = None
        if item.parent_id and item.parent_id in by_id:
            p = by_id[item.parent_id]
            pk = (p.menu_scope, p.title, p.type, norm_url(p.url), p.system_key or "")
        out.append(
            {
                "id": item.id,
                "key": item_key(item, pk),
                "title": item.title,
                "type": item.type,
                "menu_scope": item.menu_scope,
                "system_key": item.system_key,
                "url": item.url,
                "parent_id": item.parent_id,
            }
        )
    return out


s13 = {i["key"]: i for i in collect(SOURCE)}
t1 = {i["key"]: i for i in collect(TARGET)}
print("T13 active", len(s13), "T1 active", len(t1))
print("\nCREATE candidates:")
for k, v in sorted(s13.items(), key=lambda x: (str(x[0][0]), str(x[0][2]))):
    if k not in t1:
        print(v["id"], v["title"], v["type"], v["menu_scope"], v["url"])
print("create count", sum(1 for k in s13 if k not in t1))
print("\nSKIP (in both):")
for k in sorted(s13.keys()):
    if k in t1:
        pass
print("skip count", len(set(s13) & set(t1)))
db.close()
