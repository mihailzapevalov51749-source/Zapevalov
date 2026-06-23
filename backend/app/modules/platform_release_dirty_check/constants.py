"""Constants for Dirty DEV Check (WI-REL-002, ADR-REL-001 / ADR-SEC-001)."""

from __future__ import annotations

import re
from enum import Enum

from app.modules.platform_release_scope.constants import ReleaseScopeStatus

DIRTY_CHECK_VERSION = "1.0"

READINESS_GATE_HOOK_KEY = "dirty_dev_check"


class DirtyDevCheckStatus(str, Enum):
    PASSED = "passed"
    WARNING = "warning"
    FAILED = "failed"
    SKIPPED = "skipped"


ENFORCEMENT_SCOPE_STATUSES: frozenset[str] = frozenset(
    {
        ReleaseScopeStatus.SCOPE_DEFINED.value,
        ReleaseScopeStatus.SCOPE_REVIEWED.value,
        ReleaseScopeStatus.SCOPE_APPROVED.value,
    }
)

# Monorepo code roots scanned when git is available.
CODE_ROOT_PREFIXES: tuple[str, ...] = (
    "backend/app/",
    "backend/alembic/",
    "frontend/src/",
    "scripts/runtime/",
)

# Known debug / temp artifact path fragments (case-insensitive match).
DEBUG_ARTIFACT_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"(^|[\\/])\.pytest_cache([\\/]|$)",
        r"(^|[\\/])__pycache__([\\/]|$)",
        r"(^|[\\/])\.build-staging([\\/]|$)",
        r"(^|[\\/])debug([\\/]|$)",
        r"(^|[\\/])tmp([\\/]|$)",
        r"\.tmp$",
        r"\.temp$",
        r"(^|[\\/])_audit_out\.json$",
        r"(^|[\\/])_pytest_out\.txt$",
    )
)

# Test / leak markers in paths outside explicit scope.
TEST_ARTIFACT_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"(^|[\\/])test_[^\\/]+\.py$",
        r"(^|[\\/])tests[\\/]support[\\/]",
        r"(^|[\\/])\.pytest_cache([\\/]|$)",
        r"pytest_out\.txt$",
    )
)

ISSUE_OUTSIDE_SCOPE = "OUTSIDE_SCOPE"
ISSUE_UNTRACKED_OUTSIDE_SCOPE = "UNTRACKED_OUTSIDE_SCOPE"
ISSUE_MODIFIED_OUTSIDE_SCOPE = "MODIFIED_OUTSIDE_SCOPE"
ISSUE_SCOPE_DRIFT = "SCOPE_DRIFT"
ISSUE_SCOPE_PROOF_MISSING = "SCOPE_PROOF_MISSING"
ISSUE_DEBUG_ARTIFACT = "DEBUG_ARTIFACT"
ISSUE_TEST_ARTIFACT = "TEST_ARTIFACT"
ISSUE_EXCLUDED_CHANGE_PRESENT = "EXCLUDED_CHANGE_PRESENT"
ISSUE_ENFORCEMENT_DISABLED = "ENFORCEMENT_DISABLED"
ISSUE_GIT_UNAVAILABLE = "GIT_UNAVAILABLE"
