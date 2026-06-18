"""Read-only audit: Companies -> Clients data source and registries."""
from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import create_engine, text

BASE = "postgresql://portal_user:portal_pass@localhost:5434/"
DBS = ("yasnopro_dev", "yasnopro_template", "yasnopro_client")

QUERIES = {
    "portals": (
        "SELECT id, tenant_type, environment_role, code, tenant_status "
        "FROM portals ORDER BY id"
    ),
    "customer_companies": (
        "SELECT id, name, status, primary_portal_id "
        "FROM customer_companies ORDER BY id"
    ),
    "platform_environment_versions": (
        "SELECT id, tenant_id, environment_key, platform_version "
        "FROM platform_environment_versions ORDER BY id"
    ),
    "platform_deployments": (
        "SELECT id, target_environment_type, target_tenant_id, target_platform_version "
        "FROM platform_deployments ORDER BY id LIMIT 20"
    ),
}


def table_exists(engine, table_name: str) -> bool:
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT EXISTS ("
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema='public' AND table_name=:table_name"
                ")"
            ),
            {"table_name": table_name},
        ).scalar()
    return bool(row)


def run_query(engine, sql: str) -> list[dict]:
    with engine.connect() as conn:
        try:
            rows = conn.execute(text(sql))
            return [dict(row._mapping) for row in rows]
        except Exception as exc:  # noqa: BLE001
            return [{"error": str(exc)}]


def main() -> None:
    out: dict = {}
    for db_name in DBS:
        engine = create_engine(BASE + db_name)
        db_out: dict = {"tables": {}, "queries": {}}
        for table in (
            "portals",
            "customer_companies",
            "platform_environment_versions",
            "platform_deployments",
            "platform_release_packages",
            "platform_builds",
            "tenant_modules",
        ):
            db_out["tables"][table] = table_exists(engine, table)
        for key, sql in QUERIES.items():
            if db_out["tables"].get(key.split("_")[0] if key == "portals" else key, False) or key == "portals":
                if key == "portals" or db_out["tables"].get(
                    {
                        "customer_companies": "customer_companies",
                        "platform_environment_versions": "platform_environment_versions",
                        "platform_deployments": "platform_deployments",
                    }.get(key, key),
                    False,
                ):
                    db_out["queries"][key] = run_query(engine, sql)
        out[db_name] = db_out

    out_path = Path(__file__).resolve().parents[1] / "_audit_companies_clients_source_out.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
