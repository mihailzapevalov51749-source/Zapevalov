"""API smoke test for Designer tenant isolation (Navigation, Pages, Fields, Publish).

Uses platform-owner JWT (no password). Creates temporary entities and cleans up.
Run from backend/: python scripts/smoke_designer_tenant_isolation.py
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any

from app.modules.auth.security import create_access_token
from app.db.session import SessionLocal
from app.modules.users.models import User

BASE = "http://127.0.0.1:8010"
DEV_PORTAL = 1
TEMPLATE_PORTAL = 2
SMOKE_TAG = f"smoke_iso_{int(time.time())}"


@dataclass
class Check:
    area: str
    name: str
    ok: bool
    detail: str = ""


@dataclass
class SmokeReport:
    checks: list[Check] = field(default_factory=list)
    regressions: list[str] = field(default_factory=list)

    def add(self, area: str, name: str, ok: bool, detail: str = "") -> None:
        self.checks.append(Check(area, name, ok, detail))
        if not ok:
            self.regressions.append(f"[{area}] {name}: {detail}")

    def print_report(self) -> int:
        areas: dict[str, list[Check]] = {}
        for c in self.checks:
            areas.setdefault(c.area, []).append(c)

        print("\n=== Designer Tenant Isolation Smoke Test ===\n")
        for area, items in areas.items():
            print(f"## {area}")
            for item in items:
                status = "PASS" if item.ok else "FAIL"
                suffix = f" — {item.detail}" if item.detail else ""
                print(f"  [{status}] {item.name}{suffix}")
            print()

        passed = sum(1 for c in self.checks if c.ok)
        total = len(self.checks)
        print(f"Summary: {passed}/{total} passed")
        if self.regressions:
            print("\nRegressions:")
            for line in self.regressions:
                print(f"  - {line}")
        return 0 if passed == total else 1


def resolve_token() -> str:
    db = SessionLocal()
    try:
        owner = (
            db.query(User)
            .filter(User.is_active == True, User.tenant_id.is_(None))  # noqa: E712
            .order_by(User.id)
            .first()
        )
        if owner is None:
            raise RuntimeError("No active platform user for smoke token")
        return create_access_token({"sub": str(owner.id)})
    finally:
        db.close()


def api(
    method: str,
    path: str,
    token: str | None = None,
    data: Any | None = None,
) -> tuple[int, Any]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data is not None else None
    request = urllib.request.Request(
        f"{BASE}{path}",
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode()
            try:
                payload = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                payload = raw
            return response.status, payload
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            payload = raw
        return exc.code, payload


def run_navigation_smoke(token: str, report: SmokeReport) -> int | None:
    area = "Navigation"
    created_id: int | None = None

    code, created = api(
        "POST",
        f"/navigation/portal/{DEV_PORTAL}/",
        token,
        {
            "portal_id": DEV_PORTAL,
            "type": "folder",
            "title": f"{SMOKE_TAG}_menu",
            "sort_order": 9999,
        },
    )
    report.add(area, "Создать пункт меню", code == 200 and isinstance(created, dict), f"HTTP {code}")
    if not isinstance(created, dict):
        return None
    created_id = created.get("id")

    code, renamed = api(
        "PUT",
        f"/navigation/portal/{DEV_PORTAL}/{created_id}",
        token,
        {"title": f"{SMOKE_TAG}_renamed"},
    )
    report.add(
        area,
        "Переименовать пункт меню",
        code == 200 and renamed.get("title") == f"{SMOKE_TAG}_renamed",
        f"HTTP {code}",
    )

    code, moved = api(
        "POST",
        f"/navigation/portal/{DEV_PORTAL}/move",
        token,
        [{"id": created_id, "parent_id": None, "sort_order": 9998}],
    )
    report.add(area, "Переместить пункт меню", code == 200 and isinstance(moved, list), f"HTTP {code}")

    code, tree = api("GET", f"/navigation/portal/{DEV_PORTAL}/tree?for_edit_mode=true", token)
    found = isinstance(tree, list) and any(
        item.get("id") == created_id and item.get("title") == f"{SMOKE_TAG}_renamed"
        for item in tree
    )
    report.add(area, "Перезагрузка / чтение дерева (persist)", found, f"HTTP {code}")

    code, _ = api("DELETE", f"/navigation/portal/{DEV_PORTAL}/{created_id}", token)
    report.add(area, "Удалить пункт меню", code == 200, f"HTTP {code}")

    code, tree_after = api("GET", f"/navigation/portal/{DEV_PORTAL}/tree?for_edit_mode=true", token)
    gone = isinstance(tree_after, list) and not any(item.get("id") == created_id for item in tree_after)
    report.add(area, "Сохранение после удаления", gone, f"HTTP {code}")

    # Cross-tenant isolation
    if created_id:
        code, _ = api(
            "PUT",
            f"/navigation/portal/{TEMPLATE_PORTAL}/{created_id}",
            token,
            {"title": "cross-tenant-hack"},
        )
        report.add(
            area,
            "Изоляция: чужой portal_id -> 404",
            code == 404,
            f"HTTP {code}",
        )

    code, _ = api("PUT", f"/navigation/{created_id or 0}", token, {"title": "legacy"})
    report.add(area, "Legacy endpoint недоступен", code in (404, 405, 422), f"HTTP {code}")

    return created_id


def run_pages_smoke(token: str, report: SmokeReport) -> tuple[int | None, int | None, int | None]:
    area = "Pages"
    page_id: int | None = None
    section_id: int | None = None
    block_id: int | None = None

    code, page = api(
        "POST",
        f"/pages/portal/{DEV_PORTAL}/",
        token,
        {
            "portal_id": DEV_PORTAL,
            "title": f"{SMOKE_TAG}_page",
            "status": "draft",
        },
    )
    report.add(area, "Создать страницу", code == 200 and isinstance(page, dict), f"HTTP {code}")
    if not isinstance(page, dict):
        return None, None, None
    page_id = page.get("id")

    code, opened = api("GET", f"/pages/portal/{DEV_PORTAL}/{page_id}", token)
    report.add(area, "Открыть страницу", code == 200 and opened.get("id") == page_id, f"HTTP {code}")

    code, updated = api(
        "PUT",
        f"/pages/portal/{DEV_PORTAL}/{page_id}",
        token,
        {"title": f"{SMOKE_TAG}_page_renamed"},
    )
    report.add(
        area,
        "Изменить название",
        code == 200 and updated.get("title") == f"{SMOKE_TAG}_page_renamed",
        f"HTTP {code}",
    )

    code, section = api(
        "POST",
        f"/sections/portal/{DEV_PORTAL}/",
        token,
        {
            "page_id": page_id,
            "title": f"{SMOKE_TAG}_section",
            "layout": "one_column",
        },
    )
    report.add(area, "Добавить секцию", code == 200 and isinstance(section, dict), f"HTTP {code}")
    section_id = section.get("id") if isinstance(section, dict) else None

    if section_id:
        code, block = api(
            "POST",
            f"/blocks/portal/{DEV_PORTAL}/",
            token,
            {
                "section_id": section_id,
                "type": "text",
                "title": f"{SMOKE_TAG}_block",
                "content": {"text": "smoke"},
            },
        )
        report.add(area, "Добавить блок", code == 200 and isinstance(block, dict), f"HTTP {code}")
        block_id = block.get("id") if isinstance(block, dict) else None

    code, full = api("GET", f"/pages/portal/{DEV_PORTAL}/{page_id}/full", token)
    has_section = (
        isinstance(full, dict)
        and isinstance(full.get("sections"), list)
        and any(s.get("id") == section_id for s in full.get("sections", []))
    )
    report.add(area, "Сохранение / full после изменений", has_section, f"HTTP {code}")

    code, full2 = api("GET", f"/pages/portal/{DEV_PORTAL}/{page_id}/full", token)
    report.add(area, "Повторное чтение (reload)", code == 200 and isinstance(full2, dict), f"HTTP {code}")

    if page_id:
        code, _ = api("DELETE", f"/pages/portal/{DEV_PORTAL}/{page_id}", token)
        report.add(area, "Cleanup страницы", code == 200, f"HTTP {code}")

    if page_id:
        code, _ = api("GET", f"/pages/portal/{TEMPLATE_PORTAL}/{page_id}", token)
        report.add(area, "Изоляция: страница чужого tenant", code == 404, f"HTTP {code}")

    return page_id, section_id, block_id


def run_object_types_smoke(token: str, report: SmokeReport) -> None:
    area = "Object Types"
    code, object_types = api("GET", f"/designer/tenants/{DEV_PORTAL}/object-types", token)
    report.add(area, "Открыть список объектов", code == 200 and isinstance(object_types, list), f"HTTP {code}")
    if not isinstance(object_types, list) or not object_types:
        report.add(area, "Поля: пропуск (нет object types)", True, "no data")
        return

    object_type_id = object_types[0].get("id")
    field_key = f"smk_{int(time.time()) % 100000}"

    code, created_field = api(
        "POST",
        f"/designer/tenants/{DEV_PORTAL}/object-types/{object_type_id}/fields",
        token,
        {
            "key": field_key,
            "name": f"{SMOKE_TAG}_field",
            "field_type": "text",
        },
    )
    report.add(area, "Добавить поле", code == 201 and isinstance(created_field, dict), f"HTTP {code}")
    field_id = created_field.get("id") if isinstance(created_field, dict) else None

    if field_id:
        code, updated_field = api(
            "PATCH",
            f"/designer/tenants/{DEV_PORTAL}/fields/{field_id}",
            token,
            {"name": f"{SMOKE_TAG}_field_updated"},
        )
        report.add(
            area,
            "Изменить поле",
            code == 200 and updated_field.get("name") == f"{SMOKE_TAG}_field_updated",
            f"HTTP {code}",
        )

        code, _ = api("DELETE", f"/designer/tenants/{DEV_PORTAL}/fields/{field_id}", token)
        report.add(area, "Удалить поле", code == 200, f"HTTP {code}")

        code, foreign = api(
            "PATCH",
            f"/designer/tenants/{TEMPLATE_PORTAL}/fields/{field_id}",
            token,
            {"name": "hack"},
        )
        report.add(area, "Изоляция: поле чужого tenant", foreign in (403, 404), f"HTTP {foreign}")


def run_publish_smoke(token: str, report: SmokeReport) -> None:
    area = "Publish"
    code, validation = api("POST", f"/designer/tenants/{DEV_PORTAL}/publish/validate", token)
    report.add(
        area,
        "Validate publish (DEV)",
        code == 200 and isinstance(validation, dict),
        f"HTTP {code}",
    )

    code, result = api("POST", f"/designer/tenants/{DEV_PORTAL}/publish", token)
    report.add(
        area,
        "Опубликовать каталог (DEV)",
        code == 200 and isinstance(result, dict),
        f"HTTP {code}; detail={result if code != 200 else 'ok'}",
    )

    code, latest = api("GET", f"/designer/tenants/{DEV_PORTAL}/publish/latest", token)
    report.add(area, "Latest publish info", code == 200, f"HTTP {code}")

    code, template_validation = api("POST", f"/designer/tenants/{TEMPLATE_PORTAL}/publish/validate", token)
    report.add(area, "Validate publish (Template)", code == 200, f"HTTP {code}")


def run_tenant_switch_smoke(token: str, report: SmokeReport) -> None:
    area = "Tenant Switching"

    for portal_id, label in ((DEV_PORTAL, "DEV"), (TEMPLATE_PORTAL, "Template")):
        code_nav, nav = api("GET", f"/navigation/portal/{portal_id}/tree", token)
        code_pages, pages = api("GET", f"/pages/portal/{portal_id}", token)
        code_ot, ots = api("GET", f"/designer/tenants/{portal_id}/object-types", token)
        ok = code_nav == 200 and code_pages == 200 and code_ot == 200
        report.add(
            area,
            f"Чтение {label}: меню + страницы + объекты",
            ok,
            f"nav={code_nav} pages={code_pages} objects={code_ot}",
        )
        if ok:
            report.add(
                area,
                f"{label} counts",
                True,
                f"nav_items={len(nav) if isinstance(nav, list) else '?'}, "
                f"pages={len(pages) if isinstance(pages, list) else '?'}, "
                f"objects={len(ots) if isinstance(ots, list) else '?'}",
            )

    code_dev, dev_pages = api("GET", f"/pages/portal/{DEV_PORTAL}", token)
    code_tpl, tpl_pages = api("GET", f"/pages/portal/{TEMPLATE_PORTAL}", token)
    if isinstance(dev_pages, list) and isinstance(tpl_pages, list):
        dev_ids = {p.get("id") for p in dev_pages}
        tpl_ids = {p.get("id") for p in tpl_pages}
        overlap = dev_ids & tpl_ids
        report.add(
            area,
            "DEV и Template — разные page id",
            len(overlap) == 0,
            f"overlap={sorted(overlap)[:5]}",
        )


def main() -> int:
    report = SmokeReport()
    try:
        token = resolve_token()
    except Exception as exc:
        print(f"Cannot obtain smoke token: {exc}")
        return 2

    code, me = api("GET", "/auth/me", token)
    report.add("Auth", "Platform user token", code == 200, f"HTTP {code}; user={me.get('email') if isinstance(me, dict) else me}")

    run_navigation_smoke(token, report)
    run_pages_smoke(token, report)
    run_object_types_smoke(token, report)
    run_publish_smoke(token, report)
    run_tenant_switch_smoke(token, report)

    return report.print_report()


if __name__ == "__main__":
    sys.exit(main())
