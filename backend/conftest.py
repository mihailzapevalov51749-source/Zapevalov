"""Pytest bootstrap: avoid shadowing stdlib `platform` when collecting under app/modules/platform/."""

from __future__ import annotations

import importlib
import os
import sys

# Existing integration tests import app.main against legacy .env; guard is opt-in at runtime.
os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")


def _restore_stdlib_platform() -> None:
    mod = sys.modules.get("platform")
    if mod is not None and hasattr(mod, "python_implementation"):
        return

    for key in list(sys.modules):
        if key == "platform" or key.startswith("platform."):
            del sys.modules[key]

_restore_stdlib_platform()

pytest_plugins = ["tests.tenant_test_discipline", "tests.user_test_discipline"]
