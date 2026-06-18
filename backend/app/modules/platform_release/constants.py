"""Platform release pipeline constants."""

from __future__ import annotations

from enum import StrEnum


class PlatformReleaseStatus(StrEnum):
    DRAFT = "draft"
    READY_FOR_PLATFORM_REVIEW = "ready_for_platform_review"
    IN_PLATFORM_REVIEW = "in_platform_review"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED_BY_PLATFORM = "approved_by_platform"
    PUBLISHED_TO_TEMPLATE = "published_to_template"
    OFFERED_TO_TENANTS = "offered_to_tenants"
    ARCHIVED = "archived"


# Legacy status migrated to READY_FOR_PLATFORM_REVIEW
LEGACY_READY_STATUS = "ready"


DEVELOPER_EDITABLE_STATUSES = frozenset({
    PlatformReleaseStatus.DRAFT.value,
    PlatformReleaseStatus.CHANGES_REQUESTED.value,
})

REVIEW_QUEUE_STATUSES = frozenset({
    PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value,
    PlatformReleaseStatus.IN_PLATFORM_REVIEW.value,
    PlatformReleaseStatus.CHANGES_REQUESTED.value,
    PlatformReleaseStatus.APPROVED_BY_PLATFORM.value,
})

REVIEW_COUNT_STATUSES = frozenset({
    PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value,
    PlatformReleaseStatus.IN_PLATFORM_REVIEW.value,
    PlatformReleaseStatus.APPROVED_BY_PLATFORM.value,
})

SUBMIT_FOR_REVIEW_SOURCE_STATUSES = frozenset({
    PlatformReleaseStatus.DRAFT.value,
    PlatformReleaseStatus.CHANGES_REQUESTED.value,
})


class ReleaseChangeType(StrEnum):
    FEATURE = "feature"
    FIX = "fix"
    CONFIGURATION = "configuration"
    NAVIGATION = "navigation"
    OTHER = "other"


class ReleaseRiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TenantUpdateOfferStatus(StrEnum):
    AVAILABLE = "available"
    APPLIED = "applied"
    SKIPPED = "skipped"
    FAILED = "failed"


DEFAULT_INITIAL_VERSION = "1.0.0"

EXCLUDED_OFFER_TENANT_TYPES = frozenset({
    "DEV",
    "TEMPLATE",
    "LEGACY_TEMPLATE",
})
