"""Constants for platform deployment registry."""

from __future__ import annotations

import re
from enum import Enum

DEPLOYMENT_KEY_PATTERN = re.compile(r"^DPL-\d{8}-\d{4}$")


class PlatformDeploymentTargetEnvironmentType(str, Enum):
    TEMPLATE = "template"
    CLIENT = "client"
    DEV = "dev"


class PlatformDeploymentStatus(str, Enum):
    PLANNED = "planned"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ROLLED_BACK = "rolled_back"

