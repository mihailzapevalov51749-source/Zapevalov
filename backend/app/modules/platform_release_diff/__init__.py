"""Platform release diff module (WI-RELEASE-DIFF-001)."""

from app.modules.platform_release_diff.service import (
    attach_release_diff_to_manifest,
    compare_dev_template,
    validate_architectural_element_selection,
)

__all__ = [
    "attach_release_diff_to_manifest",
    "compare_dev_template",
    "validate_architectural_element_selection",
]
