"""Shared pytest helpers for demo user cleanup discipline."""

from __future__ import annotations

import pytest

from app.db.session import SessionLocal
from app.modules.user_management.demo_user_inventory import (
    assert_demo_user_inventory,
    cleanup_test_user_leaks,
    snapshot_visible_user_ids,
)


@pytest.fixture(autouse=True)
def cleanup_test_users_after_test() -> None:
    guard_db = SessionLocal()
    before_ids = snapshot_visible_user_ids(guard_db)
    yield
    try:
        _ = before_ids
        cleanup_test_user_leaks(guard_db)
        assert_demo_user_inventory(guard_db)
    finally:
        guard_db.close()


def pytest_sessionfinish(session, exitstatus) -> None:
    guard_db = SessionLocal()
    try:
        cleanup_test_user_leaks(guard_db)
        assert_demo_user_inventory(guard_db)
    except Exception as exc:
        session.exitstatus = 1
        reporter = session.config.pluginmanager.getplugin("terminalreporter")
        if reporter is not None:
            reporter.write_line(f"DEMO USER INVENTORY CHECK FAILED: {exc}", red=True)
    finally:
        guard_db.close()
