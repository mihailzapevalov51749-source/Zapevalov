"""Provisioning transaction consistency for per-company databases (WI-15C)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.company_database_provisioning.database_admin import (
    CompanyDatabaseAdminError,
    drop_company_database,
)


def cleanup_failed_company_provisioning(
    *,
    database_name: str,
    created_database: bool,
    company_db: Session | None = None,
    cp_db: Session | None = None,
) -> None:
    """Rollback open sessions and drop a partially provisioned company database."""
    if company_db is not None:
        try:
            company_db.rollback()
        except Exception:
            pass

    if cp_db is not None:
        try:
            cp_db.rollback()
        except Exception:
            pass

    if created_database:
        try:
            drop_company_database(database_name)
        except CompanyDatabaseAdminError:
            pass


def finalize_client_company_provisioning(
    *,
    cp_db: Session,
    company_db: Session,
    database_name: str,
    created_database: bool,
) -> None:
    """Commit company DB first, then Control Plane catalog in one guarded step."""
    company_committed = False
    try:
        company_db.commit()
        company_committed = True
        cp_db.commit()
    except Exception:
        cp_db.rollback()
        try:
            company_db.rollback()
        except Exception:
            pass
        if created_database:
            try:
                drop_company_database(database_name)
            except CompanyDatabaseAdminError:
                pass
        raise
