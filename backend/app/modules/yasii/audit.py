"""YASII Audit Layer skeleton (P1-W09). DTO + stub only — no persistence or runtime logging."""

from pydantic import BaseModel, Field

AUDIT_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_AUDIT_ID = "audit-placeholder"
PLACEHOLDER_EVENT_TYPE = "placeholder"
PLACEHOLDER_AUDIT_STATUS = "not-recorded"
PLACEHOLDER_SNAPSHOT_ID = "audit-snapshot-placeholder"


class AuditContext(BaseModel):
    """Technical input placeholder for future audit recording."""

    schemaVersion: str = Field(default=AUDIT_SCHEMA_VERSION)
    requestId: str | None = None
    scopeId: str | None = None
    eventType: str | None = None


class AuditRecord(BaseModel):
    """Technical audit record placeholder; not persisted anywhere."""

    schemaVersion: str = Field(default=AUDIT_SCHEMA_VERSION)
    auditId: str = Field(default=PLACEHOLDER_AUDIT_ID)
    eventType: str = Field(default=PLACEHOLDER_EVENT_TYPE)
    status: str = Field(default=PLACEHOLDER_AUDIT_STATUS)
    metadata: dict[str, str] = Field(default_factory=dict)


class AuditSnapshot(BaseModel):
    """Technical container for grouped audit records."""

    schemaVersion: str = Field(default=AUDIT_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    records: list[AuditRecord] = Field(default_factory=list)
    createdAt: str | None = None


def record_audit_event(context: AuditContext | None = None) -> AuditRecord:
    """Stub: returns placeholder record without writing to DB, files, or event store."""
    _ = context
    return AuditRecord(
        auditId=PLACEHOLDER_AUDIT_ID,
        eventType=PLACEHOLDER_EVENT_TYPE,
        status=PLACEHOLDER_AUDIT_STATUS,
        metadata={},
    )
