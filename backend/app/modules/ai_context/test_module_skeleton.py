import app.modules.ai_context  # noqa: F401

from app.modules.ai_context import router as ai_context_router
from app.modules.ai_context.constants import API_PREFIX
from app.modules.ai_context.service import get_ai_context_health


def test_ai_context_package_imports():
    assert ai_context_router is not None


def test_api_prefix():
    assert API_PREFIX == "/ai-context"


def test_router_prefix():
    assert ai_context_router.prefix == "/ai-context"


def test_get_ai_context_health_status():
    payload = get_ai_context_health()
    assert payload["status"] == "ok"
    assert payload["module"] == "ai_context"
