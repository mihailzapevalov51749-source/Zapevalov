"""Unit tests for environment-aware CORS configuration."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.core.cors_config import (
    CorsConfigurationError,
    build_default_local_origins,
    get_cors_middleware_kwargs,
    parse_extra_origins,
    resolve_allowed_origins,
)


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
)
def test_default_local_origins_include_all_environments(origin: str) -> None:
    assert origin in build_default_local_origins()


def test_resolve_allowed_origins_merges_env_extensions() -> None:
    origins = resolve_allowed_origins(
        env_value="https://app.example.com, https://staging.example.com",
    )
    assert "https://app.example.com" in origins
    assert "https://staging.example.com" in origins
    assert "http://localhost:5174" in origins


def test_resolve_allowed_origins_deduplicates() -> None:
    origins = resolve_allowed_origins(
        env_value="http://localhost:5173, http://localhost:5173",
    )
    assert origins.count("http://localhost:5173") == 1


def test_wildcard_origin_rejected() -> None:
    with pytest.raises(CorsConfigurationError, match="Wildcard"):
        resolve_allowed_origins(env_value="*")


def test_get_cors_middleware_kwargs_uses_credentials_without_wildcard() -> None:
    kwargs = get_cors_middleware_kwargs()
    assert kwargs["allow_credentials"] is True
    assert kwargs["allow_origins"]
    assert "*" not in kwargs["allow_origins"]


def test_cors_preflight_allows_all_local_frontend_origins() -> None:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.add_middleware(CORSMiddleware, **get_cors_middleware_kwargs())

    @app.get("/auth/me")
    def auth_me() -> dict[str, bool]:
        return {"ok": True}

    client = TestClient(app)
    for origin in build_default_local_origins():
        response = client.options(
            "/auth/me",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin
        assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_blocks_unknown_origin() -> None:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.add_middleware(CORSMiddleware, **get_cors_middleware_kwargs())

    @app.get("/auth/me")
    def auth_me() -> dict[str, bool]:
        return {"ok": True}

    client = TestClient(app)
    response = client.get(
        "/auth/me",
        headers={"Origin": "http://evil.example.com"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") != "http://evil.example.com"


def test_main_py_uses_central_cors_config() -> None:
    main_source = Path(__file__).resolve().parents[1].joinpath("main.py").read_text(encoding="utf-8")
    assert "from app.core.cors_config import get_cors_middleware_kwargs" in main_source
    assert "http://localhost:5173" not in main_source
