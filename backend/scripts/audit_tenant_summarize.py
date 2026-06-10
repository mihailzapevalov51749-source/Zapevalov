import json
from pathlib import Path

r = json.loads(Path(__file__).with_name("audit_tenant_1_vs_13_report.json").read_text(encoding="utf-8"))


def active_ot(tenant_key):
    out = []
    for key, rows in r["object_types"][tenant_key].items():
        for row in rows:
            if row["deleted_at"] is None:
                out.append(row)
    return out


t1_active = active_ot("tenant_1")
t13_active = active_ot("tenant_13")
print("=== ACTIVE OBJECT TYPES ===")
print("T1 active:", len(t1_active))
for x in sorted(t1_active, key=lambda i: i["key"]):
    print(f"  {x['key']}: {x['name']}")
print("T13 active:", len(t13_active))
for x in sorted(t13_active, key=lambda i: i["key"]):
    print(f"  {x['key']}: {x['name']}")

print("\n=== DELETED IN T1 (active in T13) ===")
t13_active_keys = {x["key"] for x in t13_active}
for key, rows in r["object_types"]["tenant_1"].items():
    active_t1 = [x for x in rows if x["deleted_at"] is None]
    if not active_t1 and key in t13_active_keys:
        print(f"  {key}")

print("\n=== FIELD DIFFS ===")
for d in r["field_diffs_shared_object_types"]:
    print(d)

print("\n=== VIEW DIFFS ===")
for d in r["view_diffs_shared_object_types"]:
    print(d)

print("\n=== PUBLISH ===")
print(json.dumps(r["publish"], ensure_ascii=False, indent=2))

print("\n=== RUNTIME ===")
print(json.dumps(r["runtime"], ensure_ascii=False, indent=2))

print("\n=== TRASH T1 ===")
for kind, items in r["trash"]["tenant_1"].items():
    print(kind, len(items))
    for it in items:
        print(" ", it)

print("\n=== WORKSPACES T13 ONLY ===")
for slug in r["summary"]["workspaces"]["only_t13_slugs"]:
    print(slug, r["workspaces"]["tenant_13"].get(slug))

print("\n=== NAV BROKEN T1 ===")
for n in r["navigation_issues"]["tenant_1"]:
    if n.get("issues"):
        print(n["title"], n["issues"], n.get("url"))
