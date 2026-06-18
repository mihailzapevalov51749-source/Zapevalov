"""Regression tests for backend startup import graph (WI-17C)."""

from __future__ import annotations


def test_import_main_app_success() -> None:
    from app.main import app

    assert app is not None


def test_company_runtime_middleware_imports_without_cycle() -> None:
    from app.db.company_runtime_middleware import (
        CompanyRuntimeDatabaseMiddleware,
        resolve_bridge_runtime_routing,
    )

    assert CompanyRuntimeDatabaseMiddleware is not None
    assert callable(resolve_bridge_runtime_routing)


def test_session_and_runtime_session_import_without_cycle() -> None:
    from app.db.runtime_session import open_runtime_db_session
    from app.db.session import SessionLocal, get_db

    assert SessionLocal is not None
    assert callable(open_runtime_db_session)
    assert callable(get_db)


def test_company_runtime_context_helpers_import_without_session() -> None:
    from app.db.company_runtime import (
        clear_request_database_name,
        get_request_database_name,
        set_request_database_name,
    )

    set_request_database_name(None)
    assert get_request_database_name() is None
    clear_request_database_name()


def test_openapi_bridge_ticket_route_still_registered() -> None:
    from app.main import app

    schema = app.openapi()
    path = "/control-plane/platform-environments/{portal_id}/bridge-ticket"
    assert path in schema["paths"]
    assert "post" in schema["paths"][path]
