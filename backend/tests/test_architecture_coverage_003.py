"""Tests for 100% platform file Primary Owner coverage (WI-ARCH-COVERAGE-003)."""

from __future__ import annotations

import os
from collections import defaultdict

import pytest

os.environ.setdefault("APP_ENV", "DEV")

from app.modules.platform.architecture_navigator.constants import (
    ArchitectureFindingKind,
)
from app.modules.platform.architecture_navigator.coverage_resolver import (
    iter_platform_implementation_files,
    resolve_file_primary_owner,
    resolve_residual_primary_owner,
)
from app.modules.platform.architecture_navigator.ownership_policy import (
    AGGREGATOR,
    CONCEPTUAL,
    OWNERSHIP_ROLE_PRIMARY,
    can_be_primary_owner,
    ownership_class,
)
from app.modules.platform.architecture_navigator.scanner import (
    _component_keys_for_file,
    run_architecture_scan,
)
from app.core.runtime_paths import get_app_root, get_dev_frontend_src_dir


def test_residual_owner_is_code_owner():
    assert can_be_primary_owner(resolve_residual_primary_owner("core/config.py", "backend"))
    assert can_be_primary_owner(
        resolve_residual_primary_owner("modules/controlPlane/TenantsPage.jsx", "frontend")
    )
    assert can_be_primary_owner(
        resolve_file_primary_owner("modules/checklists/router.py", "backend", ["module-domain-data"])
    )


def test_resolve_file_primary_when_only_aggregators_in_scope():
    owner = resolve_file_primary_owner(
        "modules/user_activity/service.py",
        "backend",
        ["journals-data"],
    )
    assert can_be_primary_owner(owner)
    assert owner == "config-group-module-placement"


def test_scanner_covers_all_platform_implementation_files():
    app_root = get_app_root()
    frontend_src = get_dev_frontend_src_dir()
    if frontend_src is None:
        pytest.skip("frontend src not available in this environment")

    expected = iter_platform_implementation_files(app_root, frontend_src)
    draft = run_architecture_scan()

    primary_by_file: dict[tuple[str, str], str] = {}
    for finding in draft.findings:
        if finding.finding_kind not in (
            ArchitectureFindingKind.BACKEND_FILE.value,
            ArchitectureFindingKind.FRONTEND_FILE.value,
        ):
            continue
        if finding.details.get("ownership_role") != OWNERSHIP_ROLE_PRIMARY:
            continue
        side = (
            "backend"
            if finding.finding_kind == ArchitectureFindingKind.BACKEND_FILE.value
            else "frontend"
        )
        primary_by_file[(side, finding.label)] = finding.component_key or ""

    missing = [rel for side, rel in expected if (side, rel) not in primary_by_file]
    assert missing == [], f"files without primary owner: {missing[:20]}"

    bad = [
        (side, rel, owner, ownership_class(owner))
        for side, rel in expected
        if (owner := primary_by_file.get((side, rel)))
        and ownership_class(owner) in {AGGREGATOR, CONCEPTUAL}
    ]
    assert bad == []


def test_no_duplicate_primary_per_file():
    draft = run_architecture_scan()
    primary_counts: dict[tuple[str, str], int] = defaultdict(int)
    for finding in draft.findings:
        if finding.details.get("ownership_role") != OWNERSHIP_ROLE_PRIMARY:
            continue
        if finding.finding_kind not in (
            ArchitectureFindingKind.BACKEND_FILE.value,
            ArchitectureFindingKind.FRONTEND_FILE.value,
        ):
            continue
        side = (
            "backend"
            if finding.finding_kind == ArchitectureFindingKind.BACKEND_FILE.value
            else "frontend"
        )
        primary_counts[(side, finding.label)] += 1
    duplicates = {k: v for k, v in primary_counts.items() if v > 1}
    assert duplicates == {}


def test_residual_scopes_merged_into_component_scan_scopes():
    assert "modules/controlPlane/" in (
        __import__(
            "app.modules.platform.architecture_navigator.component_scan_scopes",
            fromlist=["COMPONENT_SCAN_SCOPES"],
        ).COMPONENT_SCAN_SCOPES.get("platform-identity", {}).get("frontend")
        or []
    )
    candidates = _component_keys_for_file("modules/checklists/router.py", "backend")
    assert "config-group-module-placement" in candidates
