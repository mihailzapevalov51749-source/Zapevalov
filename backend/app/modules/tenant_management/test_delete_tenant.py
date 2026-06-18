import pytest

from sqlalchemy.orm import Session



from app.modules.navigation.models import NavigationItem

from app.modules.pages.models import Page

from app.modules.platform.designer.object_types.models import DesignerObjectType

from app.modules.portals.models import Portal

from app.modules.portals.repository import create_portal

from app.modules.tenant_bootstrap import clone_tenant_structure

from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID

from app.modules.tenant_environment.constants import TenantStatus

from app.modules.tenant_management.constants import (

    DEMO_CLIENT_TENANT_KEY,

    SYSTEM_TENANT_ID,

)

from app.modules.tenant_management.delete_tenant import delete_tenant, purge_tenant_hard

from app.modules.tenant_management.exceptions import (

    SystemTenantDeleteForbiddenError,

    TenantNotFoundError,

)

from app.modules.tenant_management.demo_tenant_inventory import assert_demo_tenant_inventory





def test_delete_tenant_forbids_system_portal(db: Session):

    with pytest.raises(SystemTenantDeleteForbiddenError):

        delete_tenant(db, SYSTEM_TENANT_ID)





def test_delete_tenant_forbids_template_portal(db: Session):

    if db.query(Portal).filter(Portal.id == PLATFORM_TEMPLATE_TENANT_ID).first() is None:

        pytest.skip("Platform template tenant is required")



    with pytest.raises(SystemTenantDeleteForbiddenError):

        delete_tenant(db, PLATFORM_TEMPLATE_TENANT_ID)





def test_delete_tenant_forbids_demo_client_portal(db: Session):

    demo = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).first()

    if demo is None:

        pytest.skip("Demo client portal is required")



    with pytest.raises(SystemTenantDeleteForbiddenError):

        delete_tenant(db, demo.id)





def test_delete_tenant_not_found(db: Session):

    missing_id = 9_999_999

    if db.query(Portal).filter(Portal.id == missing_id).first() is not None:

        pytest.skip("Unexpected portal id occupied")



    with pytest.raises(TenantNotFoundError):

        delete_tenant(db, missing_id)





def test_delete_tenant_archives_non_protected_portal(db: Session):

    target = create_portal(

        db,

        name="Tenant Delete MVP Test",

        description="pytest",

        tenant_type="CLIENT",

    )

    target_id = target.id



    result = delete_tenant(db, target_id)

    assert result.archived is True



    archived = db.query(Portal).filter(Portal.id == target_id).one()

    assert archived.tenant_status == TenantStatus.ARCHIVED.value

    assert archived.is_active is False





def test_purge_tenant_hard_removes_cloned_structure(db: Session, monkeypatch):

    monkeypatch.setenv("YASNOPRO_ALLOW_TENANT_HARD_DELETE", "1")



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



    target = create_portal(

        db,

        name="Tenant Delete MVP Test",

        description="pytest",

        tenant_type="CLIENT",

    )

    target_id = target.id

    clone_tenant_structure(db, 1, target_id)



    result = purge_tenant_hard(db, target_id, confirm=True)

    assert result.hard_deleted is True



    assert db.query(Portal).filter(Portal.id == target_id).first() is None

    assert db.query(Page).filter(Page.portal_id == target_id).count() == 0

    assert db.query(NavigationItem).filter(NavigationItem.portal_id == target_id).count() == 0

    assert (

        db.query(DesignerObjectType).filter(DesignerObjectType.tenant_id == target_id).count()

        == 0

    )

    assert_demo_tenant_inventory(db)


