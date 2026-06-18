"""Unique semver-like strings for committed integration tests."""

from __future__ import annotations

import uuid


def unique_test_module_version(*, major: int = 999) -> str:
    token = uuid.uuid4().hex
    return f"{major}.{int(token[:8], 16)}.{int(token[8:16], 16)}"
