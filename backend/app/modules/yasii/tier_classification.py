"""YASII Tier Classification skeleton (P2-W03). DTO + stub only — no AI or retrieval."""

from enum import Enum

from pydantic import BaseModel, Field

TIER_CLASSIFICATION_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "tier-classification-placeholder"
PLACEHOLDER_ENTRY_ID = "placeholder"
DEFAULT_STUB_TIER = "REFERENCE"


class KnowledgeTier(str, Enum):
    CORE = "CORE"
    POLICY = "POLICY"
    PROCESS = "PROCESS"
    INSTRUCTION = "INSTRUCTION"
    REFERENCE = "REFERENCE"
    TEMPORARY = "TEMPORARY"


class TierClassificationContext(BaseModel):
    """Technical input placeholder for future tier classification."""

    schemaVersion: str = Field(default=TIER_CLASSIFICATION_SCHEMA_VERSION)
    classificationId: str | None = None


class TierClassification(BaseModel):
    """Technical tier assignment placeholder for a knowledge entry."""

    schemaVersion: str = Field(default=TIER_CLASSIFICATION_SCHEMA_VERSION)
    entryId: str = Field(default=PLACEHOLDER_ENTRY_ID)
    tier: str = Field(default=DEFAULT_STUB_TIER)
    metadata: dict[str, str] = Field(default_factory=dict)


class TierSnapshot(BaseModel):
    """Technical grouped view of tier classifications."""

    schemaVersion: str = Field(default=TIER_CLASSIFICATION_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    classifications: list[TierClassification] = Field(default_factory=list)
    createdAt: str | None = None


class TierClassifier:
    """Placeholder service container for future tier classification wiring."""

    schemaVersion: str = TIER_CLASSIFICATION_SCHEMA_VERSION


def classify_tier(
    context: TierClassificationContext | None = None,
    *,
    entry_id: str | None = None,
) -> TierClassification:
    """Stub: returns fixed REFERENCE tier without analyzing content."""
    _ = context
    return TierClassification(
        entryId=entry_id or PLACEHOLDER_ENTRY_ID,
        tier=KnowledgeTier.REFERENCE.value,
    )


def get_tier_snapshot(
    context: TierClassificationContext | None = None,
) -> TierSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return TierSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        classifications=[],
    )
