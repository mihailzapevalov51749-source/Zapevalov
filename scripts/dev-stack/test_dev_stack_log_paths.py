"""Dev stack log path routing tests (WI-RT-014D)."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def _load_dev_stack_module():
    module_path = Path(__file__).resolve().parent / "dev_stack.py"
    spec = importlib.util.spec_from_file_location("dev_stack", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_template_backend_log_goes_to_runtime_mounts(tmp_path: Path):
    dev_stack = _load_dev_stack_module()
    repo_root = Path(__file__).resolve().parents[2]
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    spec = dev_stack.ServiceSpec(
        environment="TEMPLATE",
        role="backend",
        service="template-backend",
        port=8011,
        log_file="template-backend.log",
        command=[],
        cwd=tmp_path,
        env={},
    )
    logs_dir = repo_root / "logs"
    log_path = dev_stack._resolve_service_log_path(repo_root, manifest, spec, logs_dir)
    runtime_root = (repo_root / manifest["paths"]["template_runtime_root"]).resolve()
    expected = runtime_root / "mounts" / "logs" / "template-backend.log"
    assert log_path.resolve() == expected.resolve()


def test_client_backend_log_goes_to_runtime_mounts(tmp_path: Path):
    dev_stack = _load_dev_stack_module()
    repo_root = Path(__file__).resolve().parents[2]
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    spec = dev_stack.ServiceSpec(
        environment="CLIENT",
        role="backend",
        service="client-backend",
        port=8012,
        log_file="client-backend.log",
        command=[],
        cwd=tmp_path,
        env={},
    )
    logs_dir = repo_root / "logs"
    log_path = dev_stack._resolve_service_log_path(repo_root, manifest, spec, logs_dir)
    runtime_root = (repo_root / manifest["paths"]["client_runtime_root"]).resolve()
    expected = runtime_root / "mounts" / "logs" / "client-backend.log"
    assert log_path.resolve() == expected.resolve()


def test_dev_backend_log_stays_in_monorepo_logs(tmp_path: Path):
    dev_stack = _load_dev_stack_module()
    repo_root = Path(__file__).resolve().parents[2]
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    spec = dev_stack.ServiceSpec(
        environment="DEV",
        role="backend",
        service="dev-backend",
        port=8010,
        log_file="dev-backend.log",
        command=[],
        cwd=tmp_path,
        env={},
    )
    logs_dir = repo_root / "logs"
    log_path = dev_stack._resolve_service_log_path(repo_root, manifest, spec, logs_dir)
    assert log_path == logs_dir / "dev-backend.log"
