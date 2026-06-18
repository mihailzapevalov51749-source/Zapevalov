"""Shared pytest helpers for demo tenant cleanup discipline."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.tenant_management.demo_tenant_inventory import (
    assert_demo_tenant_inventory,
    cleanup_test_tenant_leaks,
    snapshot_portal_ids,
)


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def cleanup_test_tenants_after_test() -> None:
    guard_db = SessionLocal()
    before_ids = snapshot_portal_ids(guard_db)
    yield
    try:
        cleanup_test_tenant_leaks(guard_db, before_ids=before_ids)
        assert_demo_tenant_inventory(guard_db)
    finally:
        guard_db.close()


def pytest_sessionfinish(session, exitstatus) -> None:
    guard_db = SessionLocal()
    try:
        cleanup_test_tenant_leaks(guard_db)
        assert_demo_tenant_inventory(guard_db)
    except AssertionError as exc:
        session.exitstatus = 1
        reporter = session.config.pluginmanager.getplugin("terminalreporter")
        if reporter is not None:
            reporter.write_line(f"DEMO TENANT INVENTORY CHECK FAILED: {exc}", red=True)
    finally:
        guard_db.close()
