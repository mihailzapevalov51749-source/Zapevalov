import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.modules.platform_event_journal.audit_constants import (
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import record_platform_event
from app.modules.platform_event_journal.models import PlatformEventJournalEntry


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    PlatformEventJournalEntry.__table__.create(bind=engine, checkfirst=True)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_record_platform_event_persists_audit_fields(db_session):
    created = record_platform_event(
        db_session,
        event_code=PlatformEventCode.COMPANY_CREATED.value,
        event_category=PlatformEventCategory.COMPANY.value,
        title="Создана компания",
        description="Tenant 15",
        actor_name="Platform Admin",
        actor_email="admin@example.com",
        target_type="company",
        target_id=15,
        target_name="ООО Ромашка",
        tenant_id=15,
        company_id=3,
        metadata={"portal_code": "ooo_romashka"},
        slug="audit-company-created-15",
    )

    assert created is not None
    assert created.scope == "platform"
    assert created.event_type == "company_created"
    assert created.event_category == "company"
    assert created.actor_email == "admin@example.com"
    assert created.target_name == "ООО Ромашка"
    assert created.tenant_id is None
    assert created.journal_kind == "platform_audit"
    assert created.company_id == 3
    assert created.metadata_json == {"portal_code": "ooo_romashka"}
    assert created.event_type_label == "Создание компании"
    assert created.event_category_label == "Company"
