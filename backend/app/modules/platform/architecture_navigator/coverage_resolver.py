"""Full platform file coverage validation and residual primary resolution (WI-ARCH-COVERAGE-003)."""

from __future__ import annotations

from pathlib import Path

from app.modules.platform.architecture_navigator.ownership_policy import (
    can_be_primary_owner,
    pick_primary_owner,
)

_IMPLEMENTATION_SUFFIXES = frozenset({".py", ".jsx", ".js", ".ts", ".tsx", ".css"})
_EXCLUDED_DIRS = frozenset({"node_modules", "dist", "build", "__pycache__", ".venv", "coverage", "temporary", "tmp"})

# Longest-prefix residual rules when no COMPONENT_SCAN_SCOPES match exists.
_BACKEND_RESIDUAL_RULES: tuple[tuple[str, str], ...] = (
    ("modules/platform/runtime/", "config-group-platform-runtime"),
    ("modules/platform/designer/", "config-group-module-placement"),
    ("modules/platform/", "config-group-platform-runtime"),
    ("modules/control_plane/", "platform-identity"),
    ("modules/user_activity/", "config-group-module-placement"),
    ("modules/user_management/", "platform-identity"),
    ("modules/platform_build_registry/", "publication-service"),
    ("modules/platform_version_registry/", "publication-service"),
    ("modules/checklists/", "config-group-module-placement"),
    ("modules/notes/", "config-group-module-placement"),
    ("modules/quality_issues/", "config-group-module-placement"),
    ("modules/", "config-group-module-placement"),
    ("shared/", "standard-data-identifiers"),
    ("core/", "constitution-norm-environment-isolation"),
    ("db/", "constitution-norm-company-isolated-runtime"),
    ("main.py", "constitution-norm-environment-isolation"),
    ("init_db.py", "constitution-norm-environment-isolation"),
)

_FRONTEND_RESIDUAL_RULES: tuple[tuple[str, str], ...] = (
    ("modules/controlPlane/", "platform-identity"),
    ("modules/yasii/", "module-yasii"),
    ("modules/designer/", "config-group-module-placement"),
    ("modules/platformArchitectureGovernance/", "standard-dev-architecture-audit"),
    ("modules/platformArchitecture/", "standard-dev-architecture-audit"),
    ("modules/", "config-group-module-placement"),
    ("portal/", "portal-composition-engine"),
    ("api/", "standard-ui-navigation-shell"),
    ("shared/", "standard-ui-three-level-model"),
    ("profile/", "platform-drawer"),
    ("pages/", "standard-ui-navigation-shell"),
    ("config/", "config-group-platform-runtime"),
    ("layouts/", "standard-ui-navigation-shell"),
    ("styles/", "standard-ui-color-zones"),
)

# Guaranteed CODE_OWNER fallbacks (last resort).
BACKEND_FALLBACK_OWNER = "config-group-module-placement"
FRONTEND_FALLBACK_OWNER = "standard-ui-three-level-model"
_BACKEND_FALLBACK_OWNER = BACKEND_FALLBACK_OWNER
_FRONTEND_FALLBACK_OWNER = FRONTEND_FALLBACK_OWNER


def iter_platform_implementation_files(app_root: Path, frontend_src: Path | None) -> list[tuple[str, str]]:
    """Yield (side, rel_path) for backend app and frontend src implementation files."""
    rows: list[tuple[str, str]] = []
    if app_root.is_dir():
        for path in sorted(app_root.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in _IMPLEMENTATION_SUFFIXES:
                continue
            if any(part in _EXCLUDED_DIRS for part in path.parts):
                continue
            rows.append(("backend", path.relative_to(app_root).as_posix()))
    if frontend_src is not None and frontend_src.is_dir():
        for path in sorted(frontend_src.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in _IMPLEMENTATION_SUFFIXES:
                continue
            if any(part in _EXCLUDED_DIRS for part in path.parts):
                continue
            rows.append(("frontend", path.relative_to(frontend_src).as_posix()))
    return rows


def resolve_residual_primary_owner(rel_path: str, side: str) -> str:
    """Assign Primary Owner for files not matched by any scan scope prefix."""
    rules = _BACKEND_RESIDUAL_RULES if side == "backend" else _FRONTEND_RESIDUAL_RULES
    best_len = -1
    best_owner: str | None = None
    for prefix, owner in rules:
        if rel_path == prefix.rstrip("/") or rel_path.startswith(prefix):
            if len(prefix) > best_len and can_be_primary_owner(owner):
                best_len = len(prefix)
                best_owner = owner
    if best_owner:
        return best_owner
    return _BACKEND_FALLBACK_OWNER if side == "backend" else _FRONTEND_FALLBACK_OWNER


def explain_residual_primary_owner(rel_path: str, side: str) -> tuple[str, str | None, bool]:
    """Return (owner, matched_rule_prefix, used_fallback)."""
    rules = _BACKEND_RESIDUAL_RULES if side == "backend" else _FRONTEND_RESIDUAL_RULES
    best_len = -1
    best_owner: str | None = None
    best_prefix: str | None = None
    for prefix, owner in rules:
        if rel_path == prefix.rstrip("/") or rel_path.startswith(prefix):
            if len(prefix) > best_len and can_be_primary_owner(owner):
                best_len = len(prefix)
                best_owner = owner
                best_prefix = prefix
    if best_owner:
        return best_owner, best_prefix, False
    fallback = _BACKEND_FALLBACK_OWNER if side == "backend" else _FRONTEND_FALLBACK_OWNER
    return fallback, None, True


def resolve_file_primary_owner(
    rel_path: str,
    side: str,
    scope_candidates: list[str],
) -> str:
    """Primary owner from scope matches or residual rules."""
    primary = pick_primary_owner(scope_candidates, rel_path=rel_path, side=side)
    if primary is not None:
        return primary
    if scope_candidates:
        # Scope matched but only aggregators/conceptual — use residual override.
        return resolve_residual_primary_owner(rel_path, side)
    return resolve_residual_primary_owner(rel_path, side)
