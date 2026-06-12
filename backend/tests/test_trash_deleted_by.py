"""Soft delete must persist deleted_by for trash audit."""

from unittest.mock import MagicMock
from uuid import uuid4

from app.modules.navigation.models import NavigationItem
from app.modules.platform.designer.relation_definitions import repository as relation_repository
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.trash import service as trash_service
from app.modules.platform.designer.trash.dependency_resolution_service import DependencyResolutionService
from app.modules.platform.designer.view_definitions import repository as view_repository
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspaceTab


def test_view_soft_delete_writes_deleted_by() -> None:
    db = MagicMock()
    entity = DesignerViewDefinition(
        tenant_id=1,
        object_type_id=uuid4(),
        key="test_view",
        name="Test view",
        view_type="table",
    )

    view_repository.soft_delete_view(db, entity, deleted_by=42)

    assert entity.deleted_at is not None
    assert entity.deleted_by == 42
    db.commit.assert_called_once()


def test_relation_soft_delete_writes_deleted_by() -> None:
    db = MagicMock()
    entity = DesignerRelationDefinition(
        tenant_id=1,
        source_object_type_id=uuid4(),
        target_object_type_id=uuid4(),
        key="test_relation",
        name="Test relation",
        relation_type="one_to_many",
    )

    relation_repository.soft_delete_relation(db, entity, deleted_by=17)

    assert entity.deleted_at is not None
    assert entity.deleted_by == 17
    db.commit.assert_called_once()


def test_dependency_resolution_soft_delete_writes_deleted_by() -> None:
    nav = NavigationItem(portal_id=1, type="page", title="Nav")
    tab = DesignerWorkspaceTab(
        tenant_id=1,
        workspace_id=1,
        title="Tab",
        slug="tab",
        tab_type="page",
    )
    view = DesignerViewDefinition(
        tenant_id=1,
        object_type_id=uuid4(),
        key="cascade_view",
        name="Cascade view",
        view_type="table",
    )

    DependencyResolutionService._soft_delete_navigation(MagicMock(), nav, deleted_by=5)
    DependencyResolutionService._soft_delete_workspace_tab(MagicMock(), tab, deleted_by=5)
    DependencyResolutionService._soft_delete_object_view(MagicMock(), view, deleted_by=5)

    assert nav.deleted_by == 5
    assert tab.deleted_by == 5
    assert view.deleted_by == 5


def test_dependency_resolution_cascade_delete_writes_deleted_by() -> None:
    child = NavigationItem(portal_id=1, type="page", title="Child", parent_id=5)
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = [child]

    DependencyResolutionService._cascade_delete_navigation_children(db, 5, deleted_by=99)

    assert child.deleted_by == 99
    assert child.deleted_at is not None


def test_trash_api_returns_deleted_by_label() -> None:
    item = trash_service._to_list_item(
        kind="page",
        entity_id="1",
        title="Страница",
        placement_label="Студия → Страницы",
        deleted_at=None,
        created_at=None,
        deleted_by=7,
        user_labels={7: "Аудитор Корзины"},
    )

    assert item.deleted_by_label == "Аудитор Корзины"

    missing_actor = trash_service._to_list_item(
        kind="page",
        entity_id="2",
        title="Старая страница",
        placement_label="Студия → Страницы",
        deleted_at=None,
        created_at=None,
        deleted_by=None,
        user_labels={},
    )

    assert missing_actor.deleted_by_label == "—"
