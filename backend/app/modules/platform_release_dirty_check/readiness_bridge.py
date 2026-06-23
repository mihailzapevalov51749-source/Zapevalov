"""Readiness Gate integration stub for Publish Orchestrator (WI-REL-004 prep).

WI-REL-002: exposes evaluation helper only — orchestrator publish path unchanged.
"""

from __future__ import annotations

from typing import Any

from app.modules.platform_release_dirty_check.checker import (
    build_readiness_gate_attachment,
    dirty_check_blocks_publish,
    run_dirty_dev_check_for_package,
)
from app.modules.platform_release_dirty_check.constants import READINESS_GATE_HOOK_KEY


def evaluate_dirty_dev_check_for_publish(package: Any) -> dict[str, Any]:
    """
    Entry point for future WI-REL-004 VALIDATING phase.

    Returns attachment dict suitable for deployment_manifest_json / orchestrator manifest.
    Does NOT block publish in WI-REL-002.
    """
    result = run_dirty_dev_check_for_package(package)
    attachment = build_readiness_gate_attachment(result)
    attachment[READINESS_GATE_HOOK_KEY]["result"] = result.to_dict()
    attachment[READINESS_GATE_HOOK_KEY]["would_block_publish"] = dirty_check_blocks_publish(result)
    return attachment
