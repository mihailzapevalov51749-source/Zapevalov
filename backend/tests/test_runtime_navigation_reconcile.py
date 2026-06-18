"""Unit tests for runtime navigation reconcile helpers."""

from __future__ import annotations

import re
from pathlib import Path

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_navigation_reconcile import (
    is_broken_runtime_nav_artifact,
)
from app.modules.pages.models import Page

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPAIR_SCRIPT = BACKEND_ROOT / "scripts" / "repair_dev_runtime_navigation_duplicates.py"


def test_broken_runtime_nav_artifact_detection() -> None:
    nav = NavigationItem(title="Nav 46560f3e", menu_scope="runtime")
    page = Page(title="Trash purge page 46560f3e")
    assert is_broken_runtime_nav_artifact(nav, page) is True

    protected = NavigationItem(
        title="Чат",
        menu_scope="runtime",
        system_key="runtime.chat",
        is_protected=True,
    )
    assert is_broken_runtime_nav_artifact(protected, None) is False


def test_repair_script_defaults_to_dry_run_and_dev_only() -> None:
    source = REPAIR_SCRIPT.read_text(encoding="utf-8")

    assert "TenantType.DEV.value" in source
    assert "--apply" in source
    assert "--allow-non-dev" in source
    assert "build_runtime_navigation_repair_plan" in source
    assert "resolve_dev_tenant_portal_id" in source


def test_repair_script_does_not_default_to_apply() -> None:
    source = REPAIR_SCRIPT.read_text(encoding="utf-8")
    assert re.search(r'if args\.apply:\s*\n\s*plan = reconcile_runtime_navigation', source)
