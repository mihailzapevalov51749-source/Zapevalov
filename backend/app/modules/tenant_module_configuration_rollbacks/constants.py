"""Constants for tenant module configuration rollbacks."""

from __future__ import annotations


class TenantModuleConfigurationRollbackStatus:
    STARTED = "started"
    COMPLETED = "completed"
    FAILED = "failed"


SNAPSHOT_ROLLBACK_SOURCE = "snapshot_rollback"

TENANT_EVENT_CODE_MODULE_CONFIGURATION_ROLLED_BACK = "MODULE_CONFIGURATION_ROLLED_BACK"
