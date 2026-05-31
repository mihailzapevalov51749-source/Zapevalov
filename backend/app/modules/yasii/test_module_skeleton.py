import app.modules.yasii  # noqa: F401

from app.modules.yasii import router as yasii_router
from app.modules.yasii.constants import API_PREFIX
from app.modules.yasii.service import get_yasii_health


def test_yasii_package_imports():
    assert yasii_router is not None


def test_api_prefix():
    assert API_PREFIX == "/yasii"


def test_router_prefix():
    assert yasii_router.prefix == "/yasii"


def test_get_yasii_health_status():
    payload = get_yasii_health()
    assert payload["status"] == "ok"
    assert payload["module"] == "yasii"
