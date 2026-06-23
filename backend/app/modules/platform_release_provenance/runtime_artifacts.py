"""Runtime artifact digest helpers for Digest Bridge."""

from __future__ import annotations

import hashlib
import importlib.util
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.runtime_paths import (
    get_backend_root,
    get_suite_root,
    resolve_monorepo_root,
    runtime_root_for_slot,
)


@lru_cache(maxsize=1)
def _fingerprint_module():
    repo_root = resolve_monorepo_root() or get_backend_root().parent
    script = repo_root / "scripts" / "runtime" / "backend_runtime_fingerprint.py"
    spec = importlib.util.spec_from_file_location("backend_runtime_fingerprint", script)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load fingerprint script: {script}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def compute_backend_fingerprint(backend_root: Path) -> dict[str, Any]:
    return _fingerprint_module().compute_backend_fingerprint(backend_root)


def compute_frontend_bundle_digest(frontend_dir: Path) -> str:
    assets_dir = frontend_dir / "assets"
    if not assets_dir.is_dir():
        raise FileNotFoundError(f"assets directory not found: {assets_dir}")
    bundles = sorted(assets_dir.glob("index-*.js"))
    if not bundles:
        raise FileNotFoundError(f"index-*.js bundle not found in {assets_dir}")
    return hashlib.sha256(bundles[0].read_bytes()).hexdigest()


def load_physical_manifest(manifest_path: Path) -> dict[str, Any]:
    text = manifest_path.read_text(encoding="utf-8-sig")
    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise ValueError("manifest.json must contain a JSON object")
    return payload


def resolve_release_dir(
    *,
    suite_root: Path,
    runtime_slot_key: str,
    release_id: str | None = None,
    use_current: bool = False,
) -> Path:
    runtime_root = runtime_root_for_slot(suite_root, runtime_slot_key)
    if use_current or not release_id:
        current_link = runtime_root / "current"
        if not current_link.exists():
            raise FileNotFoundError(f"current junction missing: {current_link}")
        return current_link.resolve()
    release_dir = runtime_root / "releases" / release_id
    if not release_dir.is_dir():
        raise FileNotFoundError(f"release directory missing: {release_dir}")
    return release_dir.resolve()
