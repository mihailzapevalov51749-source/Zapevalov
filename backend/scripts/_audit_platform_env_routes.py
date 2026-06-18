"""Read-only audit: platform-environments route registration."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")
os.environ.setdefault("APP_ENV", "DEV")


def main() -> None:
    from app.modules.control_plane.router import router as cp_router

    cp_routes = [
        {"path": route.path, "methods": sorted(route.methods)}
        for route in cp_router.routes
        if hasattr(route, "path")
    ]
    pe = [r for r in cp_routes if "platform-environment" in r["path"]]

    from app.main import app

    app_routes = [
        getattr(route, "path", "")
        for route in app.routes
        if getattr(route, "path", "") and "platform-environment" in getattr(route, "path", "")
    ]

    from fastapi.testclient import TestClient

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/control-plane/platform-environments")

    out = {
        "control_plane_platform_environments": pe,
        "app_platform_environments": app_routes,
        "get_status_without_auth": response.status_code,
        "get_detail_without_auth": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text[:200],
    }
    out_path = BACKEND_ROOT / "_audit_platform_env_routes_out.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
