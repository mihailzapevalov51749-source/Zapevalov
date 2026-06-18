"""Validate clients_only after Step 18.12.5.7 classification fix."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.modules.control_plane.tenant_registry.service import list_tenant_registry

BASE = "postgresql://portal_user:portal_pass@localhost:5434/"

for db_name in ("yasnopro_dev", "yasnopro_client"):
    engine = create_engine(BASE + db_name)
    Session = sessionmaker(bind=engine)
    db = Session()
    with engine.connect() as conn:
        portals = [
            dict(row._mapping)
            for row in conn.execute(
                text(
                    "SELECT id, tenant_type, environment_role, code "
                    "FROM portals ORDER BY id"
                )
            )
        ]
    items = list_tenant_registry(db, clients_only=True)
    print(f"=== {db_name} ===")
    print("portals:", portals)
    print(
        "clients_only:",
        [(item.id, item.tenant_type.value, item.code) for item in items],
    )
    db.close()
