#!/usr/bin/env python3
"""Link TEMPLATE tenant from yasnopro_template into CP registry (yasnopro_dev).

WI-RELEASE-REGISTRY-002 — idempotent portal + environment version stub.

Usage (from backend/):
  python scripts/link_cp_template_tenant_registry.py --dry-run
  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/link_cp_template_tenant_registry.py --execute
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.platform_version_registry.service import record_environment_version
from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID
from app.modules.tenant_environment.constants import TenantType
from app.modules.tenant_environment.resolver import get_template_tenant, resolve_template_tenant_id
from scripts.platform_data_write_guard import require_platform_data_write_approval

RELEASE_027_MANIFEST = {
    "release_id": "release-027",
    "git_commit": "14e196abdbceb9463f9c1975ac66f35a7cb58757",
    "created_at": "2026-06-19T14:43:29.4729690Z",
}


def _template_database_url(cp_database_url: str) -> str:
    if "/yasnopro_dev" in cp_database_url:
        return cp_database_url.replace("/yasnopro_dev", "/yasnopro_template", 1)
    raise ValueError(
        "Expected CP DATABASE_URL to target yasnopro_dev; "
        f"got: {cp_database_url!r}"
    )


def _load_source_template_portal(template_db_url: str) -> Portal:
    engine = create_engine(template_db_url)
    TemplateSession = sessionmaker(bind=engine)
    session = TemplateSession()
    try:
        portal = (
            session.query(Portal)
            .filter(Portal.id == PLATFORM_TEMPLATE_TENANT_ID)
            .one_or_none()
        )
        if portal is None:
            portal = (
                session.query(Portal)
                .filter(Portal.tenant_type == TenantType.TEMPLATE.value)
                .order_by(Portal.id.asc())
                .first()
            )
        if portal is None:
            raise RuntimeError("TEMPLATE portal not found in yasnopro_template")
        session.expunge(portal)
        return portal
    finally:
        session.close()
        engine.dispose()


def _portal_snapshot(portal: Portal) -> dict[str, object]:
    return {
        "id": portal.id,
        "name": portal.name,
        "original_name": portal.original_name,
        "code": portal.code,
        "short_name": portal.short_name,
        "public_slug": portal.public_slug,
        "tenant_type": portal.tenant_type,
        "environment_role": portal.environment_role,
        "template_version": portal.template_version,
        "tenant_status": portal.tenant_status,
        "is_protected": portal.is_protected,
        "is_active": portal.is_active,
    }


def _find_cp_template_portal(db: Session) -> Portal | None:
    return get_template_tenant(db)


def _copy_portal_fields(*, target: Portal, source: Portal) -> None:
    target.name = source.name
    target.original_name = source.original_name
    target.code = source.code
    target.short_name = source.short_name
    target.public_slug = source.public_slug
    target.public_slug_locked = bool(source.public_slug_locked)
    target.description = source.description
    target.logo_url = source.logo_url
    target.is_active = bool(source.is_active)
    target.is_protected = bool(source.is_protected)
    target.tenant_type = TenantType.TEMPLATE.value
    target.environment_role = source.environment_role or TenantType.TEMPLATE.value
    target.template_version = source.template_version or "1.0.0"
    target.tenant_status = source.tenant_status or "ACTIVE"
    target.source_tenant_id = None
    target.notes = source.notes
    target.timezone = source.timezone
    target.date_format = source.date_format
    target.time_format = source.time_format
    target.week_start_day = source.week_start_day
    target.default_language = source.default_language
    if source.created_at is not None:
        target.created_at = source.created_at


def _build_environment_notes(*, template_version: str) -> str:
    return (
        "WI-RELEASE-REGISTRY-002 CP linkage stub; "
        f"physical_active_release_id={RELEASE_027_MANIFEST['release_id']}; "
        f"git_commit={RELEASE_027_MANIFEST['git_commit']}; "
        f"portal.template_version={template_version}; "
        "release_package_id pending WI-RELEASE-REGISTRY-003"
    )


def _parse_manifest_installed_at() -> datetime:
    raw = RELEASE_027_MANIFEST["created_at"].replace("Z", "+00:00")
    return datetime.fromisoformat(raw).replace(tzinfo=None)


def dry_run(db: Session, *, template_db_url: str) -> dict[str, object]:
    source = _load_source_template_portal(template_db_url)
    existing = _find_cp_template_portal(db)
    env_before = db.execute(
        text(
            "SELECT id, tenant_id, environment_key, platform_version "
            "FROM platform_environment_versions WHERE tenant_id = :tid"
        ),
        {"tid": PLATFORM_TEMPLATE_TENANT_ID},
    ).fetchall()
    hist_before = db.execute(
        text("SELECT count(*) FROM platform_version_history WHERE tenant_id = :tid"),
        {"tid": PLATFORM_TEMPLATE_TENANT_ID},
    ).scalar()

    platform_version = str(source.template_version or "1.0.0").strip()
    plan = {
        "source_template_portal": _portal_snapshot(source),
        "cp_template_portal_before": _portal_snapshot(existing) if existing else None,
        "resolve_template_tenant_id_before": resolve_template_tenant_id(db),
        "portal_action": "skip" if existing is not None else "create",
        "environment_version_action": "skip" if env_before else "create",
        "planned_platform_version": platform_version,
        "planned_environment_notes": _build_environment_notes(template_version=platform_version),
        "env_versions_before": [tuple(row) for row in env_before],
        "version_history_count_before": int(hist_before or 0),
    }
    return plan


def execute(db: Session, *, template_db_url: str) -> dict[str, object]:
    require_platform_data_write_approval(script_name="link_cp_template_tenant_registry.py")

    source = _load_source_template_portal(template_db_url)
    existing = _find_cp_template_portal(db)
    created_portal = False
    created_env = False

    if existing is None:
        by_id = db.query(Portal).filter(Portal.id == PLATFORM_TEMPLATE_TENANT_ID).one_or_none()
        if by_id is not None:
            raise RuntimeError(
                f"Portal id={PLATFORM_TEMPLATE_TENANT_ID} exists but tenant_type={by_id.tenant_type!r}"
            )
        by_code = db.query(Portal).filter(Portal.code == source.code).one_or_none()
        if by_code is not None:
            raise RuntimeError(
                f"Portal code={source.code!r} already used by portal id={by_code.id}"
            )
        portal = Portal(id=PLATFORM_TEMPLATE_TENANT_ID)
        _copy_portal_fields(target=portal, source=source)
        db.add(portal)
        db.flush()
        db.execute(
            text("SELECT setval(pg_get_serial_sequence('portals', 'id'), (SELECT MAX(id) FROM portals))")
        )
        created_portal = True
        target_portal = portal
    else:
        target_portal = existing

    env_row = db.execute(
        text(
            "SELECT id FROM platform_environment_versions WHERE tenant_id = :tid LIMIT 1"
        ),
        {"tid": target_portal.id},
    ).fetchone()

    platform_version = str(source.template_version or "1.0.0").strip()
    if env_row is None:
        record_environment_version(
            db,
            tenant_id=target_portal.id,
            platform_version=platform_version,
            notes=_build_environment_notes(template_version=platform_version),
            change_description=(
                "CP TEMPLATE environment version stub linked to physical runtime release-027"
            ),
            installed_at=_parse_manifest_installed_at(),
            commit=False,
        )
        created_env = True

    db.commit()

    return {
        "created_portal": created_portal,
        "created_environment_version": created_env,
        "portal_id": target_portal.id,
        "portal_code": target_portal.code,
        "tenant_type": target_portal.tenant_type,
        "environment_role": target_portal.environment_role,
        "resolve_template_tenant_id_after": resolve_template_tenant_id(db),
        "platform_version": platform_version,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Link TEMPLATE tenant into CP registry")
    parser.add_argument("--dry-run", action="store_true", help="Show planned changes only")
    parser.add_argument("--execute", action="store_true", help="Apply linkage to yasnopro_dev")
    args = parser.parse_args()

    if args.execute == args.dry_run:
        parser.error("Specify exactly one of --dry-run or --execute")

    cp_db_url = os.environ.get("DATABASE_URL", "").strip()
    if not cp_db_url:
        print("ERROR: DATABASE_URL is required", file=sys.stderr)
        return 2
    template_db_url = _template_database_url(cp_db_url)

    db = SessionLocal()
    try:
        if args.dry_run:
            plan = dry_run(db, template_db_url=template_db_url)
            print(json.dumps(plan, ensure_ascii=False, indent=2, default=str))
            return 0

        result = execute(db, template_db_url=template_db_url)
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
        if result.get("resolve_template_tenant_id_after") is None:
            print("ERROR: resolve_template_tenant_id() still None", file=sys.stderr)
            return 1
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
