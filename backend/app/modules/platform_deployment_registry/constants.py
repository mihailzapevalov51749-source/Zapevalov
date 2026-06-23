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


class PlatformDeploymentKind(str, Enum):
    """Normative deployment kinds (ADR-DEP-001 §6)."""

    TEMPLATE_PUBLISH = "template_publish"
    COMPANY_UPDATE = "company_update"
    PROVISION_BASELINE = "provision_baseline"
    ROLLBACK = "rollback"
    DEV_DEPLOY = "dev_deploy"


DEPLOYMENT_KIND_VALUES: frozenset[str] = frozenset(kind.value for kind in PlatformDeploymentKind)

DEPLOYMENT_KIND_TARGET_ENVIRONMENT: dict[str, frozenset[str]] = {
    PlatformDeploymentKind.TEMPLATE_PUBLISH.value: frozenset(
        {PlatformDeploymentTargetEnvironmentType.TEMPLATE.value}
    ),
    PlatformDeploymentKind.COMPANY_UPDATE.value: frozenset(
        {PlatformDeploymentTargetEnvironmentType.CLIENT.value}
    ),
    PlatformDeploymentKind.PROVISION_BASELINE.value: frozenset(
        {PlatformDeploymentTargetEnvironmentType.CLIENT.value}
    ),
    PlatformDeploymentKind.ROLLBACK.value: frozenset(
        {
            PlatformDeploymentTargetEnvironmentType.TEMPLATE.value,
            PlatformDeploymentTargetEnvironmentType.CLIENT.value,
        }
    ),
    PlatformDeploymentKind.DEV_DEPLOY.value: frozenset(
        {PlatformDeploymentTargetEnvironmentType.DEV.value}
    ),
}

PROVISION_BASELINE_RELEASE_ID = "release-001"


class DeploymentVerifyFailureReason(str, Enum):
    """Failure reasons recorded when Deployment Verify Gate blocks SUCCEEDED."""

    VERIFY_FAILED = "VERIFY_FAILED"
    DRIFT_DETECTED = "DRIFT_DETECTED"
    MANIFEST_MISMATCH = "MANIFEST_MISMATCH"
    PACKAGE_MISMATCH = "PACKAGE_MISMATCH"
    BUILD_MISMATCH = "BUILD_MISMATCH"
    RUNTIME_MISMATCH = "RUNTIME_MISMATCH"

