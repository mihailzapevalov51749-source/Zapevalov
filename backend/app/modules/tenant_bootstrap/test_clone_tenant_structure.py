import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.blocks.models import Block
from app.modules.sections.models import Section
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.platform.action_engine.action_definitions.models import DesignerActionDefinition
from app.modules.platform.designer.publish.models import (
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.universal_tables.models import UniversalTable, UniversalTableColumn
from app.modules.universal_views.models import UniversalView
from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.portals.models import Portal
from app.modules.portals.repository import create_portal
from app.modules.tenant_bootstrap.clone_tenant_structure import clone_tenant_structure
from app.modules.tenant_bootstrap.exceptions import TargetTenantAlreadyHasStructureError
from app.modules.tenant_bootstrap.url_rewrite import rewrite_tenant_urls


def _purge_cloned_tenant(db: Session, target_id: int) -> None:
    page_ids = [
        row.id for row in db.query(Page.id).filter(Page.portal_id == target_id).all()
    ]
    section_ids = []
    block_ids = []
    if page_ids:
        section_ids = [
            row.id
            for row in db.query(Section.id).filter(Section.page_id.in_(page_ids)).all()
        ]
    if section_ids:
        block_ids = [
            row.id
            for row in db.query(Block.id).filter(Block.section_id.in_(section_ids)).all()
        ]

    if block_ids:
        table_ids = [
            row.id
            for row in db.query(UniversalTable.id)
            .filter(UniversalTable.block_id.in_(block_ids))
            .all()
        ]
        if table_ids:
            db.query(UniversalView).filter(UniversalView.table_id.in_(table_ids)).delete(
                synchronize_session=False
            )
            db.query(UniversalTableColumn).filter(
                UniversalTableColumn.table_id.in_(table_ids)
            ).delete(synchronize_session=False)
            db.query(UniversalTable).filter(UniversalTable.id.in_(table_ids)).delete(
                synchronize_session=False
            )
        db.query(Block).filter(Block.id.in_(block_ids)).delete(synchronize_session=False)
    if section_ids:
        db.query(Section).filter(Section.id.in_(section_ids)).delete(synchronize_session=False)

    workspace_ids = [
        row.id
        for row in db.query(DesignerWorkspace.id)
        .filter(DesignerWorkspace.tenant_id == target_id)
        .all()
    ]
    if workspace_ids:
        db.query(DesignerWorkspaceTab).filter(
            DesignerWorkspaceTab.workspace_id.in_(workspace_ids)
        ).delete(synchronize_session=False)
        db.query(DesignerWorkspace).filter(DesignerWorkspace.id.in_(workspace_ids)).delete(
            synchronize_session=False
        )

    db.query(DesignerPublishRecord).filter(
        DesignerPublishRecord.tenant_id == target_id
    ).delete(synchronize_session=False)
    db.query(DesignerMetadataSnapshot).filter(
        DesignerMetadataSnapshot.tenant_id == target_id
    ).delete(synchronize_session=False)
    db.query(NavigationItem).filter(NavigationItem.portal_id == target_id).delete(
        synchronize_session=False
    )
    db.query(Page).filter(Page.portal_id == target_id).delete(synchronize_session=False)
    db.query(DesignerActionDefinition).filter(
        DesignerActionDefinition.tenant_id == target_id
    ).delete(synchronize_session=False)
    db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == target_id
    ).delete(synchronize_session=False)
    db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == target_id
    ).delete(synchronize_session=False)
    db.query(DesignerRelationDefinition).filter(
        DesignerRelationDefinition.tenant_id == target_id
    ).delete(synchronize_session=False)
    db.query(DesignerObjectType).filter(DesignerObjectType.tenant_id == target_id).delete(
        synchronize_session=False
    )
    db.query(Portal).filter(Portal.id == target_id).delete(synchronize_session=False)
    db.commit()


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_rewrite_tenant_urls_replaces_portal_and_designer_segments():
    assert (
        rewrite_tenant_urls("/portal/1/page/12", source_tenant_id=1, target_tenant_id=2)
        == "/portal/2/page/12"
    )
    assert (
        rewrite_tenant_urls(
            "/designer/tenant/1/workspaces/dev",
            source_tenant_id=1,
            target_tenant_id=2,
        )
        == "/designer/tenant/2/workspaces/dev"
    )
    assert (
        rewrite_tenant_urls("/portal/3/page/1", source_tenant_id=1, target_tenant_id=2)
        == "/portal/3/page/1"
    )


def test_clone_tenant_structure_refuses_target_with_existing_pages(db: Session):
    source = db.query(Portal).filter(Portal.id == 1).one_or_none()
    if source is None:
        pytest.skip("Portal 1 is required for clone integration test")

    has_source_structure = (
        db.query(Page.id)
        .filter(Page.portal_id == 1, Page.deleted_at.is_(None))
        .first()
        is not None
    )
    if not has_source_structure:
        pytest.skip("Portal 1 has no pages to clone")

    target = create_portal(db, "Clone Guard Test Tenant", "pytest")
    db.add(
        Page(
            portal_id=target.id,
            title="Existing page",
            status="published",
            is_home=True,
            is_visible=True,
        )
    )
    db.commit()

    try:
        with pytest.raises(TargetTenantAlreadyHasStructureError):
            clone_tenant_structure(db, 1, target.id)
    finally:
        db.query(Page).filter(Page.portal_id == target.id).delete()
        db.query(Portal).filter(Portal.id == target.id).delete()
        db.commit()


@pytest.mark.skip(reason="Integration test mutates DB; run manually when needed")
def test_clone_tenant_structure_copies_structure_without_runtime_data(db: Session):
    source = db.query(Portal).filter(Portal.id == 1).one_or_none()
    if source is None:
        pytest.skip("Portal 1 is required for clone integration test")

    has_source_structure = (
        db.query(DesignerObjectType.id)
        .filter(DesignerObjectType.tenant_id == 1, DesignerObjectType.deleted_at.is_(None))
        .first()
        is not None
    )
    if not has_source_structure:
        pytest.skip("Portal 1 has no designer object types to clone")

    target = create_portal(db, "Clone Integration Test Tenant", "pytest")

    try:
        result = clone_tenant_structure(db, 1, target.id)

        assert result.target_tenant_id == target.id
        assert result.pages_cloned >= 0
        assert result.object_types_cloned > 0
        assert result.catalog_version is not None

        target_pages = (
            db.query(Page)
            .filter(Page.portal_id == target.id, Page.deleted_at.is_(None))
            .count()
        )
        target_nav = (
            db.query(NavigationItem)
            .filter(NavigationItem.portal_id == target.id, NavigationItem.deleted_at.is_(None))
            .count()
        )
        target_object_types = (
            db.query(DesignerObjectType)
            .filter(
                DesignerObjectType.tenant_id == target.id,
                DesignerObjectType.deleted_at.is_(None),
            )
            .count()
        )
        target_runtime_entities = (
            db.query(RuntimeEntity)
            .filter(RuntimeEntity.tenant_id == target.id)
            .count()
        )
        target_snapshots = (
            db.query(DesignerMetadataSnapshot)
            .filter(DesignerMetadataSnapshot.tenant_id == target.id)
            .count()
        )

        assert target_pages > 0
        assert target_nav > 0
        assert target_object_types > 0
        assert target_runtime_entities == 0
        assert target_snapshots >= 1

        stale_urls = (
            db.query(NavigationItem)
            .filter(
                NavigationItem.portal_id == target.id,
                NavigationItem.url.isnot(None),
                NavigationItem.url.like("%/portal/1/%"),
            )
            .count()
        )
        assert stale_urls == 0

        with pytest.raises(TargetTenantAlreadyHasStructureError):
            clone_tenant_structure(db, 1, target.id)
    finally:
        _purge_cloned_tenant(db, target.id)
