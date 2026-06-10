"""Centralized audit and ADR-007 compliance reporting for System Entities."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.modules.navigation.system_registry.constants import WORKSPACE_NAVIGATION_SYSTEM_KEY_PREFIX
from app.modules.navigation.system_registry.registry import audit_navigation_system_items
from app.modules.platform.designer.view_definitions.quick_form_view_registry import (
    audit_default_quick_form_views,
)
from app.modules.platform.designer.workspaces.workspace_home.registry import (
    audit_workspace_home_entities,
)
from app.modules.platform.runtime.plan_tree.anchor_registry import audit_plan_root_anchors
from app.modules.platform.system_entity_registry.catalog import SYSTEM_ENTITY_CATALOG
from app.modules.platform.system_entity_registry.specs.default_quick_form import (
    DEFAULT_QUICK_FORM_SPEC,
)
from app.modules.platform.system_entity_registry.specs.navigation import (
    NAVIGATION_SYSTEM_ITEM_SPEC,
    WORKSPACE_NAVIGATION_PLACEMENT_SPEC,
)
from app.modules.platform.system_entity_registry.specs.plan_root import PLAN_ROOT_ANCHOR_SPEC
from app.modules.platform.system_entity_registry.specs.workspace_home import (
    WORKSPACE_HOME_PAGE_SPEC,
    WORKSPACE_HOME_TAB_SPEC,
    WORKSPACE_ROOT_SECTION_SPEC,
)
from app.modules.platform.system_entity_registry.types import (
    AdrComplianceStatus,
    ComplianceStatus,
    SystemEntityAuditResult,
    SystemEntityComplianceReport,
    SystemEntityComplianceRow,
    SystemEntitySpec,
)

EvaluateFn = Callable[[list[dict[str, Any]]], tuple[int, list[str]]]


def _int_value(row: dict[str, Any], key: str) -> int:
    return int(row.get(key) or 0)


def _evaluate_plan_root_anchors(rows: list[dict[str, Any]]) -> tuple[int, list[str]]:
    issues: list[str] = []
    for row in rows:
        count = _int_value(row, "active_anchor_count")
        if count > 1:
            issues.append(
                "tenant={tenant} object_type={object_type} relation={relation} "
                "active_anchors={count}".format(
                    tenant=row.get("tenant_id"),
                    object_type=row.get("object_type_key"),
                    relation=row.get("plan_root_relation_key"),
                    count=count,
                )
            )
    return len(issues), issues


def _evaluate_default_quick_form(rows: list[dict[str, Any]]) -> tuple[int, list[str]]:
    issues: list[str] = []
    for row in rows:
        count = _int_value(row, "active_quick_form_count")
        if count > 1:
            issues.append(
                "tenant={tenant} object_type={object_type} active_views={count}".format(
                    tenant=row.get("tenant_id"),
                    object_type=row.get("object_type_key"),
                    count=count,
                )
            )
    return len(issues), issues


def _evaluate_workspace_home_tab(rows: list[dict[str, Any]]) -> tuple[int, list[str]]:
    issues: list[str] = []
    for row in rows:
        count = _int_value(row, "home_tab_count")
        tenant_id = row.get("tenant_id")
        workspace_id = row.get("workspace_id")
        if count > 1:
            issues.append(
                f"tenant={tenant_id} workspace={workspace_id} home_tabs={count} (duplicate)"
            )
        elif count == 0:
            issues.append(
                f"tenant={tenant_id} workspace={workspace_id} home_tabs=0 (missing)"
            )
    return len(issues), issues


def _evaluate_workspace_home_page(rows: list[dict[str, Any]]) -> tuple[int, list[str]]:
    issues: list[str] = []
    for row in rows:
        count = _int_value(row, "home_page_count")
        tenant_id = row.get("tenant_id")
        workspace_id = row.get("workspace_id")
        if count > 1:
            issues.append(
                f"tenant={tenant_id} workspace={workspace_id} home_pages={count} (duplicate)"
            )
        elif count == 0:
            issues.append(
                f"tenant={tenant_id} workspace={workspace_id} home_pages=0 (missing or broken)"
            )
    return len(issues), issues


def _evaluate_workspace_root_section(rows: list[dict[str, Any]]) -> tuple[int, list[str]]:
    issues: list[str] = []
    for row in rows:
        page_count = _int_value(row, "home_page_count")
        if page_count != 1:
            continue
        root_count = _int_value(row, "root_section_count")
        tenant_id = row.get("tenant_id")
        workspace_id = row.get("workspace_id")
        if root_count > 1:
            issues.append(
                f"tenant={tenant_id} workspace={workspace_id} root_sections={root_count} "
                "(duplicate visible)"
            )
        elif root_count == 0:
            issues.append(
                f"tenant={tenant_id} workspace={workspace_id} root_sections=0 (missing)"
            )
    return len(issues), issues


def _is_workspace_placement_row(row: dict[str, Any]) -> bool:
    system_key = str(row.get("system_key") or "")
    return system_key.startswith(WORKSPACE_NAVIGATION_SYSTEM_KEY_PREFIX)


def _evaluate_navigation_system_item(rows: list[dict[str, Any]]) -> tuple[int, list[str]]:
    issues: list[str] = []
    for row in rows:
        if _is_workspace_placement_row(row):
            continue
        count = _int_value(row, "active_count")
        if count > 1:
            issues.append(
                "portal={portal} key={key} scope={scope} active={count}".format(
                    portal=row.get("portal_id"),
                    key=row.get("system_key"),
                    scope=row.get("menu_scope"),
                    count=count,
                )
            )
    return len(issues), issues


def _evaluate_workspace_navigation_placement(rows: list[dict[str, Any]]) -> tuple[int, list[str]]:
    issues: list[str] = []
    for row in rows:
        if not _is_workspace_placement_row(row):
            continue
        count = _int_value(row, "active_count")
        if count > 1:
            issues.append(
                "portal={portal} key={key} scope={scope} active={count}".format(
                    portal=row.get("portal_id"),
                    key=row.get("system_key"),
                    scope=row.get("menu_scope"),
                    count=count,
                )
            )
    return len(issues), issues


@dataclass(frozen=True, slots=True)
class _AuditAdapter:
    spec: SystemEntitySpec
    run_audit: Callable[[Session], list[dict[str, Any]]] | None = None
    shared_rows_key: str | None = None
    evaluate: EvaluateFn = _evaluate_plan_root_anchors


_AUDIT_ADAPTERS: tuple[_AuditAdapter, ...] = (
    _AuditAdapter(
        spec=PLAN_ROOT_ANCHOR_SPEC,
        run_audit=audit_plan_root_anchors,
        evaluate=_evaluate_plan_root_anchors,
    ),
    _AuditAdapter(
        spec=DEFAULT_QUICK_FORM_SPEC,
        run_audit=audit_default_quick_form_views,
        evaluate=_evaluate_default_quick_form,
    ),
    _AuditAdapter(
        spec=WORKSPACE_HOME_TAB_SPEC,
        shared_rows_key="workspace_home",
        evaluate=_evaluate_workspace_home_tab,
    ),
    _AuditAdapter(
        spec=WORKSPACE_HOME_PAGE_SPEC,
        shared_rows_key="workspace_home",
        evaluate=_evaluate_workspace_home_page,
    ),
    _AuditAdapter(
        spec=WORKSPACE_ROOT_SECTION_SPEC,
        shared_rows_key="workspace_home",
        evaluate=_evaluate_workspace_root_section,
    ),
    _AuditAdapter(
        spec=NAVIGATION_SYSTEM_ITEM_SPEC,
        shared_rows_key="navigation",
        evaluate=_evaluate_navigation_system_item,
    ),
    _AuditAdapter(
        spec=WORKSPACE_NAVIGATION_PLACEMENT_SPEC,
        shared_rows_key="navigation",
        evaluate=_evaluate_workspace_navigation_placement,
    ),
)


def _load_shared_audit_rows(db: Session) -> dict[str, list[dict[str, Any]]]:
    return {
        "workspace_home": audit_workspace_home_entities(db),
        "navigation": audit_navigation_system_items(db),
    }


def _run_adapter_audit(
    db: Session,
    adapter: _AuditAdapter,
    shared_rows: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    if adapter.shared_rows_key is not None:
        return shared_rows[adapter.shared_rows_key]
    if adapter.run_audit is None:
        return []
    return adapter.run_audit(db)


def audit_system_entity(
    db: Session,
    spec: SystemEntitySpec,
    *,
    shared_rows: dict[str, list[dict[str, Any]]] | None = None,
) -> SystemEntityAuditResult:
    adapter = next((item for item in _AUDIT_ADAPTERS if item.spec.system_type == spec.system_type), None)
    if adapter is None:
        return SystemEntityAuditResult(
            system_type=spec.system_type,
            display_name=spec.display_name,
            rows=(),
            scope_count=0,
            violation_count=0,
            issues=(),
            healthy=True,
        )

    rows_cache = shared_rows if shared_rows is not None else _load_shared_audit_rows(db)
    rows = _run_adapter_audit(db, adapter, rows_cache)
    violation_count, issues = adapter.evaluate(rows)
    return SystemEntityAuditResult(
        system_type=spec.system_type,
        display_name=spec.display_name,
        rows=tuple(rows),
        scope_count=len(rows),
        violation_count=violation_count,
        issues=tuple(issues),
        healthy=violation_count == 0,
    )


def audit_all_system_entities(db: Session) -> list[SystemEntityAuditResult]:
    shared_rows = _load_shared_audit_rows(db)
    results: list[SystemEntityAuditResult] = []
    for adapter in _AUDIT_ADAPTERS:
        rows = _run_adapter_audit(db, adapter, shared_rows)
        violation_count, issues = adapter.evaluate(rows)
        results.append(
            SystemEntityAuditResult(
                system_type=adapter.spec.system_type,
                display_name=adapter.spec.display_name,
                rows=tuple(rows),
                scope_count=len(rows),
                violation_count=violation_count,
                issues=tuple(issues),
                healthy=violation_count == 0,
            )
        )
    return results


def _capability_status(supported: bool) -> ComplianceStatus:
    return "OK" if supported else "N/A"


def _structural_key_status(spec: SystemEntitySpec) -> ComplianceStatus:
    if not spec.structural_key.strip():
        return "GAP"
    if spec.unique_scope_db_enforced:
        return "OK"
    return "GAP"


def _resolve_adr_compliance(
    spec: SystemEntitySpec,
    audit_result: SystemEntityAuditResult,
) -> AdrComplianceStatus:
    if spec.adr_compliance_notes and not spec.unique_scope_db_enforced:
        if audit_result.healthy:
            return "PARTIAL"
    if not audit_result.healthy:
        return "FAIL"
    if spec.adr_compliance_notes and not spec.unique_scope_db_enforced:
        return "PARTIAL"
    required_flags = (
        spec.ensure_supported,
        spec.recovery_supported,
        spec.audit_supported,
        bool(spec.visibility_policy),
        bool(spec.structural_key),
    )
    if spec.reconcile_supported:
        required_flags = (*required_flags, True)
    if not all(required_flags):
        return "FAIL"
    if spec.adr_compliance_notes:
        return "PARTIAL"
    return "PASS"


def generate_system_entity_compliance_report(db: Session) -> SystemEntityComplianceReport:
    audit_results = audit_all_system_entities(db)
    audit_by_type = {result.system_type: result for result in audit_results}

    rows: list[SystemEntityComplianceRow] = []
    compliant_count = 0
    partial_count = 0
    failed_count = 0

    for spec in SYSTEM_ENTITY_CATALOG:
        audit_result = audit_by_type[spec.system_type]
        adr_status = _resolve_adr_compliance(spec, audit_result)
        if adr_status == "PASS":
            compliant_count += 1
        elif adr_status == "PARTIAL":
            partial_count += 1
        else:
            failed_count += 1

        audit_status: ComplianceStatus
        if not spec.audit_supported:
            audit_status = "N/A"
        elif audit_result.healthy:
            audit_status = "OK"
        else:
            audit_status = "GAP"

        rows.append(
            SystemEntityComplianceRow(
                system_type=spec.system_type,
                display_name=spec.display_name,
                structural_key=_structural_key_status(spec),
                ensure=_capability_status(spec.ensure_supported),
                reconcile=_capability_status(spec.reconcile_supported),
                recovery=_capability_status(spec.recovery_supported),
                audit=audit_status,
                visibility=_capability_status(bool(spec.visibility_policy)),
                adr_compliance=adr_status,
                violation_count=audit_result.violation_count,
                issues=audit_result.issues,
            )
        )

    return SystemEntityComplianceReport(
        rows=tuple(rows),
        total_count=len(rows),
        compliant_count=compliant_count,
        partial_count=partial_count,
        failed_count=failed_count,
        healthy=failed_count == 0,
    )


def format_compliance_report_text(report: SystemEntityComplianceReport) -> str:
    lines = ["System Entity Audit", ""]
    for row in report.rows:
        lines.append(row.system_type)
        lines.append(f"  Structural Key   {row.structural_key}")
        lines.append(f"  Ensure           {row.ensure}")
        lines.append(f"  Reconcile        {row.reconcile}")
        lines.append(f"  Recovery         {row.recovery}")
        lines.append(f"  Audit            {row.audit}")
        lines.append(f"  Visibility       {row.visibility}")
        lines.append(f"  ADR Compliance   {row.adr_compliance}")
        if row.issues:
            lines.append(f"  Issues           {row.violation_count}")
        lines.append("")

    lines.append("Total:")
    lines.append(f"{report.compliant_count + report.partial_count} / {report.total_count} compliant")
    if report.partial_count:
        lines.append(f"{report.partial_count} partial (known ADR-007 gaps)")
    if report.failed_count:
        lines.append(f"{report.failed_count} failed")
    return "\n".join(lines)
