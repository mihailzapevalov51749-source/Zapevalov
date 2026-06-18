"""Tests for DEV runtime navigation repair script guardrails."""

from __future__ import annotations

import re
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPAIR_SCRIPT = BACKEND_ROOT / "scripts" / "repair_dev_runtime_navigation_duplicates.py"
RECONCILE_MODULE = (
    BACKEND_ROOT / "app" / "modules" / "navigation" / "runtime_navigation_reconcile.py"
)


def test_repair_script_defaults_to_dry_run_and_dev_only() -> None:
    source = REPAIR_SCRIPT.read_text(encoding="utf-8")

    assert "TenantType.DEV.value" in source
    assert "--apply" in source
    assert "--allow-non-dev" in source
    assert "build_runtime_navigation_repair_plan" in source
    assert "resolve_dev_tenant_portal_id" in source


def test_reconcile_module_uses_system_key_not_title_only() -> None:
    source = RECONCILE_MODULE.read_text(encoding="utf-8")

    assert "find_canonical_runtime_protected_nav" in source
    assert "NavigationItem.system_key ==" in source
    assert "resolve_runtime_protected_system_key" in source
    assert re.search(r'action\s*=\s*"hide"', source)
