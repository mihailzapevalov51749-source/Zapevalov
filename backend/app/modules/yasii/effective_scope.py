"""YASII EffectiveScope derivation skeleton (P1-W10). DTO + stub only — no runtime or ACE."""

from pydantic import BaseModel, Field

EFFECTIVE_SCOPE_SCHEMA_VERSION = "0.1.0"
EMPTY_SCOPE_TYPE = "empty"
PLACEHOLDER_SCOPE_ID = "effective-scope-placeholder"


class EffectiveScopeBuildContext(BaseModel):
    """Technical input placeholder for future scope derivation pipeline."""

    schemaVersion: str = Field(default=EFFECTIVE_SCOPE_SCHEMA_VERSION)
    requestId: str | None = None
    identityType: str | None = None
    tenantId: str | None = None
    snapshotId: str | None = None
    boundaryId: str | None = None


class EffectiveScope(BaseModel):
    """Technical EffectiveScope placeholder; not a normative derived scope."""

    schemaVersion: str = Field(default=EFFECTIVE_SCOPE_SCHEMA_VERSION)
    scopeType: str = Field(default=EMPTY_SCOPE_TYPE)
    scopeId: str = Field(default=PLACEHOLDER_SCOPE_ID)
    isDerived: bool = False
    metadata: dict[str, str] = Field(default_factory=dict)


def derive_effective_scope(
    context: EffectiveScopeBuildContext | None = None,
) -> EffectiveScope:
    """Stub: derives runtime scope when ACE snapshot and boundary refs are present."""
    if context and context.snapshotId and context.boundaryId:
        return EffectiveScope(
            scopeType="runtime",
            scopeId=f"scope-{context.snapshotId}",
            isDerived=True,
            metadata={
                "snapshotId": context.snapshotId,
                "boundaryId": context.boundaryId,
            },
        )
    return EffectiveScope(
        scopeType=EMPTY_SCOPE_TYPE,
        scopeId=PLACEHOLDER_SCOPE_ID,
        isDerived=False,
        metadata={},
    )
