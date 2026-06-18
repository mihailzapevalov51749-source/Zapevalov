"""Constants for platform build registry."""

from __future__ import annotations

import re
from enum import Enum

BUILD_KEY_PATTERN = re.compile(r"^BLD-\d{8}-\d{4}$")
COMMIT_SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")


class PlatformBuildStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
