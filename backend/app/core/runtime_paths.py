"""Central runtime path resolution for isolated backend deployments.

Production runtime must not assume monorepo layout. Only these external inputs
are required:

- DATABASE_URL, APP_ENV / YASNOPRO_ENV (environment guard)
- YASNOPRO_SUITE_ROOT (optional; suite filesystem root — runtime/, data/, operations/)
- YASNOPRO_BACKEND_ROOT (optional; inferred from app package location)
- YASNOPRO_UPLOADS_DIR (optional; defaults to BACKEND_ROOT/uploads)
- YASNOPRO_DATA_DIR (optional; defaults to BACKEND_ROOT/data)
- DOTENV_PATH (optional; explicit dotenv file for local dev)

Suite root resolution order (WI-INFRA-ROOT-003, WI-INFRA-ROOT-004):

1. YASNOPRO_SUITE_ROOT environment variable (global system contract)
2. config/yasnopro_suite.json — suite-level ``{monorepo.parent}/config/`` first,
   then monorepo-local ``{monorepo}/config/`` (``suite_root`` key, relative or absolute)
3. Auto-discovery: monorepo parent when ``runtime/`` exists, else monorepo parent (PS parity)
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

ENV_BACKEND_ROOT = "YASNOPRO_BACKEND_ROOT"
ENV_SUITE_ROOT = "YASNOPRO_SUITE_ROOT"
ENV_UPLOADS_DIR = "YASNOPRO_UPLOADS_DIR"
ENV_DATA_DIR = "YASNOPRO_DATA_DIR"
ENV_DOTENV_PATH = "DOTENV_PATH"
SUITE_CONFIG_RELATIVE = Path("config") / "yasnopro_suite.json"


def _resolve_path_from_env(name: str) -> Path | None:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return None
    return Path(raw).expanduser().resolve()


@lru_cache(maxsize=1)
def get_backend_root() -> Path:
    configured = _resolve_path_from_env(ENV_BACKEND_ROOT)
    if configured is not None:
        return configured
    # app/core/runtime_paths.py → parents[2] == backend root (contains app/)
    return Path(__file__).resolve().parents[2]


@lru_cache(maxsize=1)
def get_app_root() -> Path:
    return get_backend_root() / "app"


@lru_cache(maxsize=1)
def get_uploads_dir() -> Path:
    configured = _resolve_path_from_env(ENV_UPLOADS_DIR)
    if configured is not None:
        return configured
    return get_backend_root() / "uploads"


@lru_cache(maxsize=1)
def get_data_dir() -> Path:
    configured = _resolve_path_from_env(ENV_DATA_DIR)
    if configured is not None:
        return configured
    return get_backend_root() / "data"


def get_yasii_store_dir(subdir: str, *, env_var: str | None = None) -> Path:
    """Resolve YASII JSON store directory (per-store env overrides DATA_DIR/subdir)."""
    if env_var:
        override = os.environ.get(env_var, "").strip()
        if override:
            return Path(override).expanduser().resolve()
    return get_data_dir() / subdir


def resolve_dotenv_path() -> Path | None:
    explicit = os.environ.get(ENV_DOTENV_PATH, "").strip()
    if explicit:
        return Path(explicit).expanduser().resolve()
    return None


def is_dev_filesystem_scan_enabled() -> bool:
    """True only for DEV contour — monorepo filesystem scans are DEV-only."""
    from app.core.environment_guard import normalize_app_env, resolve_raw_app_env

    try:
        return normalize_app_env(resolve_raw_app_env()) == "DEV"
    except Exception:
        return False


def resolve_monorepo_root() -> Path | None:
    """Detect monorepo root (backend/ + frontend/ + docs/ or scripts/).

    Works in any APP_ENV — used for suite discovery and filesystem scans.
    """
    backend_root = get_backend_root()
    candidate = backend_root.parent
    if not (candidate / "frontend").is_dir():
        return None
    if (candidate / "docs").is_dir() or (candidate / "scripts").is_dir():
        return candidate.resolve()
    return None


def try_dev_monorepo_root() -> Path | None:
    """DEV-only: detect sibling monorepo root (frontend + docs next to backend/)."""
    if not is_dev_filesystem_scan_enabled():
        return None
    return resolve_monorepo_root()


def _suite_config_search_roots(monorepo: Path | None) -> list[Path]:
    roots: list[Path] = []
    if monorepo is not None:
        roots.append(monorepo)
    backend_parent = get_backend_root().parent
    if backend_parent not in roots:
        roots.append(backend_parent)
    return roots


def _read_suite_root_from_config(config_path: Path, *, monorepo: Path | None) -> Path | None:
    if not config_path.is_file():
        return None
    try:
        payload = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    raw = str(payload.get("suite_root") or payload.get("YASNOPRO_SUITE_ROOT") or "").strip()
    if not raw:
        return None
    candidate = Path(raw).expanduser()
    if not candidate.is_absolute():
        base = monorepo if monorepo is not None else config_path.parent.parent
        candidate = (base / candidate).resolve()
    else:
        candidate = candidate.resolve()
    return candidate if candidate.is_dir() else None


def _load_suite_root_from_config(monorepo: Path | None) -> Path | None:
    if monorepo is not None:
        suite_level = monorepo.parent / SUITE_CONFIG_RELATIVE
        resolved = _read_suite_root_from_config(
            suite_level,
            monorepo=monorepo.parent,
        )
        if resolved is not None:
            return resolved
    for root in _suite_config_search_roots(monorepo):
        resolved = _read_suite_root_from_config(root / SUITE_CONFIG_RELATIVE, monorepo=monorepo)
        if resolved is not None:
            return resolved
    return None


def _discover_suite_root(monorepo: Path | None) -> Path:
    """Align with PowerShell Get-PhysicalRuntimePaths: suite = parent of monorepo."""
    if monorepo is not None:
        parent = monorepo.parent
        if (parent / "runtime").is_dir():
            return parent.resolve()
        if (monorepo / "runtime").is_dir():
            return monorepo.resolve()
        return parent.resolve()
    return get_backend_root().parent.resolve()


@lru_cache(maxsize=1)
def get_suite_root() -> Path:
    """Canonical YASNOPRO_SUITE_ROOT for runtime/, data/, operations/ layout."""
    configured = _resolve_path_from_env(ENV_SUITE_ROOT)
    if configured is not None:
        if not configured.is_dir():
            raise RuntimeError(f"{ENV_SUITE_ROOT} is not a directory: {configured}")
        return configured

    monorepo = resolve_monorepo_root()
    from_config = _load_suite_root_from_config(monorepo)
    if from_config is not None:
        return from_config

    return _discover_suite_root(monorepo)


def runtime_root_for_slot(suite_root: Path, runtime_slot_key: str) -> Path:
    """Physical runtime slot directory under suite root (template, client, company/{code})."""
    slot = str(runtime_slot_key or "").strip().replace("\\", "/")
    if slot in {"template", "client"}:
        return suite_root / "runtime" / slot
    if slot.startswith("company/"):
        return suite_root / "runtime" / Path(*slot.split("/"))
    raise ValueError(f"Unsupported runtime_slot_key: {runtime_slot_key}")


def get_dev_frontend_src_dir() -> Path | None:
    mono = try_dev_monorepo_root()
    if mono is None:
        return None
    src = mono / "frontend" / "src"
    return src if src.is_dir() else None


def get_dev_docs_architecture_dir() -> Path | None:
    mono = try_dev_monorepo_root()
    if mono is None:
        return None
    docs = mono / "docs" / "architecture"
    return docs if docs.is_dir() else None


def get_dev_docs_dirs() -> list[Path]:
    mono = try_dev_monorepo_root()
    if mono is None:
        return []
    dirs: list[Path] = []
    for relative in ("docs", "docs/architecture"):
        path = mono / relative
        if path.is_dir():
            dirs.append(path)
    return dirs


# Module-level aliases (evaluated once per process after env is set).
BACKEND_ROOT = get_backend_root()
UPLOADS_DIR = get_uploads_dir()
DATA_DIR = get_data_dir()
