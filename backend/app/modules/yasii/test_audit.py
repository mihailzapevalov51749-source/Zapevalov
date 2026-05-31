import app.modules.yasii.audit  # noqa: F401

from app.modules.yasii.audit import (
    AUDIT_SCHEMA_VERSION,
    PLACEHOLDER_AUDIT_ID,
    PLACEHOLDER_AUDIT_STATUS,
    PLACEHOLDER_EVENT_TYPE,
    PLACEHOLDER_SNAPSHOT_ID,
    AuditContext,
    AuditRecord,
    AuditSnapshot,
    record_audit_event,
)


def test_audit_module_imports():
    assert AuditContext is not None
    assert AuditRecord is not None
    assert AuditSnapshot is not None
    assert record_audit_event is not None


def test_audit_context_defaults():
    context = AuditContext()

    assert context.schemaVersion == AUDIT_SCHEMA_VERSION
    assert context.requestId is None
    assert context.scopeId is None
    assert context.eventType is None


def test_audit_record_defaults():
    record = AuditRecord()

    assert record.schemaVersion == AUDIT_SCHEMA_VERSION
    assert record.auditId == PLACEHOLDER_AUDIT_ID
    assert record.eventType == PLACEHOLDER_EVENT_TYPE
    assert record.status == PLACEHOLDER_AUDIT_STATUS
    assert record.metadata == {}


def test_audit_snapshot_defaults():
    snapshot = AuditSnapshot()

    assert snapshot.schemaVersion == AUDIT_SCHEMA_VERSION
    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.records == []
    assert snapshot.createdAt is None


def test_record_audit_event_returns_placeholder():
    record = record_audit_event(
        AuditContext(requestId="req-1", scopeId="scope-1", eventType="request.received")
    )

    assert record.auditId == "audit-placeholder"
    assert record.eventType == "placeholder"
    assert record.status == "not-recorded"
    assert record.metadata == {}


def test_record_audit_event_without_context():
    record = record_audit_event()

    assert record.auditId == PLACEHOLDER_AUDIT_ID
    assert record.status == PLACEHOLDER_AUDIT_STATUS
