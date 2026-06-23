"""SQLAlchemy session for Platform Identity Store (catalog DB, not tenant runtime DB)."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.environment_guard import ENVIRONMENT_MATRIX
from app.modules.company_database_provisioning.database_urls import build_database_url

_sessionmaker: sessionmaker | None = None


def platform_identity_catalog_database_name() -> str:
    """Database that hosts platform_identities (DEV catalog per ENVIRONMENT_MATRIX)."""
    return ENVIRONMENT_MATRIX["DEV"].database


def _get_identity_store_sessionmaker() -> sessionmaker:
    global _sessionmaker
    if _sessionmaker is None:
        catalog_url = build_database_url(platform_identity_catalog_database_name())
        engine = create_engine(catalog_url)
        _sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _sessionmaker


def open_platform_identity_store_session() -> Session:
    return _get_identity_store_sessionmaker()()


@contextmanager
def platform_identity_store_session() -> Iterator[Session]:
    db = open_platform_identity_store_session()
    try:
        yield db
    finally:
        db.close()


def reset_platform_identity_store_session_cache_for_tests() -> None:
    global _sessionmaker
    _sessionmaker = None
