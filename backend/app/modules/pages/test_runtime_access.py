import pytest
from fastapi import HTTPException

from app.modules.pages.runtime_access import (
    assert_page_office_runtime_access,
    is_page_accessible_in_office_runtime,
    is_page_visible_in_office_navigation,
    normalize_page_status,
)


def test_normalize_page_status_defaults_to_draft() -> None:
    assert normalize_page_status(None) == "draft"
    assert normalize_page_status("unknown") == "draft"


@pytest.mark.parametrize(
    ("page_status", "expected"),
    [
        ("draft", False),
        ("published", True),
        ("hidden", False),
    ],
)
def test_office_navigation_visibility(page_status: str, expected: bool) -> None:
    assert is_page_visible_in_office_navigation(page_status) is expected


@pytest.mark.parametrize(
    ("page_status", "expected"),
    [
        ("draft", False),
        ("published", True),
        ("hidden", False),
    ],
)
def test_office_runtime_access(page_status: str, expected: bool) -> None:
    assert is_page_accessible_in_office_runtime(page_status) is expected


@pytest.mark.parametrize("page_status", ["draft", "hidden"])
def test_assert_page_office_runtime_access_blocks_non_published(page_status: str) -> None:
    with pytest.raises(HTTPException) as exc_info:
        assert_page_office_runtime_access(page_status)
    assert exc_info.value.status_code == 403
