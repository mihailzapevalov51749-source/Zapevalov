"""Regression: Architecture Navigator routes must be registered in FastAPI app."""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")
os.environ.setdefault("APP_ENV", "DEV")
os.environ.setdefault("YASNOPRO_ENV", "DEV")

EXPECTED_PATHS = {
    "/dev/architecture/tree": {"get"},
    "/dev/architecture/component/{component_id}": {"get"},
    "/dev/architecture/registries/{registry_key}/document": {"get"},
    "/dev/architecture/scan": {"post"},
    "/dev/architecture/scan/latest": {"get"},
}


@pytest.fixture(scope="module")
def openapi_paths():
    from app.main import app

    return app.openapi()["paths"]


def test_architecture_navigator_paths_registered(openapi_paths):
    for path, methods in EXPECTED_PATHS.items():
        assert path in openapi_paths, f"missing OpenAPI path: {path}"
        registered = {method.lower() for method in openapi_paths[path]}
        assert methods.issubset(registered), f"{path} methods {methods} not in {registered}"
