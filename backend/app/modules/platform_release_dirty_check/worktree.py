"""Git working tree snapshot for Dirty DEV Check."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class WorktreeSnapshot:
    """Normalized repo-relative paths from git status."""

    repo_root: Path | None
    modified: tuple[str, ...] = field(default_factory=tuple)
    untracked: tuple[str, ...] = field(default_factory=tuple)
    deleted: tuple[str, ...] = field(default_factory=tuple)
    git_available: bool = True
    error: str | None = None

    @property
    def all_changed(self) -> tuple[str, ...]:
        return self.modified + self.untracked + self.deleted


def normalize_repo_relative_path(path: str) -> str:
    text = str(path or "").strip().replace("\\", "/")
    while text.startswith("./"):
        text = text[2:]
    return text.lstrip("/")


def is_under_code_roots(path: str, prefixes: tuple[str, ...]) -> bool:
    normalized = normalize_repo_relative_path(path)
    return any(normalized.startswith(prefix) for prefix in prefixes)


def collect_git_worktree_snapshot(
    repo_root: Path,
    *,
    code_root_prefixes: tuple[str, ...] | None = None,
) -> WorktreeSnapshot:
    """Run ``git status --porcelain=v1`` and return code-root filtered paths."""
    prefixes = code_root_prefixes or (
        "backend/app/",
        "backend/alembic/",
        "frontend/src/",
        "scripts/runtime/",
    )
    try:
        completed = subprocess.run(
            ["git", "-C", str(repo_root), "status", "--porcelain=v1", "-uall"],
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return WorktreeSnapshot(
            repo_root=repo_root,
            git_available=False,
            error=str(exc),
        )

    if completed.returncode != 0:
        return WorktreeSnapshot(
            repo_root=repo_root,
            git_available=False,
            error=(completed.stderr or completed.stdout or "git status failed").strip(),
        )

    modified: list[str] = []
    untracked: list[str] = []
    deleted: list[str] = []

    for raw_line in completed.stdout.splitlines():
        line = raw_line.rstrip("\n")
        if len(line) < 4:
            continue
        xy = line[:2]
        path_part = line[3:].strip()
        if " -> " in path_part:
            path_part = path_part.split(" -> ", 1)[1].strip()
        rel = normalize_repo_relative_path(path_part)
        if not is_under_code_roots(rel, prefixes):
            continue
        if xy == "??":
            untracked.append(rel)
        elif "D" in xy:
            deleted.append(rel)
        else:
            modified.append(rel)

    return WorktreeSnapshot(
        repo_root=repo_root,
        modified=tuple(sorted(set(modified))),
        untracked=tuple(sorted(set(untracked))),
        deleted=tuple(sorted(set(deleted))),
        git_available=True,
    )
