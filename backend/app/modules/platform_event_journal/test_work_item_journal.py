"""Tests for structured work item DEV journal writer."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.work_item_journal import (
    WorkItemJournalPayload,
    build_work_item_description,
    create_work_item_journal_entry,
)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    PlatformEventJournalEntry.__table__.create(bind=engine, checkfirst=True)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_build_work_item_description_requires_mandatory_fields():
    with pytest.raises(ValueError, match="summary"):
        build_work_item_description(
            WorkItemJournalPayload(
                slug="test-entry",
                title="Title",
                summary="",
                tests="ok",
                manual_smoke="NOT PERFORMED",
            )
        )


def test_create_work_item_journal_entry_writes_dev_tenant_journal(db_session, monkeypatch):
    monkeypatch.setattr(
        "app.modules.platform_event_journal.audit_service.resolve_dev_tenant_portal_id",
        lambda _db: 1,
    )

    payload = WorkItemJournalPayload(
        slug="test-work-item-journal-entry",
        title="Тестовая запись work item",
        summary="Проверка structured DEV journal writer.",
        root_cause="Regression in agent reports only.",
        changed_files=["backend/app/modules/platform_event_journal/work_item_journal.py"],
        tests="test_work_item_journal.py",
        manual_smoke="NOT PERFORMED — unit test only",
        event_type="development",
    )

    created = create_work_item_journal_entry(db_session, payload, commit=False)
    assert created is not None
    assert created.slug == "test-work-item-journal-entry"
    assert created.scope == "tenant"
    assert created.journal_kind == "dev_development"
    assert created.tenant_id == 1
    assert (created.description or "").startswith("Что сделано:")
    assert "Изменённые файлы" not in (created.description or "")
    assert created.metadata_json is not None
    assert created.metadata_json.get("changed_files")
    assert created.metadata_json.get("technical_report")

    duplicate = create_work_item_journal_entry(db_session, payload, commit=False)
    assert duplicate is None


def test_create_work_item_journal_entry_not_platform_audit(db_session, monkeypatch):
    monkeypatch.setattr(
        "app.modules.platform_event_journal.audit_service.resolve_dev_tenant_portal_id",
        lambda _db: 1,
    )

    payload = WorkItemJournalPayload(
        slug="test-journal-scope-check",
        title="Проверка scope",
        summary="Entry must land in DEV tenant journal.",
        tests="test_work_item_journal.py",
        manual_smoke="NOT PERFORMED",
    )

    created = create_work_item_journal_entry(db_session, payload, commit=False)
    assert created is not None
    assert created.scope == "tenant"
    assert created.journal_kind == "dev_development"
    assert created.scope != "platform"
