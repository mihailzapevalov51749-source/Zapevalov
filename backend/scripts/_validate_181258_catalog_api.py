"""Validate catalog API returns tenant 21."""
import os
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DATABASE_URL", "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_dev")
os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")
os.environ.setdefault("APP_ENV", "DEV")

from fastapi.testclient import TestClient

from app.main import app
from app.modules.control_plane.dependencies import require_platform_admin

app.dependency_overrides[require_platform_admin] = lambda: SimpleNamespace(id=1)
client = TestClient(app)
response = client.get("/control-plane/customer-companies/catalog")
print("status", response.status_code)
print("body", response.text)
