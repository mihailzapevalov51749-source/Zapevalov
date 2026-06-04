"""Domain constraints for task_subtask relation profile."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.modules.platform.runtime.catalog.service import PublishedRelationMetadata
from app.modules.platform.runtime.relation_instances import service, validators
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceCreate
from app.modules.platform.runtime.relation_instances.task_subtask_constraints import (
    TASK_SUBTASK_CYCLE_MESSAGE,
    TASK_SUBTASK_MULTIPLE_PARENTS_MESSAGE,
    TASK_SUBTASK_SELF_LINK_MESSAGE,
    would_create_task_subtask_cycle,
)
from app.modules.platform.shared.enums import RelationType
from app.modules.platform.shared.task_subtask_contract import TASK_SUBTASK_RELATION_KEY


def _task_subtask_metadata(**overrides):
    defaults = {
        "tenant_id": 1,
        "catalog_version": 1,
        "relation_id": uuid4(),
        "relation_key": TASK_SUBTASK_RELATION_KEY,
        "relation_type": RelationType.ONE_TO_MANY.value,
        "source_object_type_key": "task",
        "target_object_type_key": "task",
        "is_active": True,
        "settings_json": {"semantic_profile": "task_subtask"},
    }
    defaults.update(overrides)
    return PublishedRelationMetadata(**defaults)


def _entity(entity_id, object_type_key: str = "task"):
    entity = MagicMock()
    entity.id = entity_id
    entity.object_type_key = object_type_key
    return entity


def test_task_subtask_allows_multiple_children_same_parent() -> None:
    parent_id = uuid4()
    child_b = uuid4()
    child_c = uuid4()
    metadata = _task_subtask_metadata()
    db = MagicMock()

    with (
        patch(
            "app.modules.platform.runtime.relation_instances.task_subtask_constraints.repository.find_active_incoming_for_target",
            return_value=None,
        ),
        patch(
            "app.modules.platform.runtime.relation_instances.task_subtask_constraints.repository.list_active_edges_by_relation_key",
            return_value=[],
        ),
    ):
        validators.validate_relation_instance_create(
            relation_metadata=metadata,
            source_entity=_entity(parent_id),
            target_entity=_entity(child_b),
            source_entity_id=parent_id,
            target_entity_id=child_b,
            db=db,
            tenant_id=1,
        )

    with (
        patch(
            "app.modules.platform.runtime.relation_instances.task_subtask_constraints.repository.find_active_incoming_for_target",
            return_value=None,
        ),
        patch(
            "app.modules.platform.runtime.relation_instances.task_subtask_constraints.repository.list_active_edges_by_relation_key",
            return_value=[(parent_id, child_b)],
        ),
    ):
        validators.validate_relation_instance_create(
            relation_metadata=metadata,
            source_entity=_entity(parent_id),
            target_entity=_entity(child_c),
            source_entity_id=parent_id,
            target_entity_id=child_c,
            db=db,
            tenant_id=1,
        )


def test_task_subtask_rejects_second_parent() -> None:
    parent_a = uuid4()
    parent_b = uuid4()
    child_x = uuid4()
    existing = MagicMock()
    existing.source_entity_id = parent_a

    with (
        patch(
            "app.modules.platform.runtime.relation_instances.task_subtask_constraints.repository.find_active_incoming_for_target",
            return_value=existing,
        ),
        patch(
            "app.modules.platform.runtime.relation_instances.task_subtask_constraints.repository.list_active_edges_by_relation_key",
            return_value=[(parent_a, child_x)],
        ),
    ):
        with pytest.raises(ValueError, match="уже есть родительская"):
            from app.modules.platform.runtime.relation_instances.task_subtask_constraints import (
                validate_task_subtask_instance_create,
            )

            validate_task_subtask_instance_create(
                MagicMock(),
                1,
                relation_metadata=_task_subtask_metadata(),
                source_entity_id=parent_b,
                target_entity_id=child_x,
            )


def test_task_subtask_rejects_self_link() -> None:
    entity_id = uuid4()

    from app.modules.platform.runtime.relation_instances.task_subtask_constraints import (
        validate_task_subtask_instance_create,
    )

    with pytest.raises(ValueError, match="Самоссылка"):
        validate_task_subtask_instance_create(
            MagicMock(),
            1,
            relation_metadata=_task_subtask_metadata(),
            source_entity_id=entity_id,
            target_entity_id=entity_id,
        )


def test_task_subtask_rejects_cycle() -> None:
    a_id = uuid4()
    b_id = uuid4()
    c_id = uuid4()

    with patch(
        "app.modules.platform.runtime.relation_instances.task_subtask_constraints.repository.list_active_edges_by_relation_key",
        return_value=[(a_id, b_id), (b_id, c_id)],
    ):
        assert (
            would_create_task_subtask_cycle(
                MagicMock(),
                1,
                TASK_SUBTASK_RELATION_KEY,
                c_id,
                a_id,
            )
            is True
        )


def test_task_subtask_cycle_helper_allows_non_cyclic_chain() -> None:
    a_id = uuid4()
    b_id = uuid4()
    c_id = uuid4()

    with patch(
        "app.modules.platform.runtime.relation_instances.task_subtask_constraints.repository.list_active_edges_by_relation_key",
        return_value=[(a_id, b_id), (b_id, c_id)],
    ):
        assert (
            would_create_task_subtask_cycle(
                MagicMock(),
                1,
                TASK_SUBTASK_RELATION_KEY,
                a_id,
                c_id,
            )
            is False
        )


def test_non_task_subtask_self_relation_still_allowed() -> None:
    entity_id = uuid4()
    metadata = _task_subtask_metadata(
        relation_key="document_replacement",
        source_object_type_key="document",
        target_object_type_key="document",
        settings_json={},
    )

    validators.validate_relation_instance_create(
        relation_metadata=metadata,
        source_entity=_entity(entity_id, "document"),
        target_entity=_entity(entity_id, "document"),
        source_entity_id=entity_id,
        target_entity_id=entity_id,
        db=MagicMock(),
        tenant_id=1,
    )


@patch("app.modules.platform.runtime.relation_instances.service.repository.find_duplicate_active", return_value=None)
@patch("app.modules.platform.runtime.relation_instances.service.entities_repository.get_entity")
@patch("app.modules.platform.runtime.relation_instances.service.catalog_service.get_published_relation_metadata")
def test_create_relation_instance_applies_task_subtask_rules(
    mock_get_metadata,
    mock_get_entity,
    _mock_duplicate,
) -> None:
    entity_id = uuid4()
    metadata = _task_subtask_metadata()
    mock_get_metadata.return_value = metadata
    mock_get_entity.return_value = _entity(entity_id)

    with pytest.raises(Exception) as exc_info:
        service.create_relation_instance(
            MagicMock(),
            1,
            TASK_SUBTASK_RELATION_KEY,
            RelationInstanceCreate(
                source_entity_id=entity_id,
                target_entity_id=entity_id,
            ),
        )

    assert TASK_SUBTASK_SELF_LINK_MESSAGE in str(exc_info.value.detail)
