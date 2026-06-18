"""Pytest fixtures for auth module integration tests."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from tests.support.test_cleanup_context import (
    begin_test_cleanup_run,
    finalize_cleanup_run,
    reset_cleanup_context,
    set_cleanup_context,
)


@pytest.fixture
def test_cleanup_run(db: Session, request: pytest.FixtureRequest) -> int:
    run_key = request.node.nodeid
    run_id = begin_test_cleanup_run(db, run_key)
    tokens = set_cleanup_context(db, run_id)
    try:
        yield run_id
    finally:
        reset_cleanup_context(tokens)
        try:
            finalize_cleanup_run(db, run_id)
            db.commit()
        except Exception:
            db.rollback()
            raise
