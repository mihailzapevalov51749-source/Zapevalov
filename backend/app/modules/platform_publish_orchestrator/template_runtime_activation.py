"""TEMPLATE runtime activation — switch ``current/`` junction (WI-IMPL-009, ADR-RUN-001).

Mirrors ``-SwitchToRelease`` in ``promote_template_backend.ps1`` /
``Set-TemplateCurrentJunction`` in ``_template_runtime_common.ps1``.

Does **not** copy artifacts or create releases — only repoints ``current/``.
"""

from __future__ import annotations

import os
import subprocess
from dataclasses import dataclass
from pathlib import Path

from app.modules.platform_publish_orchestrator.template_runtime_materialization import (
    RELEASE_ID_PATTERN,
    RUNTIME_SLOT_TEMPLATE,
    TemplateMaterializationError,
    assert_materialized_release_artifacts,
)
from app.modules.platform_release_provenance.runtime_artifacts import (
    get_suite_root,
    runtime_root_for_slot,
)


class TemplateActivationError(RuntimeError):
    """Raised when TEMPLATE ``current/`` junction cannot be activated."""


@dataclass(frozen=True)
class TemplateActivationResult:
    release_id: str
    release_dir: Path
    current_link: Path
    previous_release_id: str | None


def template_runtime_root(suite_root: Path) -> Path:
    return runtime_root_for_slot(suite_root, RUNTIME_SLOT_TEMPLATE)


def resolve_template_release_dir(suite_root: Path, release_id: str) -> Path:
    release_dir = template_runtime_root(suite_root) / "releases" / release_id
    if not release_dir.is_dir():
        raise TemplateActivationError(f"Release not found: {release_id} ({release_dir})")
    return release_dir.resolve()


def resolve_active_template_release_id(suite_root: Path) -> str | None:
    """Return release id currently targeted by ``runtime/template/current``."""
    current_link = template_runtime_root(suite_root) / "current"
    if not current_link.exists():
        return None
    try:
        resolved = current_link.resolve()
    except OSError:
        return None
    if not RELEASE_ID_PATTERN.match(resolved.name):
        return None
    return resolved.name


def remove_template_current_junction(current_link: Path) -> None:
    """Mirror ``Remove-TemplateCurrentJunction``."""
    if not current_link.exists():
        return
    if os.name == "nt":
        completed = subprocess.run(
            ["cmd", "/c", "rmdir", str(current_link)],
            capture_output=True,
            text=True,
            check=False,
        )
        if current_link.exists():
            stderr = (completed.stderr or "").strip()
            raise TemplateActivationError(
                "Failed to remove current junction "
                f"(is TEMPLATE runtime in use?): {current_link}"
                + (f" ({stderr})" if stderr else "")
            )
        return
    if current_link.is_symlink() or current_link.is_dir():
        current_link.unlink()


def set_template_current_junction(*, current_link: Path, release_path: Path) -> None:
    """Mirror ``Set-TemplateCurrentJunction`` / ``Set-PhysicalCurrentJunction``."""
    target = release_path.resolve()
    if not target.is_dir():
        raise TemplateActivationError(f"Release path is not a directory: {target}")
    current_link.parent.mkdir(parents=True, exist_ok=True)
    remove_template_current_junction(current_link)
    if os.name == "nt":
        completed = subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(current_link), str(target)],
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode != 0 or not current_link.exists():
            stderr = (completed.stderr or "").strip()
            raise TemplateActivationError(
                f"Failed to create junction {current_link} -> {target}"
                + (f": {stderr}" if stderr else "")
            )
        return
    current_link.symlink_to(target, target_is_directory=True)


def assert_current_points_to_release(*, current_link: Path, release_path: Path) -> None:
    if not current_link.exists():
        raise TemplateActivationError(f"Verification failed: current junction missing ({current_link})")
    try:
        resolved_current = current_link.resolve()
    except OSError as exc:
        raise TemplateActivationError(f"Cannot resolve current junction: {exc}") from exc
    if resolved_current != release_path.resolve():
        raise TemplateActivationError(
            f"Verification failed: current -> {resolved_current}, expected {release_path.resolve()}"
        )


def activate_template_release(
    *,
    release_id: str,
    suite_root: Path | None = None,
) -> TemplateActivationResult:
    """
    Switch ``runtime/template/current`` to an existing ``releases/release-NNN``.

    Switch-only activation — no artifact copy (ADR-RUN-001).
    """
    resolved_suite = (suite_root or get_suite_root()).resolve()
    release_dir = resolve_template_release_dir(resolved_suite, release_id)
    assert_materialized_release_artifacts(release_dir)

    runtime_root = template_runtime_root(resolved_suite)
    current_link = runtime_root / "current"
    previous_release_id = resolve_active_template_release_id(resolved_suite)

    assert_materialized_release_artifacts(release_dir)
    set_template_current_junction(current_link=current_link, release_path=release_dir)
    assert_current_points_to_release(current_link=current_link, release_path=release_dir)
    assert_materialized_release_artifacts(release_dir)

    return TemplateActivationResult(
        release_id=release_id,
        release_dir=release_dir,
        current_link=current_link,
        previous_release_id=previous_release_id,
    )
