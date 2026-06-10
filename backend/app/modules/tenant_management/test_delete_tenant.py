import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.portals.models import Portal
from app.modules.portals.repository import create_portal
from app.modules.tenant_bootstrap import clone_tenant_structure
from app.modules.tenant_management.delete_tenant import SYSTEM_TENANT_ID, delete_tenant
from app.modules.tenant_management.exceptions import (
    SystemTenantDeleteForbiddenError,
    TenantNotFoundError,
)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_delete_tenant_forbids_system_portal(db: Session):
    with pytest.raises(SystemTenantDeleteForbiddenError):
        delete_tenant(db, SYSTEM_TENANT_ID)


def test_delete_tenant_not_found(db: Session):
    missing_id = 9_999_999
    if db.query(Portal).filter(Portal.id == missing_id).first() is not None:
        pytest.skip("Unexpected portal id occupied")

    with pytest.raises(TenantNotFoundError):
        delete_tenant(db, missing_id)


def test_delete_tenant_removes_cloned_structure(db: Session):
    source = db.query(Portal).filter(Portal.id == 1).one_or_none()
    if source is None:
        pytest.skip("Portal 1 is required")

    has_source = (
        db.query(DesignerObjectType.id)
        .filter(DesignerObjectType.tenant_id == 1, DesignerObjectType.deleted_at.is_(None))
        .first()
        is not None
    )
    if not has_source:
        pytest.skip("Portal 1 has no structure to clone")

    target = create_portal(db, "Tenant Delete MVP Test", "pytest")
    target_id = target.id
    clone_tenant_structure(db, 1, target_id)

    result = delete_tenant(db, target_id)
    assert result.tenant_id == target_id

    assert db.query(Portal).filter(Portal.id == target_id).first() is None
    assert db.query(Page).filter(Page.portal_id == target_id).count() == 0
    assert db.query(NavigationItem).filter(NavigationItem.portal_id == target_id).count() == 0
    assert (
        db.query(DesignerObjectType).filter(DesignerObjectType.tenant_id == target_id).count()
        == 0
    )


def test_delete_tenant_rolls_back_on_error(db: Session, monkeypatch):
    target = create_portal(db, "Tenant Delete Rollback Test", "pytest")
    target_id = target.id
    original_commit = db.commit

    def fail_commit():
        raise RuntimeError("simulated delete failure")

    monkeypatch.setattr(db, "commit", fail_commit)

    with pytest.raises(RuntimeError, match="simulated delete failure"):
        delete_tenant(db, target_id)

    db.rollback()
    assert db.query(Portal).filter(Portal.id == target_id).first() is not None

    monkeypatch.setattr(db, "commit", original_commit)
    delete_tenant(db, target_id)
