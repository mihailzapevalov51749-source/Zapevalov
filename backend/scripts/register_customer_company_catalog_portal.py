"""Register existing client tenant in platform customer_companies catalog (DEV registry DB).

One-time registration: reads portal metadata from source DB, writes catalog row to target DB.
Not used at runtime for Companies list (no cross-db on page load).
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")

from app.modules.control_plane.customer_companies.catalog_fields import (
    apply_catalog_metadata,
    extract_database_name,
)
from app.modules.control_plane.customer_companies.catalog_service import find_catalog_company_by_portal
from app.modules.control_plane.customer_companies.constants import CustomerCompanyStatus
from app.modules.control_plane.customer_companies.models import CustomerCompany

DEFAULT_BASE = "postgresql://portal_user:portal_pass@localhost:5434/"
TARGET_DB = "yasnopro_dev"
SOURCE_DB = "yasnopro_client"
PORTAL_ID = 21


def _load_portal_row(database_url: str, portal_id: int) -> dict:
    engine = create_engine(database_url)
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT id, name, original_name, code, tenant_type, environment_role, "
                "tenant_status, short_name, public_slug, template_version "
                "FROM portals WHERE id = :portal_id"
            ),
            {"portal_id": portal_id},
        ).one_or_none()
    if row is None:
        raise RuntimeError(f"Portal id={portal_id} not found in {database_url}")
    return dict(row._mapping)


def _load_home_page_id(database_url: str, portal_id: int) -> int | None:
    engine = create_engine(database_url)
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT id FROM pages "
                "WHERE portal_id = :portal_id AND is_home = true "
                "ORDER BY id ASC LIMIT 1"
            ),
            {"portal_id": portal_id},
        ).first()
        if row is None:
            row = conn.execute(
                text(
                    "SELECT id FROM pages "
                    "WHERE portal_id = :portal_id "
                    "ORDER BY id ASC LIMIT 1"
                ),
                {"portal_id": portal_id},
            ).first()
    if row is None:
        return None
    return int(row[0])


def register_portal_catalog(
    *,
    target_database_url: str,
    source_database_url: str,
    portal_id: int,
    dry_run: bool,
) -> dict:
    portal = _load_portal_row(source_database_url, portal_id)
    database_name = extract_database_name(source_database_url)
    home_page_id = _load_home_page_id(source_database_url, portal_id)

    Session = sessionmaker(bind=create_engine(target_database_url))
    db = Session()
    try:
        existing = find_catalog_company_by_portal(
            db,
            portal_id=portal_id,
            database_name=database_name,
        )
        if existing is not None:
            updated = False
            if existing.home_page_id is None and home_page_id is not None:
                existing.home_page_id = home_page_id
                updated = True
            if updated:
                db.commit()
                db.refresh(existing)
            return {
                "action": "skipped" if not updated else "updated",
                "catalog_id": existing.id,
                "portal_id": portal_id,
                "database_name": database_name,
                "home_page_id": existing.home_page_id,
            }

        company = CustomerCompany(
            name=str(portal["name"]),
            status=CustomerCompanyStatus.ACTIVE.value,
            primary_portal_id=None,
            users_limit=10,
        )
        apply_catalog_metadata(
            company,
            portal_id=int(portal["id"]),
            database_name=database_name,
            code=str(portal["code"]) if portal["code"] else None,
            tenant_type=str(portal["tenant_type"]),
            environment_role=str(portal["environment_role"]) if portal["environment_role"] else None,
            tenant_status=str(portal["tenant_status"]),
            original_name=str(portal["original_name"] or portal["name"]),
            name=str(portal["name"]),
            short_name=str(portal["short_name"]) if portal["short_name"] else None,
            public_slug=str(portal["public_slug"]) if portal["public_slug"] else None,
            template_version=str(portal["template_version"]) if portal["template_version"] else None,
            platform_version=str(portal["template_version"]) if portal["template_version"] else None,
            home_page_id=home_page_id,
        )

        if dry_run:
            return {
                "action": "dry_run",
                "portal_id": portal_id,
                "database_name": database_name,
                "code": company.code,
                "tenant_type": company.tenant_type,
            }

        db.add(company)
        db.commit()
        db.refresh(company)
        return {
            "action": "created",
            "catalog_id": company.id,
            "portal_id": company.portal_id,
            "database_name": company.database_name,
            "code": company.code,
        }
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Register client tenant in customer_companies catalog")
    parser.add_argument("--portal-id", type=int, default=PORTAL_ID)
    parser.add_argument("--target-db", default=TARGET_DB)
    parser.add_argument("--source-db", default=SOURCE_DB)
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    result = register_portal_catalog(
        target_database_url=args.base_url + args.target_db,
        source_database_url=args.base_url + args.source_db,
        portal_id=args.portal_id,
        dry_run=args.dry_run,
    )
    print(result)


if __name__ == "__main__":
    main()
