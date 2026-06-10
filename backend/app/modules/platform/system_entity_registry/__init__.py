"""System Entity Registry v1 — catalog, audit, ADR-007 compliance."""

from app.modules.platform.system_entity_registry.audit import (
    audit_all_system_entities,
    audit_system_entity,
    format_compliance_report_text,
    generate_system_entity_compliance_report,
)
from app.modules.platform.system_entity_registry.catalog import (
    SYSTEM_ENTITY_CATALOG,
    SYSTEM_ENTITY_CATALOG_BY_TYPE,
    get_system_entity_spec,
)
from app.modules.platform.system_entity_registry.types import (
    SystemEntityAuditResult,
    SystemEntityComplianceReport,
    SystemEntityComplianceRow,
    SystemEntitySpec,
)

__all__ = (
    "SYSTEM_ENTITY_CATALOG",
    "SYSTEM_ENTITY_CATALOG_BY_TYPE",
    "SystemEntityAuditResult",
    "SystemEntityComplianceReport",
    "SystemEntityComplianceRow",
    "SystemEntitySpec",
    "audit_all_system_entities",
    "audit_system_entity",
    "format_compliance_report_text",
    "generate_system_entity_compliance_report",
    "get_system_entity_spec",
)
