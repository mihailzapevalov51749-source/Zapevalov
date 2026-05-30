"""Legacy Universal Table storage block creation guard (Phase 9.3 / Layer 2b)."""

from __future__ import annotations

LEGACY_STORAGE_BLOCK_TYPES: frozenset[str] = frozenset(
    {
        "universal_table",
        "table",
        "tableBlock",
        "table_block",
    }
)

LEGACY_STORAGE_CREATION_ERROR_CODE = "legacy_storage_creation_forbidden"

LEGACY_STORAGE_CREATION_ERROR_MESSAGE = (
    "Creating new Universal Table storage blocks is disabled. "
    "Create Object Type in Studio and publish it to Office."
)


def normalize_block_type(block_type: str | None) -> str:
    return str(block_type or "").strip()


def is_legacy_storage_block_type(block_type: str | None) -> bool:
    return normalize_block_type(block_type) in LEGACY_STORAGE_BLOCK_TYPES


def get_legacy_storage_creation_error_message() -> str:
    return LEGACY_STORAGE_CREATION_ERROR_MESSAGE
