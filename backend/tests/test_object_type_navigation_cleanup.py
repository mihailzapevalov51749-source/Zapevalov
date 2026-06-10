import app.modules.portals.models  # noqa: F401

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.navigation.enrichment import OBJECT_TYPE_NAV_TYPE
from app.modules.navigation.models import NavigationItem
from app.modules.platform.designer.object_types import service
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.object_types.navigation_cleanup import (
    collect_object_type_navigation_items,
)
from app.modules.platform.designer.object_types.schemas import ObjectTypeCreate
from app.modules.platform.shared.enums import ObjectTypeStatus


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_object_type(db: Session, tenant_id: int, key: str) -> DesignerObjectType:
    created = service.create_object_type(
        db,
        tenant_id,
        ObjectTypeCreate(
            key=key,
            name=f"Nav cleanup {key}",
            status=ObjectTypeStatus.ACTIVE,
        ),
        current_user=None,
    )
    return db.query(DesignerObjectType).filter(DesignerObjectType.id == created.id).one()


def test_collect_object_type_navigation_items_finds_runtime_and_designer(db: Session):
    tenant_id = 1
    key = f"nav_cleanup_{pytest.__version__.replace('.', '_')}"
    existing = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.key == key,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    )
    if existing is not None:
        pytest.skip("Previous test object still present")

    entity = _create_object_type(db, tenant_id, key)
    runtime_nav = NavigationItem(
        portal_id=tenant_id,
        type=OBJECT_TYPE_NAV_TYPE,
        title=entity.name,
        object_type_id=entity.id,
        url=f"/portal/{tenant_id}/object-types/{entity.key}",
        menu_scope="runtime",
    )
    designer_nav = NavigationItem(
        portal_id=tenant_id,
        type=OBJECT_TYPE_NAV_TYPE,
        title=entity.name,
        object_type_id=entity.id,
        url=f"/designer/tenant/{tenant_id}/object-types/{entity.id}/data",
        menu_scope="designer",
    )
    db.add(runtime_nav)
    db.add(designer_nav)
    db.commit()

    matched = collect_object_type_navigation_items(
        db,
        tenant_id,
        entity.id,
        object_type_key=entity.key,
    )
    matched_ids = {item.id for item in matched}
    assert runtime_nav.id in matched_ids
    assert designer_nav.id in matched_ids

    service.delete_object_type(db, tenant_id, entity.id, current_user=None)

    remaining = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.id.in_(matched_ids),
            NavigationItem.deleted_at.is_(None),
        )
        .count()
    )
    assert remaining == 0
