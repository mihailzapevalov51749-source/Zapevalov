"""Constants for DEV vs TEMPLATE release diff (WI-RELEASE-DIFF-001)."""

from __future__ import annotations

RELEASE_DIFF_MANIFEST_KEY = "release_diff"
INCLUDED_ARCHITECTURAL_ELEMENTS_KEY = "included_architectural_elements"

BACKEND_IMPLEMENTATION_SUFFIXES = frozenset({".py"})
FRONTEND_IMPLEMENTATION_SUFFIXES = frozenset({".jsx", ".js", ".ts", ".tsx", ".css"})

EXCLUDED_DIR_NAMES = frozenset({
    "__pycache__",
    ".pytest_cache",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "coverage",
    "temporary",
    "tmp",
})

EXCLUDED_PATH_SEGMENTS = frozenset({
    "docs",
    ".cursor",
    "tests",
    "test",
    "__pycache__",
})

CHANGE_NEW = "new"
CHANGE_MODIFIED = "modified"
CHANGE_DELETED = "deleted"
CHANGE_UNCHANGED = "unchanged"
