"""Tests for backend runtime fingerprint utility (WI-RT-014C)."""

from __future__ import annotations

import importlib.util
import json
import tempfile
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
_FINGERPRINT_PATH = _REPO_ROOT / "scripts" / "runtime" / "backend_runtime_fingerprint.py"
_spec = importlib.util.spec_from_file_location(
    "backend_runtime_fingerprint",
    _FINGERPRINT_PATH,
)
assert _spec and _spec.loader
_fp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_fp)
compute_backend_fingerprint = _fp.compute_backend_fingerprint
find_leaked_test_files = _fp.find_leaked_test_files


def _write_min_backend(root: Path) -> None:
    app = root / "app"
    (app / "core").mkdir(parents=True)
    (root / "requirements.txt").write_text("fastapi\n", encoding="utf-8")
    (app / "main.py").write_text("app = 1\n", encoding="utf-8")
    (app / "core" / "runtime_paths.py").write_text("BACKEND_ROOT = '.'\n", encoding="utf-8")
    (app / "test_main.py").write_text("def test_x():\n    assert True\n", encoding="utf-8")


def test_compute_backend_fingerprint_stable():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_min_backend(root)
        first = compute_backend_fingerprint(root)
        second = compute_backend_fingerprint(root)
        assert first["hash"] == second["hash"]
        assert first["production_file_count"] == 2


def test_find_leaked_test_files():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_min_backend(root)
        leaked = find_leaked_test_files(root)
        assert leaked == ["app/test_main.py"]


def test_fingerprint_changes_when_production_file_changes():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_min_backend(root)
        before = compute_backend_fingerprint(root)["hash"]
        (root / "app" / "extra.py").write_text("x = 1\n", encoding="utf-8")
        after = compute_backend_fingerprint(root)["hash"]
        assert before != after


def test_fingerprint_json_roundtrip():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_min_backend(root)
        payload = compute_backend_fingerprint(root)
        restored = json.loads(json.dumps(payload))
        assert restored["hash"] == payload["hash"]
