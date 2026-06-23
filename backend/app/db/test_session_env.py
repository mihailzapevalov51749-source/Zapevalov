"""Session env loading tests (WI-RT-014A)."""

from __future__ import annotations

import importlib
import os

import pytest


@pytest.fixture
def reload_session_module(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/test_db")
    monkeypatch.delenv("DOTENV_PATH", raising=False)
    import app.db.session as session_module

    return importlib.reload(session_module)


def test_session_uses_process_database_url(reload_session_module):
    assert reload_session_module.DATABASE_URL == "postgresql://user:pass@localhost:5432/test_db"


def test_session_raises_without_database_url(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DOTENV_PATH", raising=False)
    import app.db.session as session_module

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        importlib.reload(session_module)
