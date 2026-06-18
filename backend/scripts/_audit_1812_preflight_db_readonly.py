"""Step 18.12-preflight read-only database audit via SQLAlchemy."""
from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import create_engine, text

BASE = "postgresql://portal_user:portal_pass@localhost:5434/"
DBS = ("yasnopro_dev", "yasnopro_template", "yasnopro_client")


def audit_db(db_name: str) -> dict:
    engine = create_engine(BASE + db_name)
    with engine.connect() as conn:
        return {
            "current_database": conn.execute(text("SELECT current_database()")).scalar(),
            "alembic_version": conn.execute(text("SELECT version_num FROM alembic_version")).scalar(),
            "portals": [
                dict(row._mapping)
                for row in conn.execute(
                    text(
                        "SELECT id, tenant_type, environment_role, code, is_protected "
                        "FROM portals ORDER BY id"
                    )
                )
            ],
            "users_count": conn.execute(text("SELECT COUNT(*) FROM users")).scalar(),
            "users": [
                dict(row._mapping)
                for row in conn.execute(
                    text(
                        "SELECT id, email, tenant_id, is_system_user, is_hidden_user "
                        "FROM users ORDER BY id"
                    )
                )
            ],
            "memberships_count": conn.execute(
                text("SELECT COUNT(*) FROM tenant_user_memberships")
            ).scalar(),
            "profiles_count": conn.execute(
                text("SELECT COUNT(*) FROM tenant_user_profiles")
            ).scalar(),
            "bootstrap": [
                dict(row._mapping)
                for row in conn.execute(
                    text(
                        "SELECT u.id, u.email, u.tenant_id, "
                        "(SELECT COUNT(*) FROM tenant_user_memberships m WHERE m.user_id = u.id) AS memberships, "
                        "(SELECT COUNT(*) FROM tenant_user_profiles p WHERE p.user_id = u.id) AS profiles "
                        "FROM users u WHERE lower(u.email) = lower('bootstrap@yasnopro.dev')"
                    )
                )
            ],
        }


def main() -> None:
    report = {db: audit_db(db) for db in DBS}
    out = Path(__file__).with_name("_audit_1812_preflight_db_readonly_out.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
