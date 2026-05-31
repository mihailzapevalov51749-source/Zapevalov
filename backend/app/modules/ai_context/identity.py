"""ACE Identity Resolution skeleton (P1-W03). No auth, DB, or permission integration."""

from pydantic import BaseModel, Field

IDENTITY_SCHEMA_VERSION = "0.1.0"
UNRESOLVED_IDENTITY_TYPE = "unresolved"


class IdentityContext(BaseModel):
    """Technical input placeholder for future HostContext → identity pipeline."""

    schemaVersion: str = Field(default=IDENTITY_SCHEMA_VERSION)
    surfaceId: str | None = None
    hostContextRef: str | None = None
    userId: str | None = None
    tenantId: str | None = None


class IdentityResolutionResult(BaseModel):
    """Technical output placeholder; not a resolved platform identity."""

    schemaVersion: str = Field(default=IDENTITY_SCHEMA_VERSION)
    identityType: str = Field(default=UNRESOLVED_IDENTITY_TYPE)
    userId: str | None = None
    tenantId: str | None = None
    roleKeys: tuple[str, ...] = Field(default_factory=tuple)


def resolve_identity(
    context: IdentityContext | None = None,
) -> IdentityResolutionResult:
    """Stub: resolves identity from HostContext refs when userId and tenantId are supplied."""
    if context and context.userId and context.tenantId:
        return IdentityResolutionResult(
            identityType="resolved",
            userId=context.userId,
            tenantId=context.tenantId,
            roleKeys=(),
        )
    return IdentityResolutionResult(identityType=UNRESOLVED_IDENTITY_TYPE)
