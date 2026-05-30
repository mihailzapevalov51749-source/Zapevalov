from pathlib import Path


def get_repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def get_docs_dir(repo_root: Path) -> Path:
    return repo_root / "docs" / "architecture"


def get_backend_dir(repo_root: Path) -> Path:
    return repo_root / "backend" / "app"


def get_frontend_dir(repo_root: Path) -> Path:
    return repo_root / "frontend" / "src"
