from __future__ import annotations

import pytest

from app.modules.platform_event_journal.dev_journal_database import (
    DevJournalDatabaseMismatchError,
    assert_dev_journal_database_target,
    extract_database_name,
    load_dev_stack_manifest,
    open_dev_journal_db_session,
    read_dotenv_database_url,
    resolve_dev_database_name,
    resolve_dev_journal_database_url,
    resolve_guard_database_url,
)


def test_resolve_dev_database_name_from_manifest():
    manifest = load_dev_stack_manifest()
    assert resolve_dev_database_name(manifest) == "yasnopro_dev"


def test_resolve_dev_journal_database_url_points_to_dev_database():
    url = resolve_dev_journal_database_url()
    assert extract_database_name(url) == "yasnopro_dev"


def test_resolve_guard_database_url_reads_dotenv_when_process_env_unset(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    dotenv_url = read_dotenv_database_url()
    if dotenv_url is None:
        pytest.skip("repo .env DATABASE_URL not configured")
    assert resolve_guard_database_url() == dotenv_url


def test_assert_dev_journal_database_target_blocks_legacy_env(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://portal_user:portal_pass@localhost:5434/portal_constructor_v2",
    )
    with pytest.raises(DevJournalDatabaseMismatchError) as exc_info:
        assert_dev_journal_database_target()
    assert exc_info.value.expected_database == "yasnopro_dev"
    assert exc_info.value.actual_database == "portal_constructor_v2"
    assert "BLOCKED" in exc_info.value.format_blocked_message()


def test_open_dev_journal_db_session_uses_manifest_database(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://portal_user:portal_pass@localhost:5434/yasnopro_dev",
    )
    with open_dev_journal_db_session() as session:
        database_name = session.bind.url.database  # type: ignore[union-attr]
    assert database_name == "yasnopro_dev"


def test_open_dev_journal_db_session_blocks_wrong_env_database(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://portal_user:portal_pass@localhost:5434/portal_constructor_v2",
    )
    with pytest.raises(DevJournalDatabaseMismatchError):
        with open_dev_journal_db_session():
            pass
