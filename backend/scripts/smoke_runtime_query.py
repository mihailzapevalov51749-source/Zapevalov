#!/usr/bin/env python3
"""Smoke test for Runtime Query Layer MVP."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from typing import Any

BASE = "http://127.0.0.1:8000"
TENANT = 1


def req(method: str, path: str, body: dict | None = None) -> tuple[int, Any]:
    url = f"{BASE}{path}"
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = raw
        return exc.code, payload


def main() -> int:
    results: list[str] = []
    failures: list[str] = []

    def ok(name: str, cond: bool, detail: str = "") -> None:
        status = "PASS" if cond else "FAIL"
        line = f"[{status}] {name}" + (f" — {detail}" if detail else "")
        results.append(line)
        if not cond:
            failures.append(line)

    # 1. OpenAPI route
    status, openapi = req("GET", "/openapi.json")
    paths = openapi.get("paths", {}) if isinstance(openapi, dict) else {}
    query_path = "/runtime/query/tenants/{tenant_id}/{object_type_key}"
    ok("openapi reachable", status == 200, f"status={status}")
    ok("query route in openapi", query_path in paths, query_path)
    if query_path in paths:
        get_op = paths[query_path].get("get", {})
        ok("query tag runtime-query", "runtime-query" in get_op.get("tags", []))

    # 2. Catalog
    status, catalog = req("GET", f"/runtime/platform-metadata/tenants/{TENANT}/catalog")
    ok("catalog GET", status == 200, f"status={status}")
    object_types = []
    field_keys_by_ot: dict[str, list[str]] = {}
    if isinstance(catalog, dict):
        object_types = [ot.get("key") for ot in catalog.get("object_types", []) if ot.get("key")]
        for ot in catalog.get("object_types", []):
            key = ot.get("key")
            if key:
                field_keys_by_ot[key] = [
                    f.get("key") for f in (ot.get("fields") or []) if f.get("key")
                ]
        ok(
            "catalog has versions",
            "schema_version" in catalog and "catalog_version" in catalog,
            f"schema={catalog.get('schema_version')} catalog={catalog.get('catalog_version')}",
        )

    status, version = req("GET", f"/runtime/platform-metadata/tenants/{TENANT}/catalog/version")
    ok("catalog/version GET", status == 200, f"status={status}")

    # Pick object types
    primary_ot = "project_test" if "project_test" in object_types else (object_types[0] if object_types else None)
    secondary_ot = next(
        (k for k in ("contractor", "task") if k in object_types and k != primary_ot),
        next((k for k in object_types if k != primary_ot), None),
    )
    ok("primary object_type available", primary_ot is not None, str(primary_ot))

    created_ids: list[str] = []
    smoke_tag = "smoke_query_mvp"

    def create_entity(ot_key: str, suffix: str, extra_values: dict | None = None) -> str | None:
        fields = field_keys_by_ot.get(ot_key, [])
        values: dict[str, Any] = {}
        if fields:
            first = fields[0]
            values[first] = f"{smoke_tag}_{suffix}"
        if extra_values:
            values.update(extra_values)
        st, data = req(
            "POST",
            f"/runtime/entities/tenants/{TENANT}/{ot_key}",
            {"values": values},
        )
        if st == 201 and isinstance(data, dict):
            return data.get("id")
        return None

    # 3. Create entities
    if primary_ot:
        for i in range(3):
            eid = create_entity(primary_ot, f"p{i}")
            ok(f"create entity {primary_ot} #{i+1}", eid is not None, eid or "failed")
            if eid:
                created_ids.append(eid)

    if secondary_ot:
        for i in range(2):
            eid = create_entity(secondary_ot, f"s{i}")
            ok(f"create entity {secondary_ot} #{i+1}", eid is not None, eid or "failed")

    # 4. Query baseline
    if primary_ot:
        st, baseline = req("GET", f"/runtime/query/tenants/{TENANT}/{primary_ot}")
        ok("query baseline", st == 200, f"status={st}")
        if isinstance(baseline, dict):
            ok("baseline has items", "items" in baseline)
            ok("baseline has pagination", "pagination" in baseline)
            pag = baseline.get("pagination") or {}
            ok(
                "pagination shape",
                all(k in pag for k in ("limit", "offset", "total", "has_more")),
                str(pag),
            )
            global BASELINE_SAMPLE
            BASELINE_SAMPLE = baseline

            # 5. Pagination
            st1, p0 = req("GET", f"/runtime/query/tenants/{TENANT}/{primary_ot}?limit=1&offset=0")
            st2, p1 = req("GET", f"/runtime/query/tenants/{TENANT}/{primary_ot}?limit=1&offset=1")
            ok("pagination limit=1 offset=0", st1 == 200 and len((p0 or {}).get("items", [])) <= 1)
            if isinstance(p0, dict) and isinstance(p1, dict):
                total = p0.get("pagination", {}).get("total", 0)
                has_more_0 = p0.get("pagination", {}).get("has_more")
                ok("pagination total>=1", total >= 1, f"total={total}")
                ok(
                    "pagination has_more when total>1",
                    (total <= 1) or (has_more_0 is True),
                    f"has_more={has_more_0}",
                )
                if total >= 2:
                    id0 = p0["items"][0]["id"] if p0.get("items") else None
                    id1 = p1["items"][0]["id"] if p1.get("items") else None
                    ok("offset changes item", id0 != id1, f"{id0} vs {id1}")

            # 6. Sort
            for sort, order in [("created_at", "desc"), ("updated_at", "asc")]:
                st_s, sorted_resp = req(
                    "GET",
                    f"/runtime/query/tenants/{TENANT}/{primary_ot}?sort={sort}&order={order}&limit=5",
                )
                ok(f"sort {sort} {order}", st_s == 200, f"status={st_s}")

            sort_field = next((f for f in field_keys_by_ot.get(primary_ot, []) if f != "id"), None)
            if sort_field:
                st_sf, _ = req(
                    "GET",
                    f"/runtime/query/tenants/{TENANT}/{primary_ot}?sort={sort_field}&order=asc&limit=5",
                )
                ok(f"sort field {sort_field}", st_sf == 200)

            # 7. Filters
            filter_field = field_keys_by_ot.get(primary_ot, [None])[0]
            if filter_field:
                filter_val = f"{smoke_tag}_p0"
                st_f, filtered = req(
                    "GET",
                    f"/runtime/query/tenants/{TENANT}/{primary_ot}?filter.{filter_field}={filter_val}",
                )
                ok("filter eq", st_f == 200, f"status={st_f}")
                if isinstance(filtered, dict):
                    items = filtered.get("items", [])
                    ok(
                        "filter returns matches",
                        all(
                            (it.get("values") or {}).get(filter_field) == filter_val
                            for it in items
                        ),
                        f"count={len(items)}",
                    )

            st_422f, _ = req(
                "GET",
                f"/runtime/query/tenants/{TENANT}/{primary_ot}?filter.__unknown_field__=x",
            )
            ok("unknown filter 422", st_422f == 422, f"status={st_422f}")

            st_422s, _ = req(
                "GET",
                f"/runtime/query/tenants/{TENANT}/{primary_ot}?sort=__bad_sort__",
            )
            ok("bad sort 422", st_422s == 422, f"status={st_422s}")

        st_404, _ = req("GET", f"/runtime/query/tenants/{TENANT}/__unknown_object_type__")
        ok("unknown object_type 404", st_404 == 404, f"status={st_404}")

        # 8. Soft delete
        if created_ids:
            del_id = created_ids[0]
            st_del, _ = req(
                "DELETE",
                f"/runtime/entities/tenants/{TENANT}/{primary_ot}/{del_id}",
            )
            ok("soft delete entity", st_del in (200, 204), f"status={st_del}")
            st_after, after = req("GET", f"/runtime/query/tenants/{TENANT}/{primary_ot}?limit=200")
            if isinstance(after, dict):
                ids_after = {it["id"] for it in after.get("items", [])}
                ok("deleted entity not in query", del_id not in ids_after, del_id)

    print("\n".join(results))
    print("\n--- SUMMARY ---")
    print(f"FAILURES: {len(failures)}")
    if failures:
        for f in failures:
            print(f"  {f}")
        return 1
    return 0


BASELINE_SAMPLE: dict | None = None

if __name__ == "__main__":
    rc = main()
    if BASELINE_SAMPLE:
        print("\n--- BASELINE JSON SAMPLE ---")
        print(json.dumps(BASELINE_SAMPLE, indent=2, ensure_ascii=False)[:2000])
    sys.exit(rc)
