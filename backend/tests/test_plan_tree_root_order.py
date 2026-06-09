"""Plan tree root anchor and sibling reorder API semantics."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.runtime.plan_tree.constants import plan_tree_root_anchor_title
from app.modules.platform.runtime.plan_tree import service
from app.modules.platform.runtime.plan_tree.schemas import PlanTreeReorderSiblingsRequest


def test_plan_tree_root_anchor_title_is_relation_scoped() -> None:
    from app.modules.platform.runtime.plan_tree.constants import (
        plan_tree_root_anchor_title_variants,
    )

    assert plan_tree_root_anchor_title("podpunkt") == "__plan_tree_root__#podpunkt"
    assert plan_tree_root_anchor_title("") == "__plan_tree_root__"
    assert "__plan_tree_root__::podpunkt" in plan_tree_root_anchor_title_variants("podpunkt")


def test_reorder_siblings_maps_missing_edge_to_422() -> None:
    payload = PlanTreeReorderSiblingsRequest(
        parent_entity_id=uuid4(),
        ordered_child_ids=[uuid4()],
    )

    with (
        patch(
            "app.modules.platform.runtime.plan_tree.service.catalog_service.get_published_relation_metadata",
            return_value=MagicMock(settings_json={}),
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.service.reorder_hierarchy_siblings",
            side_effect=ValueError("Missing hierarchy edge"),
        ),
    ):
        with pytest.raises(HTTPException) as exc_info:
            service.reorder_siblings(MagicMock(), 1, "podpunkt", payload)

    assert exc_info.value.status_code == 422
    assert "Missing hierarchy edge" in str(exc_info.value.detail)
