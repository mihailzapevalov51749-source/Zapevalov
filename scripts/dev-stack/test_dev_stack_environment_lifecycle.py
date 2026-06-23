"""Environment lifecycle command tests (WI-RT-015A)."""

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


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def test_environment_aliases_normalize():
    dev_stack = _load_dev_stack_module()
    assert dev_stack._normalize_environment_key("dev") == "DEV"
    assert dev_stack._normalize_environment_key("TEMPLATE") == "TEMPLATE"
    assert dev_stack._normalize_environment_key("client") == "CLIENT"


def test_environment_service_names_from_manifest():
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    backend, frontend = dev_stack._environment_service_names(manifest, "TEMPLATE")
    assert backend == "template-backend"
    assert frontend == "template-frontend"


def test_iter_services_for_environment_is_scoped():
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    dev_specs = dev_stack._iter_services_for_environment(repo_root, manifest, "dev")
    assert {spec.service for spec in dev_specs} == {"dev-backend", "dev-frontend"}
    assert all(spec.environment == "DEV" for spec in dev_specs)

    template_specs = dev_stack._iter_services_for_environment(repo_root, manifest, "template")
    assert {spec.service for spec in template_specs} == {
        "template-backend",
        "template-frontend",
    }


def test_stop_environment_uses_port_fallback(monkeypatch, tmp_path: Path):
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    spec = dev_stack._iter_services_for_environment(repo_root, manifest, "dev")[0]

    port_fallback_called = {"value": False}

    def _fake_stop(*, spec, run_dir, host, allow_port_fallback):
        port_fallback_called["value"] = allow_port_fallback
        return False

    monkeypatch.setattr(dev_stack, "_iter_services_for_environment", lambda *_args, **_kwargs: [spec])
    monkeypatch.setattr(dev_stack, "_ensure_layout", lambda *_args, **_kwargs: (run_dir, tmp_path / "logs"))
    monkeypatch.setattr(dev_stack, "_stop_service_by_pid", _fake_stop)

    dev_stack.cmd_stop_environment(repo_root, manifest, "dev")
    assert port_fallback_called["value"] is True


def test_service_management_state_unmanaged_without_pid_file(monkeypatch, tmp_path: Path):
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    spec = dev_stack._iter_services_for_environment(repo_root, manifest, "dev")[0]

    monkeypatch.setattr(dev_stack, "_is_port_listening", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(dev_stack, "_is_process_alive", lambda _pid: False)
    monkeypatch.setattr(dev_stack, "_find_listening_pid_on_port", lambda _port: 4242)

    state = dev_stack._service_management_state(spec=spec, run_dir=run_dir, host="127.0.0.1")
    assert state == "UNMANAGED"
    assert dev_stack._service_status(spec=spec, run_dir=run_dir, host="127.0.0.1") == "UNMANAGED"


def test_start_environment_rejects_unmanaged_listener(monkeypatch, tmp_path: Path):
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    spec = dev_stack._iter_services_for_environment(repo_root, manifest, "dev")[0]

    monkeypatch.setattr(dev_stack, "_validate_prerequisites", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(dev_stack, "_ensure_layout", lambda *_args, **_kwargs: (run_dir, tmp_path / "logs"))
    monkeypatch.setattr(
        dev_stack,
        "_iter_services_for_environment",
        lambda *_args, **_kwargs: [spec],
    )
    monkeypatch.setattr(dev_stack, "_sort_services_for_start", lambda specs: specs)
    monkeypatch.setattr(dev_stack, "_service_management_state", lambda **_kwargs: "UNMANAGED")
    monkeypatch.setattr(dev_stack, "_find_listening_pid_on_port", lambda _port: 9999)

    try:
        dev_stack.cmd_start_environment(repo_root, manifest, "dev")
        raise AssertionError("expected DevStackError")
    except dev_stack.DevStackError as exc:
        assert "outside dev-stack" in str(exc)


def test_restart_environment_calls_stop_then_start(monkeypatch):
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    calls: list[str] = []

    monkeypatch.setattr(
        dev_stack,
        "cmd_stop_environment",
        lambda *_args, **_kwargs: calls.append("stop") or 0,
    )
    monkeypatch.setattr(
        dev_stack,
        "cmd_start_environment",
        lambda *_args, **_kwargs: calls.append("start") or 0,
    )
    monkeypatch.setattr(dev_stack, "_reset_port_cache", lambda: calls.append("reset"))

    assert dev_stack.cmd_restart_environment(repo_root, manifest, "dev") == 0
    assert calls == ["stop", "reset", "start"]


def test_template_runtime_label_points_to_current():
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    label = dev_stack._environment_runtime_label(repo_root, manifest, "TEMPLATE")
    runtime_root = dev_stack._resolve_environment_runtime_root(repo_root, manifest, "TEMPLATE")
    assert Path(label).resolve() == (runtime_root / "current").resolve()


def test_client_runtime_label_points_to_current():
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    label = dev_stack._environment_runtime_label(repo_root, manifest, "CLIENT")
    runtime_root = dev_stack._resolve_environment_runtime_root(repo_root, manifest, "CLIENT")
    assert Path(label).resolve() == (runtime_root / "current").resolve()


def test_client_services_use_external_artifact_runtime():
    dev_stack = _load_dev_stack_module()
    repo_root = _repo_root()
    manifest = dev_stack._load_manifest_text(repo_root / "scripts" / "dev-stack" / "manifest.yaml")
    client_specs = dev_stack._iter_services_for_environment(repo_root, manifest, "client")
    assert {spec.service for spec in client_specs} == {"client-backend", "client-frontend"}
    backend = next(spec for spec in client_specs if spec.role == "backend")
    frontend = next(spec for spec in client_specs if spec.role == "frontend")
    runtime_root = dev_stack._resolve_environment_runtime_root(repo_root, manifest, "CLIENT")
    assert backend.cwd.resolve() == (runtime_root / "current" / "backend").resolve()
    assert "preview" in frontend.command
    assert frontend.env.get("YASNOPRO_CLIENT_RUNTIME_FRONTEND")
