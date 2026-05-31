"""YASII Knowledge Source Validation skeleton (P2-W05). DTO + stub only — no content analysis."""

from enum import Enum

from pydantic import BaseModel, Field

KNOWLEDGE_SOURCE_VALIDATION_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "validation-placeholder"
PLACEHOLDER_SOURCE_ID = "placeholder"
DEFAULT_STUB_STATUS = "REVIEW_REQUIRED"


class ValidationStatus(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    INACTIVE = "INACTIVE"


class KnowledgeSourceValidationContext(BaseModel):
    """Technical input placeholder for source validation."""

    schemaVersion: str = Field(default=KNOWLEDGE_SOURCE_VALIDATION_SCHEMA_VERSION)
    validationId: str | None = None


class KnowledgeSourceValidationResult(BaseModel):
    """Technical validation result for a knowledge source."""

    schemaVersion: str = Field(default=KNOWLEDGE_SOURCE_VALIDATION_SCHEMA_VERSION)
    sourceId: str = Field(default=PLACEHOLDER_SOURCE_ID)
    status: str = Field(default=DEFAULT_STUB_STATUS)
    metadata: dict[str, str] = Field(default_factory=dict)


class ValidationSnapshot(BaseModel):
    """Technical grouped view of source validation results."""

    schemaVersion: str = Field(default=KNOWLEDGE_SOURCE_VALIDATION_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    results: list[KnowledgeSourceValidationResult] = Field(default_factory=list)
    createdAt: str | None = None


class KnowledgeSourceValidator:
    """Placeholder service container for future source validation wiring."""

    schemaVersion: str = KNOWLEDGE_SOURCE_VALIDATION_SCHEMA_VERSION


def validate_source(
    context: KnowledgeSourceValidationContext | None = None,
    *,
    source_id: str | None = None,
) -> KnowledgeSourceValidationResult:
    """Stub: returns REVIEW_REQUIRED without inspecting source content."""
    _ = context
    return KnowledgeSourceValidationResult(
        sourceId=source_id or PLACEHOLDER_SOURCE_ID,
        status=ValidationStatus.REVIEW_REQUIRED.value,
    )


def get_validation_snapshot(
    context: KnowledgeSourceValidationContext | None = None,
) -> ValidationSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return ValidationSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        results=[],
    )
