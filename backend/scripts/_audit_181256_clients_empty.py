"""Step 18.12.5.6 read-only audit: why client tenant missing from Companies -> Clients."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")
os.environ.setdefault("APP_ENV", "DEV")

BASE = "postgresql://portal_user:portal_pass@localhost:5434/"
DBS = ("yasnopro_dev", "yasnopro_template", "yasnopro_client")


def audit_portals(db_name: str) -> list[dict]:
    engine = create_engine(BASE + db_name)
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT id, tenant_type, environment_role, code "
                "FROM portals ORDER BY id"
            )
        )
        return [dict(row._mapping) for row in rows]


def simulate_clients_only(db_name: str) -> list[dict]:
    from app.db.session import SessionLocal
    from app.modules.control_plane.tenant_registry.service import list_tenant_registry

    # SessionLocal is bound to DATABASE_URL from .env (yasnopro_dev)
    # For other DBs use direct engine session
    engine = create_engine(BASE + db_name)
    from sqlalchemy.orm import sessionmaker

    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        items = list_tenant_registry(db, clients_only=True)
        return [
            {
                "id": item.id,
                "tenant_type": item.tenant_type.value,
                "code": item.code,
                "environment_role": None,
            }
            for item in items
        ]
    finally:
        db.close()


def simulate_api_on_dev_db() -> dict:
    from app.db.session import SessionLocal
    from app.modules.control_plane.tenant_registry.service import list_tenant_registry

    db = SessionLocal()
    try:
        all_items = list_tenant_registry(db, clients_only=False)
        client_items = list_tenant_registry(db, clients_only=True)
        return {
            "all_count": len(all_items),
            "all": [
                {
                    "id": i.id,
                    "tenant_type": i.tenant_type.value,
                    "code": i.code,
                }
                for i in all_items
            ],
            "clients_only_count": len(client_items),
            "clients_only": [
                {
                    "id": i.id,
                    "tenant_type": i.tenant_type.value,
                    "code": i.code,
                }
                for i in client_items
            ],
        }
    finally:
        db.close()


def main() -> None:
    portals_by_db = {db: audit_portals(db) for db in DBS}
    dev_api = simulate_api_on_dev_db()
    client_db_clients_only = simulate_clients_only("yasnopro_client")

    out = {
        "portals_by_db": portals_by_db,
        "dev_db_api_simulation": dev_api,
        "yasnopro_client_clients_only_simulation": client_db_clients_only,
    }
    out_path = BACKEND_ROOT / "_audit_181256_clients_empty_out.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
