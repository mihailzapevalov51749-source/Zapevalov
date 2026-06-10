"""Tests for System Entity Registry v1."""

from __future__ import annotations

from unittest.mock import MagicMock

from app.modules.platform.system_entity_registry import (
    SYSTEM_ENTITY_CATALOG,
    audit_all_system_entities,
    generate_system_entity_compliance_report,
)
from app.modules.platform.system_entity_registry.audit import (
    _evaluate_navigation_system_item,
    _evaluate_plan_root_anchors,
    _evaluate_workspace_home_tab,
    _evaluate_workspace_navigation_placement,
)


def test_catalog_contains_seven_entities() -> None:
    types = {spec.system_type for spec in SYSTEM_ENTITY_CATALOG}
    assert types == {
        "runtime.plan_root_anchor",
        "designer.default_quick_form",
        "workspace.home_tab",
        "workspace.home_page",
        "workspace.root_section",
        "navigation.system_item",
        "navigation.workspace_placement",
    }


def test_plan_root_evaluator_flags_duplicates() -> None:
    count, issues = _evaluate_plan_root_anchors(
        [{"tenant_id": 1, "object_type_key": "task", "plan_root_relation_key": "sub", "active_anchor_count": 2}]
    )
    assert count == 1
    assert issues


def test_workspace_home_tab_evaluator_flags_missing() -> None:
    count, issues = _evaluate_workspace_home_tab(
        [{"tenant_id": 1, "workspace_id": 10, "home_tab_count": 0}]
    )
    assert count == 1
    assert "missing" in issues[0]


def test_navigation_evaluators_split_system_and_placement() -> None:
    rows = [
        {"portal_id": 1, "system_key": "designer.objects", "menu_scope": "designer", "active_count": 1},
        {
            "portal_id": 1,
            "system_key": "designer.workspace.5.designer",
            "menu_scope": "designer",
            "active_count": 2,
        },
    ]
    system_count, system_issues = _evaluate_navigation_system_item(rows)
    placement_count, placement_issues = _evaluate_workspace_navigation_placement(rows)
    assert system_count == 0
    assert placement_count == 1
    assert placement_issues


def test_audit_all_returns_all_entities() -> None:
    db = MagicMock()
    db.execute.return_value.mappings.return_value.all.return_value = []
    results = audit_all_system_entities(db)
    assert len(results) == 7
    assert {item.system_type for item in results} == {spec.system_type for spec in SYSTEM_ENTITY_CATALOG}


def test_compliance_report_marks_catalog_capabilities() -> None:
    db = MagicMock()
    db.execute.return_value.mappings.return_value.all.return_value = []
    report = generate_system_entity_compliance_report(db)
    assert report.total_count == 7
    plan_root = next(row for row in report.rows if row.system_type == "runtime.plan_root_anchor")
    assert plan_root.ensure == "OK"
    assert plan_root.reconcile == "OK"
    assert plan_root.audit == "OK"
    assert plan_root.adr_compliance == "PASS"
