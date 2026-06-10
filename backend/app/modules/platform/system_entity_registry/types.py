"""Types for System Entity Registry v1."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

ComplianceStatus = Literal["OK", "GAP", "N/A"]
AdrComplianceStatus = Literal["PASS", "PARTIAL", "FAIL"]


@dataclass(frozen=True, slots=True)
class SystemEntitySpec:
    """Declarative metadata for a platform System Entity (ADR-007)."""

    system_type: str
    display_name: str
    storage_layer: str
    structural_key: str
    unique_scope: tuple[str, ...]
    ensure_supported: bool
    reconcile_supported: bool
    recovery_supported: bool
    audit_supported: bool
    visibility_policy: str
    implementation_module: str
    advisory_lock_supported: bool = True
    unique_scope_db_enforced: bool = True
    adr_compliance_notes: str | None = None


@dataclass(frozen=True, slots=True)
class SystemEntityAuditResult:
    system_type: str
    display_name: str
    rows: tuple[dict[str, Any], ...]
    scope_count: int
    violation_count: int
    issues: tuple[str, ...]
    healthy: bool


@dataclass(frozen=True, slots=True)
class SystemEntityComplianceRow:
    system_type: str
    display_name: str
    structural_key: ComplianceStatus
    ensure: ComplianceStatus
    reconcile: ComplianceStatus
    recovery: ComplianceStatus
    audit: ComplianceStatus
    visibility: ComplianceStatus
    adr_compliance: AdrComplianceStatus
    violation_count: int = 0
    issues: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class SystemEntityComplianceReport:
    rows: tuple[SystemEntityComplianceRow, ...]
    total_count: int
    compliant_count: int
    partial_count: int
    failed_count: int
    healthy: bool
