"""Constants for tenant module configuration applies."""

from __future__ import annotations


class TenantModuleConfigurationApplyStatus:
    STARTED = "started"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


SNAPSHOT_REASON_APPLY = "apply"
MANIFEST_APPLY_SOURCE = "manifest_apply"

TENANT_EVENT_CODE_MODULE_CONFIGURATION_APPLIED = "MODULE_CONFIGURATION_APPLIED"
