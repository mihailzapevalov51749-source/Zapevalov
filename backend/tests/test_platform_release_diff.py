"""Tests for DEV vs TEMPLATE release diff (WI-RELEASE-DIFF-001)."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.modules.platform_release_diff.file_inventory import (
    compare_file_maps,
    iter_backend_app_files,
)
from app.modules.platform_release_diff.schemas import ReleaseDiffCompareOut
from app.modules.platform_release_diff.service import (
    compare_dev_template,
    validate_architectural_element_selection,
)


def _write_app_file(root: Path, rel: str, content: str) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_compare_identical_trees_returns_zero_changes(tmp_path: Path):
    dev_backend = tmp_path / "dev" / "backend" / "app"
    template_backend = tmp_path / "template" / "backend" / "app"
    dev_frontend = tmp_path / "dev" / "frontend" / "src"
    template_frontend = tmp_path / "template" / "frontend" / "src"

    for backend_root in (dev_backend, template_backend):
        _write_app_file(backend_root, "modules/platform/runtime/entities/service.py", "v1")
    for frontend_root in (dev_frontend, template_frontend):
        _write_app_file(frontend_root, "api/navigationApi.js", "export const x = 1;")

    diff = compare_dev_template(
        dev_backend_app=dev_backend,
        dev_frontend_src=dev_frontend,
        template_backend_app=template_backend,
        template_frontend_src=template_frontend,
    )

    assert diff.changed_files == 0
    assert diff.changed_elements == 0
    assert diff.dev_matches_template is True
    assert "совпадают" in (diff.message or "")


def test_single_entity_engine_change_groups_one_element(tmp_path: Path):
    dev_backend = tmp_path / "dev" / "backend" / "app"
    template_backend = tmp_path / "template" / "backend" / "app"
    dev_frontend = tmp_path / "dev" / "frontend" / "src"
    template_frontend = tmp_path / "template" / "frontend" / "src"

    _write_app_file(dev_backend, "modules/platform/runtime/entities/service.py", "v2")
    _write_app_file(template_backend, "modules/platform/runtime/entities/service.py", "v1")
    _write_app_file(dev_frontend, "api/navigationApi.js", "same")
    _write_app_file(template_frontend, "api/navigationApi.js", "same")

    diff = compare_dev_template(
        dev_backend_app=dev_backend,
        dev_frontend_src=dev_frontend,
        template_backend_app=template_backend,
        template_frontend_src=template_frontend,
    )

    assert diff.changed_files == 1
    assert diff.changed_elements == 1
    assert diff.elements[0].component_key == "entity-engine"
    assert diff.elements[0].files_count == 1


def test_multiple_files_same_element_grouped_once(tmp_path: Path):
    dev_backend = tmp_path / "dev" / "backend" / "app"
    template_backend = tmp_path / "template" / "backend" / "app"
    dev_frontend = tmp_path / "dev" / "frontend" / "src"
    template_frontend = tmp_path / "template" / "frontend" / "src"

    _write_app_file(dev_backend, "modules/platform/runtime/entities/service.py", "v2")
    _write_app_file(dev_backend, "modules/platform/runtime/entities/router.py", "v2")
    _write_app_file(template_backend, "modules/platform/runtime/entities/service.py", "v1")
    _write_app_file(template_backend, "modules/platform/runtime/entities/router.py", "v1")

    diff = compare_dev_template(
        dev_backend_app=dev_backend,
        dev_frontend_src=dev_frontend,
        template_backend_app=template_backend,
        template_frontend_src=template_frontend,
    )

    assert diff.changed_files == 2
    assert diff.changed_elements == 1
    assert diff.elements[0].component_key == "entity-engine"
    assert diff.elements[0].files_count == 2


def test_multiple_elements_grouped_correctly(tmp_path: Path):
    dev_backend = tmp_path / "dev" / "backend" / "app"
    template_backend = tmp_path / "template" / "backend" / "app"
    dev_frontend = tmp_path / "dev" / "frontend" / "src"
    template_frontend = tmp_path / "template" / "frontend" / "src"

    _write_app_file(dev_backend, "modules/platform/runtime/entities/service.py", "v2")
    _write_app_file(template_backend, "modules/platform/runtime/entities/service.py", "v1")
    _write_app_file(dev_frontend, "shared/platformModal/PlatformModal.jsx", "v2")
    _write_app_file(template_frontend, "shared/platformModal/PlatformModal.jsx", "v1")

    diff = compare_dev_template(
        dev_backend_app=dev_backend,
        dev_frontend_src=dev_frontend,
        template_backend_app=template_backend,
        template_frontend_src=template_frontend,
    )

    keys = {element.component_key for element in diff.elements}
    assert diff.changed_elements == 2
    assert "entity-engine" in keys
    assert "platform-modal" in keys


def test_validate_selection_blocks_empty_when_changes_exist():
    diff = ReleaseDiffCompareOut(
        changed_files=1,
        changed_elements=1,
        has_changes=True,
        elements=[],
    )
    with pytest.raises(Exception) as exc:
        validate_architectural_element_selection(diff, [])
    assert "Выберите архитектурные элементы" in str(exc.value)


def test_validate_selection_blocks_when_no_changes():
    diff = ReleaseDiffCompareOut(
        changed_files=0,
        changed_elements=0,
        has_changes=False,
        dev_matches_template=True,
        message="DEV и TEMPLATE совпадают. Нет изменений для публикации.",
    )
    with pytest.raises(Exception) as exc:
        validate_architectural_element_selection(diff, ["entity-engine"])
    assert "совпадают" in str(exc.value)


def test_compare_file_maps_new_modified_deleted():
    dev = {"a.py": "1", "b.py": "2"}
    template = {"b.py": "3", "c.py": "4"}
    changes = dict(compare_file_maps(dev, template))
    assert changes["a.py"] == "new"
    assert changes["b.py"] == "modified"
    assert changes["c.py"] == "deleted"


def test_iter_backend_app_files_skips_tests(tmp_path: Path):
    app_root = tmp_path / "app"
    _write_app_file(app_root, "modules/foo/service.py", "ok")
    _write_app_file(app_root, "modules/foo/test_service.py", "skip")
    rows = iter_backend_app_files(app_root)
    assert "modules/foo/service.py" in rows
    assert "modules/foo/test_service.py" not in rows
