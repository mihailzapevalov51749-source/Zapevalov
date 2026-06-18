"""Constants for tenant module update previews."""

from __future__ import annotations


class TenantModuleUpdatePreviewStatus:
    GENERATED = "generated"
    OUTDATED = "outdated"
    SUPERSEDED = "superseded"
    APPLIED = "applied"


class TenantModuleUpdatePreviewRiskLevel:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


DEFAULT_PREVIEW_RISK_LEVEL = TenantModuleUpdatePreviewRiskLevel.LOW

GENERATOR_SOURCE = "module_update_preview_generator"
