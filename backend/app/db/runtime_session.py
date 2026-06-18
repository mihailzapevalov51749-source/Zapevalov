"""Open SQLAlchemy sessions for default CP DB or per-company runtime DB."""

from __future__ import annotations

from sqlalchemy.orm import Session, sessionmaker

from app.db.company_runtime import (
    clear_request_database_name,
    get_request_database_name,
)
from app.modules.company_database_provisioning.database_urls import build_database_url

_engine_cache: dict[str, object] = {}
_sessionmaker_cache: dict[str, sessionmaker] = {}


def _get_company_sessionmaker(database_name: str) -> sessionmaker:
    cached = _sessionmaker_cache.get(database_name)
    if cached is not None:
        return cached

    from sqlalchemy import create_engine

    engine = create_engine(build_database_url(database_name))
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    _engine_cache[database_name] = engine
    _sessionmaker_cache[database_name] = factory
    return factory


def open_runtime_db_session() -> Session:
    database_name = get_request_database_name()
    if database_name:
        return _get_company_sessionmaker(database_name)()
    from app.db.session import SessionLocal

    return SessionLocal()


def reset_company_runtime_caches_for_tests() -> None:
    _engine_cache.clear()
    _sessionmaker_cache.clear()
    clear_request_database_name()
