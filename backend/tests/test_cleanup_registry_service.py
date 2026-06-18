"""Unit tests for test cleanup registry service."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.test_cleanup_registry.models import TestCleanupRecord, TestCleanupRun
from app.modules.test_cleanup_registry.service import (
    assert_cleanup_run_clean,
    cleanup_registered_records,
    register_test_record_by_type,
    start_cleanup_run,
)


@pytest.fixture()
def registry_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[TestCleanupRun.__table__, TestCleanupRecord.__table__],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_register_and_cleanup_marks_run_cleaned(registry_db):
    run_id = start_cleanup_run(registry_db, "unit-test-run")
    register_test_record_by_type(
        registry_db,
        run_id=run_id,
        entity_type="portal",
        entity_id=999001,
    )
    registry_db.commit()

    result = cleanup_registered_records(registry_db, run_id)
    assert result.success is True
    assert result.skipped_count == 1

    record = (
        registry_db.query(TestCleanupRecord)
        .filter(TestCleanupRecord.run_id == run_id)
        .one()
    )
    assert record.delete_status == "skipped"

    run = registry_db.query(TestCleanupRun).filter(TestCleanupRun.id == run_id).one()
    assert run.status == "cleaned"
    assert_cleanup_run_clean(registry_db, run_id)
