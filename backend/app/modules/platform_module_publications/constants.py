"""Constants for platform module publications."""

from __future__ import annotations


class PlatformModulePublicationStatus:
    DRAFT = "draft"
    READY_FOR_REVIEW = "ready_for_review"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED = "published"


class PlatformModulePublicationType:
    MODULE_CONFIGURATION = "module_configuration"


PUBLICATION_SUBMIT_SOURCE_STATUSES: frozenset[str] = frozenset(
    {
        PlatformModulePublicationStatus.DRAFT,
    }
)

PUBLICATION_REVIEW_SOURCE_STATUSES: frozenset[str] = frozenset(
    {
        PlatformModulePublicationStatus.READY_FOR_REVIEW,
    }
)

PUBLICATION_REVIEW_ACTION_STATUSES: frozenset[str] = frozenset(
    {
        PlatformModulePublicationStatus.IN_REVIEW,
    }
)

PUBLICATION_PUBLISH_SOURCE_STATUSES: frozenset[str] = frozenset(
    {
        PlatformModulePublicationStatus.APPROVED,
    }
)

PUBLICATION_IMMUTABLE_STATUSES: frozenset[str] = frozenset(
    {
        PlatformModulePublicationStatus.PUBLISHED,
        PlatformModulePublicationStatus.REJECTED,
    }
)

TENANT_EVENT_CODE_MODULE_PUBLICATION_PUBLISHED = "module_publication_published"
GENERATOR_SOURCE = "publication_pipeline"
