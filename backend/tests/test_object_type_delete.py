import app.modules.portals.models  # noqa: F401 — register portals table for ORM metadata
import app.modules.platform.action_engine.action_definitions.models  # noqa: F401
import app.modules.platform.action_engine.action_placements.models  # noqa: F401
import app.modules.platform.action_engine.action_forms.models  # noqa: F401

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types import service
from app.modules.platform.designer.object_types.cascade_delete import count_internal_entities
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.object_types.schemas import ObjectTypeCreate
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.shared.enums import ObjectTypeStatus


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_test_object_type(db: Session, tenant_id: int, key: str) -> DesignerObjectType:
    created = service.create_object_type(
        db,
        tenant_id,
        ObjectTypeCreate(
            key=key,
            name=f"Delete test {key}",
            status=ObjectTypeStatus.ACTIVE,
        ),
        current_user=None,
    )
    return db.query(DesignerObjectType).filter(DesignerObjectType.id == created.id).one()


def test_object_type_delete_preview_reports_internal_counts_not_blockers(db: Session):
    entity = (
        db.query(DesignerObjectType)
        .filter(DesignerObjectType.deleted_at.is_(None))
        .order_by(DesignerObjectType.id.desc())
        .first()
    )
    if entity is None:
        pytest.skip("No object types in database")

    preview = service.get_object_type_delete_preview(db, entity.tenant_id, entity.id)
    assert preview.name == entity.name
    assert preview.has_usage is False
    assert isinstance(preview.internal_counts, list)
    assert isinstance(preview.external_warnings, list)


def test_delete_object_type_cascades_internal_fields(db: Session):
    tenant_id = 1
    key = f"cascade_delete_{pytest.__version__.replace('.', '_')}"
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

    entity = _create_test_object_type(db, tenant_id, key)
    preview = service.get_object_type_delete_preview(db, tenant_id, entity.id)
    assert preview.has_external_warnings is False

    result = service.delete_object_type(db, tenant_id, entity.id, current_user=None)
    assert result.deleted_at is not None

    remaining_fields = (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == tenant_id,
            DesignerFieldDefinition.object_type_id == entity.id,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .count()
    )
    assert remaining_fields == 0


def test_delete_object_type_with_views_includes_view_count(db: Session):
    entity = (
        db.query(DesignerObjectType)
        .filter(DesignerObjectType.deleted_at.is_(None))
        .order_by(DesignerObjectType.id.desc())
        .first()
    )
    if entity is None:
        pytest.skip("No object types in database")

    views_count = (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == entity.tenant_id,
            DesignerViewDefinition.object_type_id == entity.id,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .count()
    )
    if views_count == 0:
        pytest.skip("No views for object type")

    counts = count_internal_entities(db, entity.tenant_id, entity.id, object_type_key=entity.key)
    view_count = next((item.count for item in counts if item.category == "views"), 0)
    assert view_count == views_count
