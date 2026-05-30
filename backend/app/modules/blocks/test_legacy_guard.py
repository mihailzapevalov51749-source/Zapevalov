"""Unit checks for legacy storage block creation guard."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.modules.blocks import service
from app.modules.blocks.legacy_guard import (
    LEGACY_STORAGE_CREATION_ERROR_CODE,
    LEGACY_STORAGE_CREATION_ERROR_MESSAGE,
    is_legacy_storage_block_type,
)
from app.modules.blocks.schemas import BlockCreate


@pytest.mark.parametrize(
    "block_type",
    ["universal_table", "table", "tableBlock", "table_block"],
)
def test_is_legacy_storage_block_type_aliases(block_type: str) -> None:
    assert is_legacy_storage_block_type(block_type) is True


@pytest.mark.parametrize(
    "block_type",
    ["text", "image", "document", "link", "button", "cards", "section", ""],
)
def test_is_legacy_storage_block_type_allows_non_legacy(block_type: str) -> None:
    assert is_legacy_storage_block_type(block_type) is False


def test_create_block_rejects_legacy_storage_types() -> None:
    data = BlockCreate(section_id=1, type="universal_table")

    with pytest.raises(HTTPException) as exc_info:
        service.create_block(MagicMock(), data)

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == {
        "code": LEGACY_STORAGE_CREATION_ERROR_CODE,
        "message": LEGACY_STORAGE_CREATION_ERROR_MESSAGE,
    }


def test_create_block_rejects_table_alias() -> None:
    data = BlockCreate(section_id=1, type="table")

    with pytest.raises(HTTPException) as exc_info:
        service.create_block(MagicMock(), data)

    assert exc_info.value.status_code == 422


def test_create_block_allows_text_type() -> None:
    data = BlockCreate(section_id=1, type="text")
    db = MagicMock()

    with patch("app.modules.blocks.service.repository.create_block") as mock_create:
        mock_create.return_value = MagicMock()
        service.create_block(db, data)
        mock_create.assert_called_once_with(db, data)
