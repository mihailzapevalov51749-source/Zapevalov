"""Build SQLAlchemy URLs for company database provisioning."""

from __future__ import annotations

import os
from urllib.parse import quote, unquote, urlparse, urlunparse

from app.modules.company_database_provisioning.constants import POSTGRES_ADMIN_DATABASE
from app.modules.control_plane.customer_companies.catalog_fields import extract_database_name


def resolve_base_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    return database_url


def build_database_url(database_name: str, *, base_database_url: str | None = None) -> str:
    base_url = base_database_url or resolve_base_database_url()
    parsed = urlparse(base_url)
    encoded_name = quote(unquote(database_name), safe="")
    return urlunparse(parsed._replace(path=f"/{encoded_name}"))


def build_postgres_admin_url(*, base_database_url: str | None = None) -> str:
    return build_database_url(POSTGRES_ADMIN_DATABASE, base_database_url=base_database_url)


def resolve_template_database_url() -> str:
    from app.core.environment_guard import ENVIRONMENT_MATRIX

    template_db = ENVIRONMENT_MATRIX["TEMPLATE"].database
    return build_database_url(template_db)
