"""Constants for platform release package registry."""

from __future__ import annotations

import re
from enum import Enum

PACKAGE_KEY_PATTERN = re.compile(r"^PKG-\d{8}-\d{4}$")


class PlatformReleasePackageStatus(str, Enum):
    DRAFT = "draft"
    READY = "ready"
    PUBLISHED = "published"
    DEPRECATED = "deprecated"
    CANCELLED = "cancelled"


# Package review queue (migration Step 2) — governance.review_status filter
PACKAGE_REVIEW_QUEUE_STATUSES: frozenset[str] = frozenset({
    "ready_for_platform_review",
    "in_platform_review",
})

PACKAGE_REVIEW_COUNT_STATUSES: frozenset[str] = PACKAGE_REVIEW_QUEUE_STATUSES

