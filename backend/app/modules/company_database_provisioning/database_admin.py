"""PostgreSQL database create/drop for company runtimes."""

from __future__ import annotations

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.modules.company_database_provisioning.constants import COMPANY_DATABASE_PREFIX
from app.modules.company_database_provisioning.database_urls import (
    build_postgres_admin_url,
    resolve_template_database_url,
)
from app.modules.company_database_provisioning.naming import is_company_runtime_database


class CompanyDatabaseAdminError(RuntimeError):
    """Failed to create or drop a company database."""


def _quote_ident(name: str) -> str:
    escaped = str(name).replace('"', '""')
    return f'"{escaped}"'


def database_exists(engine: Engine, database_name: str) -> bool:
    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :database_name"),
            {"database_name": database_name},
        ).first()
    return row is not None


def terminate_database_connections(admin_engine: Engine, database_name: str) -> None:
    with admin_engine.connect() as connection:
        connection.execute(
            text(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = :database_name
                  AND pid <> pg_backend_pid()
                """
            ),
            {"database_name": database_name},
        )


def create_company_database_from_template(
    database_name: str,
    *,
    template_database_url: str | None = None,
) -> None:
    if not is_company_runtime_database(database_name):
        raise CompanyDatabaseAdminError(
            f"Refusing to create non-company database name: {database_name}",
        )

    template_url = template_database_url or resolve_template_database_url()
    template_db_name = template_url.rsplit("/", 1)[-1].split("?", 1)[0]
    admin_url = build_postgres_admin_url(base_database_url=template_url)
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    try:
        if database_exists(admin_engine, database_name):
            raise CompanyDatabaseAdminError(f"Database already exists: {database_name}")

        terminate_database_connections(admin_engine, template_db_name)
        with admin_engine.connect() as connection:
            connection.execute(
                text(
                    f"CREATE DATABASE {_quote_ident(database_name)} "
                    f"WITH TEMPLATE {_quote_ident(template_db_name)}"
                ),
            )
    finally:
        admin_engine.dispose()


def list_company_runtime_databases() -> list[str]:
    admin_url = build_postgres_admin_url()
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
        with admin_engine.connect() as connection:
            rows = connection.execute(
                text(
                    """
                    SELECT datname
                    FROM pg_database
                    WHERE datname LIKE :prefix
                    ORDER BY datname
                    """
                ),
                {"prefix": f"{COMPANY_DATABASE_PREFIX}%"},
            ).all()
    finally:
        admin_engine.dispose()
    return [str(row[0]) for row in rows]


def drop_company_database(database_name: str) -> None:
    if not is_company_runtime_database(database_name):
        raise CompanyDatabaseAdminError(
            f"Refusing to drop non-company database name: {database_name}",
        )

    admin_url = build_postgres_admin_url()
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
        if not database_exists(admin_engine, database_name):
            return
        terminate_database_connections(admin_engine, database_name)
        with admin_engine.connect() as connection:
            connection.execute(text(f"DROP DATABASE IF EXISTS {_quote_ident(database_name)}"))
    finally:
        admin_engine.dispose()
