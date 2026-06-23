"""Platform code file inventory for release diff."""

from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

from app.modules.platform_release_diff.constants import (
    BACKEND_IMPLEMENTATION_SUFFIXES,
    EXCLUDED_DIR_NAMES,
    EXCLUDED_PATH_SEGMENTS,
    FRONTEND_IMPLEMENTATION_SUFFIXES,
)


def _should_skip_path(path: Path) -> bool:
    return any(part in EXCLUDED_DIR_NAMES or part in EXCLUDED_PATH_SEGMENTS for part in path.parts)


def _hash_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def iter_backend_app_files(app_root: Path) -> dict[str, str]:
    """Return rel_path (from app/) -> sha256 for production backend files."""
    if not app_root.is_dir():
        return {}
    rows: dict[str, str] = {}
    for path in sorted(app_root.rglob("*.py")):
        if path.name.startswith("test_"):
            continue
        if _should_skip_path(path):
            continue
        rel = path.relative_to(app_root).as_posix()
        rows[rel] = _hash_bytes(path.read_bytes())
    return rows


def iter_frontend_src_files(src_root: Path) -> dict[str, str]:
    """Return rel_path (from src/) -> sha256 for frontend implementation files."""
    if not src_root.is_dir():
        return {}
    rows: dict[str, str] = {}
    for path in sorted(src_root.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in FRONTEND_IMPLEMENTATION_SUFFIXES:
            continue
        if _should_skip_path(path):
            continue
        rel = path.relative_to(src_root).as_posix()
        rows[rel] = _hash_bytes(path.read_bytes())
    return rows


def iter_git_frontend_src_files(repo_root: Path, commit_sha: str) -> dict[str, str]:
    """Load frontend/src files from git commit (TEMPLATE release git baseline)."""
    commit = str(commit_sha or "").strip().lower()
    if not commit or set(commit) <= {"0"} or len(commit) < 7:
        return {}
    prefix = "frontend/src"
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), "ls-tree", "-r", "--name-only", commit, "--", prefix],
            check=True,
            capture_output=True,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {}

    rows: dict[str, str] = {}
    for line in result.stdout.splitlines():
        repo_path = line.strip().replace("\\", "/")
        if not repo_path.startswith(prefix + "/"):
            continue
        rel = repo_path[len(prefix) + 1 :]
        suffix = Path(rel).suffix.lower()
        if suffix not in FRONTEND_IMPLEMENTATION_SUFFIXES:
            continue
        if any(part in EXCLUDED_PATH_SEGMENTS for part in Path(rel).parts):
            continue
        try:
            show = subprocess.run(
                ["git", "-C", str(repo_root), "show", f"{commit}:{repo_path}"],
                check=True,
                capture_output=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
        rows[rel] = _hash_bytes(show.stdout)
    return rows


def compare_file_maps(
    dev_map: dict[str, str],
    template_map: dict[str, str],
) -> list[tuple[str, str]]:
    """Return (rel_path, change_type) for differing files."""
    changes: list[tuple[str, str]] = []
    all_paths = sorted(set(dev_map) | set(template_map))
    for rel in all_paths:
        dev_hash = dev_map.get(rel)
        template_hash = template_map.get(rel)
        if dev_hash is None:
            changes.append((rel, "deleted"))
        elif template_hash is None:
            changes.append((rel, "new"))
        elif dev_hash != template_hash:
            changes.append((rel, "modified"))
    return changes
