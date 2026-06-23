from pathlib import Path

from app.core.runtime_paths import (
    get_app_root,
    get_data_dir,
    get_dev_docs_architecture_dir,
    get_dev_frontend_src_dir,
    get_backend_root,
    resolve_monorepo_root,
    try_dev_monorepo_root,
)


def get_repo_root() -> Path:
    """Backward-compatible alias: DEV monorepo root or backend parent (never required at runtime)."""
    mono = resolve_monorepo_root()
    if mono is not None:
        return mono
    return get_backend_root().parent


def get_docs_dir(repo_root: Path | None = None) -> Path:
    dev_docs = get_dev_docs_architecture_dir()
    if dev_docs is not None:
        return dev_docs
    if repo_root is not None:
        return repo_root / "docs" / "architecture"
    return get_data_dir() / "_runtime_missing" / "docs" / "architecture"


def get_backend_dir(repo_root: Path | None = None) -> Path:
    _ = repo_root
    return get_app_root()


def get_frontend_dir(repo_root: Path | None = None) -> Path:
    _ = repo_root
    dev_frontend = get_dev_frontend_src_dir()
    if dev_frontend is not None:
        return dev_frontend
    return get_data_dir() / "_runtime_missing" / "frontend" / "src"
