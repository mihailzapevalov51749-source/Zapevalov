"""Constants for migration rollback foundation."""

from __future__ import annotations

import re
from enum import Enum

# Baseline schema revision at foundation completion (Alembic head when catalog seeded).
BASELINE_SCHEMA_REVISION = "20260615_0069"

SCHEMA_REVISION_PATTERN = re.compile(r"^\d{8}_\d{4}_[a-z0-9_]+$")


class RollbackMode(str, Enum):
    CODE_ONLY = "code_only"
    SCHEMA_DOWNGRADE = "schema_downgrade"
    BACKUP_RESTORE = "backup_restore"
    CONFIG_RESTORE = "config_restore"


class RollbackDecision(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"


class RollbackBlockReason(str, Enum):
    UNKNOWN_VERSION = "unknown_version"
    SCHEMA_AHEAD_NO_BACKUP = "schema_ahead_no_backup"
    SCHEMA_BEHIND_CODE = "schema_behind_code"
    DOWNGRADE_DEV_ONLY = "downgrade_dev_only"
    HIGH_RISK_MIGRATION = "high_risk_migration"
    NO_VERIFIED_BACKUP = "no_verified_backup"


class BackupRegistryStatus(str, Enum):
    """Design-only enum for future platform_schema_backup_registry."""

    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    EXPIRED = "expired"
