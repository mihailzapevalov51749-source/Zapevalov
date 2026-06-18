"""Test cleanup registry service — register and purge committed test rows by id."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.modules.test_cleanup_registry.constants import (
    DELETE_ORDER_BY_ENTITY_TYPE,
    ENTITY_TYPE_TO_TABLE,
    RECORD_STATUS_DELETED,
    RECORD_STATUS_FAILED,
    RECORD_STATUS_PENDING,
    RECORD_STATUS_SKIPPED,
    RUN_STATUS_CLEANED,
    RUN_STATUS_FAILED,
    RUN_STATUS_RUNNING,
)
from app.modules.test_cleanup_registry.models import TestCleanupRecord, TestCleanupRun


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def default_delete_order(entity_type: str) -> int:
    return DELETE_ORDER_BY_ENTITY_TYPE.get(entity_type, 999)


def start_cleanup_run(db: Session, run_key: str) -> int:
    run = TestCleanupRun(
        run_key=run_key,
        started_at=_utcnow(),
        status=RUN_STATUS_RUNNING,
    )
    db.add(run)
    db.flush()
    return int(run.id)


def register_test_record(
    db: Session,
    *,
    run_id: int,
    entity_type: str,
    table_name: str,
    entity_id: int,
    entity_key: str | None = None,
    delete_order: int | None = None,
) -> TestCleanupRecord:
    normalized_type = str(entity_type or "").strip().lower()
    normalized_table = str(table_name or "").strip()
    if not normalized_type or not normalized_table:
        raise ValueError("entity_type and table_name are required")
    parsed_id = int(entity_id)
    if parsed_id <= 0:
        raise ValueError("entity_id must be a positive integer")

    order = int(delete_order) if delete_order is not None else default_delete_order(normalized_type)
    record = TestCleanupRecord(
        run_id=int(run_id),
        entity_type=normalized_type,
        table_name=normalized_table,
        entity_id=parsed_id,
        entity_key=str(entity_key).strip() if entity_key else None,
        delete_order=order,
        created_at=_utcnow(),
        delete_status=RECORD_STATUS_PENDING,
    )
    db.add(record)
    db.flush()
    return record


def register_test_record_by_type(
    db: Session,
    *,
    run_id: int,
    entity_type: str,
    entity_id: int,
    entity_key: str | None = None,
    delete_order: int | None = None,
) -> TestCleanupRecord:
    table_name = ENTITY_TYPE_TO_TABLE.get(entity_type)
    if table_name is None:
        raise ValueError(f"Unknown entity_type={entity_type!r}")
    return register_test_record(
        db,
        run_id=run_id,
        entity_type=entity_type,
        table_name=table_name,
        entity_id=entity_id,
        entity_key=entity_key,
        delete_order=delete_order,
    )


@dataclass
class CleanupRunResult:
    run_id: int
    deleted_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def success(self) -> bool:
        return self.failed_count == 0 and not self.errors

    @property
    def error_summary(self) -> str:
        if self.success:
            return ""
        return "; ".join(self.errors[:10])


def cleanup_registered_records(db: Session, run_id: int) -> CleanupRunResult:
    from tests.support.test_cleanup_delete_handlers import (
        delete_registered_entity,
        entity_exists,
    )

    result = CleanupRunResult(run_id=int(run_id))
    run = db.query(TestCleanupRun).filter(TestCleanupRun.id == run_id).one_or_none()
    if run is None:
        result.errors.append(f"cleanup run id={run_id} not found")
        result.failed_count = 1
        return result

    records = (
        db.query(TestCleanupRecord)
        .filter(TestCleanupRecord.run_id == run_id)
        .filter(TestCleanupRecord.delete_status == RECORD_STATUS_PENDING)
        .order_by(TestCleanupRecord.delete_order.asc(), TestCleanupRecord.id.asc())
        .all()
    )

    for record in records:
        try:
            if not entity_exists(db, record.table_name, record.entity_id):
                record.delete_status = RECORD_STATUS_SKIPPED
                record.deleted_at = _utcnow()
                record.delete_error = None
                result.skipped_count += 1
                continue

            delete_registered_entity(db, record.table_name, record.entity_id)
            db.flush()

            if entity_exists(db, record.table_name, record.entity_id):
                raise RuntimeError(
                    f"Entity still exists after delete: {record.table_name}#{record.entity_id}"
                )

            record.delete_status = RECORD_STATUS_DELETED
            record.deleted_at = _utcnow()
            record.delete_error = None
            result.deleted_count += 1
        except Exception as exc:  # noqa: BLE001 — record per-row failure
            record.delete_status = RECORD_STATUS_FAILED
            record.delete_error = str(exc)
            result.failed_count += 1
            result.errors.append(
                f"{record.entity_type}:{record.table_name}#{record.entity_id} -> {exc}"
            )

    db.flush()

    pending = (
        db.query(TestCleanupRecord)
        .filter(TestCleanupRecord.run_id == run_id)
        .filter(TestCleanupRecord.delete_status == RECORD_STATUS_PENDING)
        .count()
    )
    failed = (
        db.query(TestCleanupRecord)
        .filter(TestCleanupRecord.run_id == run_id)
        .filter(TestCleanupRecord.delete_status == RECORD_STATUS_FAILED)
        .count()
    )

    run.finished_at = _utcnow()
    if pending == 0 and failed == 0:
        run.status = RUN_STATUS_CLEANED
    else:
        run.status = RUN_STATUS_FAILED

    db.flush()
    return result


def assert_cleanup_run_clean(db: Session, run_id: int) -> None:
    pending = (
        db.query(TestCleanupRecord)
        .filter(TestCleanupRecord.run_id == run_id)
        .filter(TestCleanupRecord.delete_status.in_([RECORD_STATUS_PENDING, RECORD_STATUS_FAILED]))
        .count()
    )
    if pending:
        rows = (
            db.query(TestCleanupRecord)
            .filter(TestCleanupRecord.run_id == run_id)
            .filter(TestCleanupRecord.delete_status != RECORD_STATUS_DELETED)
            .limit(10)
            .all()
        )
        sample = [
            f"{row.entity_type}:{row.table_name}#{row.entity_id} status={row.delete_status}"
            for row in rows
        ]
        raise AssertionError(
            f"Test cleanup run id={run_id} has undeleted records: count={pending} sample={sample}"
        )


def count_active_cleanup_runs(db: Session) -> int:
    return (
        db.query(TestCleanupRun)
        .filter(TestCleanupRun.status == RUN_STATUS_RUNNING)
        .count()
    )


def count_undeleted_cleanup_records(db: Session) -> int:
    return (
        db.query(TestCleanupRecord)
        .filter(TestCleanupRecord.delete_status.in_([RECORD_STATUS_PENDING, RECORD_STATUS_FAILED]))
        .count()
    )


def assert_cleanup_registry_empty(db: Session) -> None:
    active_runs = count_active_cleanup_runs(db)
    undeleted = count_undeleted_cleanup_records(db)
    if active_runs or undeleted:
        raise AssertionError(
            "Test cleanup registry is not empty: "
            f"active_runs={active_runs} undeleted_records={undeleted}"
        )


def purge_cleaned_run_audit(db: Session, run_id: int) -> None:
    """Remove registry rows for a successfully cleaned run (keeps DB lean)."""
    run = db.query(TestCleanupRun).filter(TestCleanupRun.id == run_id).one_or_none()
    if run is None or run.status != RUN_STATUS_CLEANED:
        return
    db.query(TestCleanupRecord).filter(TestCleanupRecord.run_id == run_id).delete(
        synchronize_session=False
    )
    db.delete(run)
    db.flush()
