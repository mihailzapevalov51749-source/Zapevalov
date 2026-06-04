"""Pytest bootstrap: avoid shadowing stdlib `platform` when collecting under app/modules/platform/."""

from __future__ import annotations

import importlib
import sys


def _restore_stdlib_platform() -> None:
    mod = sys.modules.get("platform")
    if mod is not None and hasattr(mod, "python_implementation"):
        return

    for key in list(sys.modules):
        if key == "platform" or key.startswith("platform."):
            del sys.modules[key]

    importlib.import_module("platform")


_restore_stdlib_platform()
