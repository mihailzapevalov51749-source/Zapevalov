#!/usr/bin/env python3
"""Local dev stack manager: start / stop / status for DEV, TEMPLATE, CLIENT."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


MANIFEST_NAME = "manifest.yaml"
ENVIRONMENT_ALIASES = {
    "dev": "DEV",
    "template": "TEMPLATE",
    "client": "CLIENT",
}
ENVIRONMENT_RUNTIME_ROOT_KEYS = {
    "TEMPLATE": "template_runtime_root",
    "CLIENT": "client_runtime_root",
}
EXTERNAL_RUNTIME_PROMOTE_SCRIPTS = {
    "TEMPLATE": {
        "backend": "promote_template_backend.ps1",
        "frontend": "promote_template_frontend.ps1",
    },
    "CLIENT": {
        "backend": "promote_client_backend.ps1",
        "frontend": "promote_client_frontend.ps1",
    },
}
RUNTIME_FRONTEND_ENV_VARS = {
    "TEMPLATE": "YASNOPRO_TEMPLATE_RUNTIME_FRONTEND",
    "CLIENT": "YASNOPRO_CLIENT_RUNTIME_FRONTEND",
}
ENVIRONMENT_DISPLAY = {
    "DEV": "DEV",
    "TEMPLATE": "TEMPLATE",
    "CLIENT": "CLIENT",
}
PORT_CONNECT_TIMEOUT_SECONDS = 0.25
PORT_CHECK_BUDGET_SECONDS = 0.5
NETSTAT_TIMEOUT_SECONDS = 3.0

_listening_ports_cache: set[int] | None = None


class DevStackError(RuntimeError):
    """User-facing dev stack error."""


@dataclass(frozen=True)
class ServiceSpec:
    environment: str
    role: str
    service: str
    port: int
    log_file: str
    command: list[str]
    cwd: Path
    env: dict[str, str]


def _load_manifest_text(path: Path) -> dict[str, Any]:
    """Load the project manifest YAML without external dependencies."""
    if not path.is_file():
        raise DevStackError(f"Manifest not found: {path}")

    root: dict[str, Any] = {}
    stack: list[tuple[int, dict[str, Any]]] = [(0, root)]

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.split("#", 1)[0].rstrip()
        if not line.strip():
            continue

        indent = len(line) - len(line.lstrip(" "))
        if indent % 2 != 0:
            raise DevStackError(f"Invalid manifest indentation at line: {raw_line!r}")

        level = indent // 2
        content = line.strip()
        if ":" not in content:
            raise DevStackError(f"Invalid manifest line: {raw_line!r}")

        while len(stack) > level + 1:
            stack.pop()
        if not stack:
            raise DevStackError(f"Invalid manifest structure at line: {raw_line!r}")

        key, value = content.split(":", 1)
        key = key.strip()
        value = value.strip()

        parent = stack[-1][1]
        if not value:
            child: dict[str, Any] = {}
            parent[key] = child
            stack.append((level, child))
            continue

        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            if not inner:
                parent[key] = []
                continue
            items: list[Any] = []
            for item in inner.split(","):
                token = item.strip()
                if not token:
                    continue
                if (token.startswith('"') and token.endswith('"')) or (
                    token.startswith("'") and token.endswith("'")
                ):
                    items.append(token[1:-1])
                elif token.isdigit():
                    items.append(int(token))
                else:
                    items.append(token)
            parent[key] = items
            continue

        if value.startswith('"') and value.endswith('"'):
            parent[key] = value[1:-1]
            continue
        if value.startswith("'") and value.endswith("'"):
            parent[key] = value[1:-1]
            continue

        if value.isdigit():
            parent[key] = int(value)
            continue

        parent[key] = value

    return root


def _repo_root_from_script() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_suite_root(repo_root: Path, manifest: dict[str, Any]) -> Path:
    """Resolve YASNOPRO_SUITE_ROOT using the same precedence as runtime_paths."""
    configured = os.environ.get("YASNOPRO_SUITE_ROOT", "").strip()
    if configured:
        path = Path(configured).expanduser().resolve()
        if not path.is_dir():
            raise DevStackError(f"YASNOPRO_SUITE_ROOT is not a directory: {path}")
        return path

    for config_base, relative_base in (
        (repo_root.parent, repo_root.parent),
        (repo_root, repo_root),
    ):
        config_path = config_base / "config" / "yasnopro_suite.json"
        if not config_path.is_file():
            continue
        try:
            payload = json.loads(config_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise DevStackError(f"Invalid {config_path}: {exc}") from exc
        if isinstance(payload, dict):
            raw = str(payload.get("suite_root") or payload.get("YASNOPRO_SUITE_ROOT") or "").strip()
            if raw:
                candidate = Path(raw).expanduser()
                if not candidate.is_absolute():
                    candidate = (relative_base / candidate).resolve()
                else:
                    candidate = candidate.resolve()
                if candidate.is_dir():
                    return candidate
                raise DevStackError(f"suite_root from config is not a directory: {candidate}")

    suite_relative = str(manifest.get("paths", {}).get("suite_root", "..")).strip() or ".."
    return (repo_root / suite_relative).resolve()


def _load_dotenv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        return env
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def _database_url(manifest: dict[str, Any], database_name: str) -> str:
    postgres = manifest["postgres"]
    user = postgres["user"]
    password = postgres["password"]
    host = postgres["host"]
    port = postgres["port"]
    return f"postgresql://{user}:{password}@{host}:{port}/{database_name}"


def _resolve_python_executable(repo_root: Path, manifest: dict[str, Any]) -> Path:
    venv_relative = manifest["paths"]["backend_venv"]
    if sys.platform == "win32":
        candidate = repo_root / venv_relative / "Scripts" / "python.exe"
    else:
        candidate = repo_root / venv_relative / "bin" / "python"
    return candidate


def _resolve_node_executable(manifest: dict[str, Any]) -> str:
    configured = str(manifest["frontend_launch"].get("node_executable", "node")).strip() or "node"
    if sys.platform == "win32":
        return _resolve_windows_console_executable(
            configured,
            kind="node.exe",
            search_names=("node.exe", "node"),
        )
    resolved = shutil.which(configured)
    return resolved or configured


def _resolve_windows_console_executable(
    configured: str,
    *,
    kind: str,
    search_names: tuple[str, ...],
) -> str:
    candidates: list[str] = []
    if configured.lower().endswith(".exe"):
        candidates.append(configured)
    candidates.extend(search_names)
    seen: set[str] = set()
    for name in candidates:
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        resolved = shutil.which(name)
        if not resolved:
            continue
        path = Path(resolved)
        suffix = path.suffix.lower()
        if suffix in {".cmd", ".bat", ".ps1"}:
            sibling_exe = path.with_suffix(".exe")
            if sibling_exe.is_file():
                return str(sibling_exe)
            continue
        return str(path)
    raise DevStackError(
        f"{kind} not found in PATH. Install Node.js and ensure node.exe is available."
    )


def _is_external_artifact_runtime(runtime_value: str) -> bool:
    return str(runtime_value or "dev").strip().lower() in {"artifact", "external_artifact"}


def _resolve_environment_runtime_root(
    repo_root: Path,
    manifest: dict[str, Any],
    environment: str,
) -> Path:
    root_key = ENVIRONMENT_RUNTIME_ROOT_KEYS.get(environment)
    if root_key is None:
        raise DevStackError(
            f"Environment {environment!r} does not define an external runtime root."
        )
    paths = manifest["paths"]
    default_relative = f"../runtime/{environment.lower()}"
    runtime_relative = str(paths.get(root_key, default_relative)).strip() or default_relative
    return (repo_root / runtime_relative).resolve()


def _resolve_environment_runtime_frontend_dir(
    repo_root: Path,
    manifest: dict[str, Any],
    environment: str,
    frontend: dict[str, Any],
) -> Path:
    runtime_root = _resolve_environment_runtime_root(repo_root, manifest, environment)
    slot_relative = str(
        frontend.get("runtime_frontend_slot", "current/frontend")
    ).strip() or "current/frontend"
    return (runtime_root / slot_relative).resolve()


def _resolve_environment_runtime_mounts_dir(
    repo_root: Path,
    manifest: dict[str, Any],
    environment: str,
) -> Path:
    runtime_root = _resolve_environment_runtime_root(repo_root, manifest, environment)
    paths = manifest["paths"]
    mounts_relative = str(
        paths.get("runtime_mounts", paths.get("template_runtime_mounts", "mounts"))
    ).strip() or "mounts"
    return (runtime_root / mounts_relative).resolve()


def _resolve_service_log_path(
    repo_root: Path,
    manifest: dict[str, Any],
    spec: ServiceSpec,
    logs_dir: Path,
) -> Path:
    """External-artifact backend logs go to runtime mounts/logs; DEV frontend logs unchanged."""
    if spec.role != "backend":
        return logs_dir / spec.log_file
    env_config = manifest["environments"].get(spec.environment, {})
    backend = env_config.get("backend", {})
    if not _is_external_artifact_runtime(str(backend.get("runtime", "dev"))):
        return logs_dir / spec.log_file
    logs_mount = (
        _resolve_environment_runtime_mounts_dir(repo_root, manifest, spec.environment) / "logs"
    )
    logs_mount.mkdir(parents=True, exist_ok=True)
    return logs_mount / spec.log_file


def _resolve_environment_runtime_backend_dir(
    repo_root: Path,
    manifest: dict[str, Any],
    environment: str,
    backend: dict[str, Any],
) -> Path:
    runtime_root = _resolve_environment_runtime_root(repo_root, manifest, environment)
    slot_relative = str(
        backend.get("runtime_backend_slot", "current/backend")
    ).strip() or "current/backend"
    return (runtime_root / slot_relative).resolve()


def _promote_script_for_environment(environment: str, role: str) -> str:
    scripts = EXTERNAL_RUNTIME_PROMOTE_SCRIPTS.get(environment, {})
    script = scripts.get(role)
    if not script:
        raise DevStackError(f"No promote script configured for {environment} {role}.")
    return f".\\scripts\\runtime\\{script}"


def _assert_external_backend_runtime_ready(
    repo_root: Path,
    manifest: dict[str, Any],
    environment: str,
    backend: dict[str, Any],
) -> Path:
    runtime_root = _resolve_environment_runtime_root(repo_root, manifest, environment)
    backend_artifact_dir = _resolve_environment_runtime_backend_dir(
        repo_root,
        manifest,
        environment,
        backend,
    )
    current_link = runtime_root / "current"
    manifest_file = current_link / "manifest.json"
    main_file = backend_artifact_dir / "app" / "main.py"
    requirements_file = backend_artifact_dir / "requirements.txt"

    missing: list[str] = []
    if not current_link.is_dir():
        missing.append(f"current junction: {current_link}")
    if not manifest_file.is_file():
        missing.append(f"manifest: {manifest_file}")
    if not main_file.is_file():
        missing.append(f"backend entrypoint: {main_file}")
    if not requirements_file.is_file():
        missing.append(f"backend requirements: {requirements_file}")

    manifest_data: dict[str, Any] = {}
    if manifest_file.is_file():
        try:
            manifest_data = json.loads(manifest_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            missing.append(f"manifest parse error: {manifest_file}")
    backend_fp = manifest_data.get("backend_fingerprint")
    if not isinstance(backend_fp, dict) or not str(backend_fp.get("hash", "")).strip():
        missing.append("manifest backend_fingerprint")

    if missing:
        promote_script = _promote_script_for_environment(environment, "backend")
        raise DevStackError(
            f"{environment} backend physical runtime is not ready.\n"
            + "\n".join(f"  - {item}" for item in missing)
            + "\nPromote from repo root:\n"
            f"  {promote_script}"
        )

    return backend_artifact_dir


def _assert_external_runtime_ready(
    repo_root: Path,
    manifest: dict[str, Any],
    environment: str,
    frontend: dict[str, Any],
) -> Path:
    runtime_root = _resolve_environment_runtime_root(repo_root, manifest, environment)
    frontend_artifact_dir = _resolve_environment_runtime_frontend_dir(
        repo_root,
        manifest,
        environment,
        frontend,
    )
    current_link = runtime_root / "current"
    manifest_file = current_link / "manifest.json"
    index_file = frontend_artifact_dir / "index.html"

    missing: list[str] = []
    if not current_link.is_dir():
        missing.append(f"current junction: {current_link}")
    if not manifest_file.is_file():
        missing.append(f"manifest: {manifest_file}")
    if not index_file.is_file():
        missing.append(f"frontend index: {index_file}")

    if missing:
        frontend_script = _promote_script_for_environment(environment, "frontend")
        backend_script = _promote_script_for_environment(environment, "backend")
        raise DevStackError(
            f"{environment} physical runtime is not ready.\n"
            + "\n".join(f"  - {item}" for item in missing)
            + "\nPromote once from repo root:\n"
            f"  {frontend_script}\n"
            f"  {backend_script}"
        )

    return frontend_artifact_dir


def _resolve_template_runtime_root(
    repo_root: Path,
    manifest: dict[str, Any],
) -> Path:
    return _resolve_environment_runtime_root(repo_root, manifest, "TEMPLATE")


def _resolve_template_runtime_frontend_dir(
    repo_root: Path,
    manifest: dict[str, Any],
    frontend: dict[str, Any],
) -> Path:
    return _resolve_environment_runtime_frontend_dir(
        repo_root, manifest, "TEMPLATE", frontend
    )


def _resolve_template_runtime_mounts_dir(
    repo_root: Path,
    manifest: dict[str, Any],
) -> Path:
    return _resolve_environment_runtime_mounts_dir(repo_root, manifest, "TEMPLATE")


def _resolve_template_runtime_backend_dir(
    repo_root: Path,
    manifest: dict[str, Any],
    backend: dict[str, Any],
) -> Path:
    return _resolve_environment_runtime_backend_dir(
        repo_root, manifest, "TEMPLATE", backend
    )


def _assert_template_backend_runtime_ready(
    repo_root: Path,
    manifest: dict[str, Any],
    backend: dict[str, Any],
) -> Path:
    return _assert_external_backend_runtime_ready(
        repo_root, manifest, "TEMPLATE", backend
    )


def _assert_template_runtime_ready(
    repo_root: Path,
    manifest: dict[str, Any],
    frontend: dict[str, Any],
) -> Path:
    return _assert_external_runtime_ready(repo_root, manifest, "TEMPLATE", frontend)


def _build_frontend_command(
    repo_root: Path,
    manifest: dict[str, Any],
    frontend: dict[str, Any],
    *,
    environment: str,
) -> list[str]:
    paths = manifest["paths"]
    frontend_dir = repo_root / paths["frontend_dir"]
    vite_relative = str(manifest["frontend_launch"]["vite_script"])
    vite_script = frontend_dir / vite_relative
    if not vite_script.is_file():
        raise DevStackError(
            f"Frontend vite entrypoint not found: {vite_script.relative_to(repo_root)}"
        )
    host = str(manifest["backend_launch"]["host"])
    runtime = str(frontend.get("runtime", "dev")).strip().lower() or "dev"
    node_executable = _resolve_node_executable(manifest)

    if _is_external_artifact_runtime(runtime):
        _assert_external_runtime_ready(repo_root, manifest, environment, frontend)
        return [
            node_executable,
            str(vite_script),
            "preview",
            "--mode",
            str(frontend["vite_mode"]),
            "--host",
            host,
        ]

    return [
        node_executable,
        str(vite_script),
        "--mode",
        str(frontend["vite_mode"]),
        "--host",
        host,
    ]


def _iter_services(repo_root: Path, manifest: dict[str, Any]) -> list[ServiceSpec]:
    paths = manifest["paths"]
    backend_dir = repo_root / paths["backend_dir"]
    frontend_dir = repo_root / paths["frontend_dir"]
    backend_launch = manifest["backend_launch"]
    python_executable = _resolve_python_executable(repo_root, manifest)
    base_env = dict(os.environ)
    base_env.update(_load_dotenv(repo_root / ".env"))
    suite_root = _resolve_suite_root(repo_root, manifest)
    base_env["YASNOPRO_SUITE_ROOT"] = str(suite_root)

    services: list[ServiceSpec] = []
    for environment in manifest["environment_order"]:
        env_config = manifest["environments"][environment]

        backend = env_config["backend"]
        backend_env = dict(base_env)
        backend_env["APP_ENV"] = str(backend["app_env"])
        backend_env["YASNOPRO_ENV"] = str(backend["app_env"])
        backend_env["DATABASE_URL"] = _database_url(manifest, str(backend["database"]))
        backend_cwd = backend_dir
        backend_runtime = str(backend.get("runtime", "dev")).strip().lower() or "dev"
        if _is_external_artifact_runtime(backend_runtime):
            backend_cwd = _assert_external_backend_runtime_ready(
                repo_root,
                manifest,
                str(environment),
                backend,
            )
            mounts_dir = _resolve_environment_runtime_mounts_dir(
                repo_root, manifest, str(environment)
            )
            uploads_mount = mounts_dir / "uploads"
            data_mount = mounts_dir / "data"
            uploads_mount.mkdir(parents=True, exist_ok=True)
            data_mount.mkdir(parents=True, exist_ok=True)
            backend_env["YASNOPRO_BACKEND_ROOT"] = str(backend_cwd)
            backend_env["YASNOPRO_UPLOADS_DIR"] = str(uploads_mount)
            backend_env["YASNOPRO_DATA_DIR"] = str(data_mount)
        backend_cmd = [
            str(python_executable),
            *backend_launch["uvicorn_args"],
            str(backend_launch["module"]),
            "--host",
            str(backend_launch["host"]),
            "--port",
            str(backend["port"]),
        ]
        services.append(
            ServiceSpec(
                environment=str(environment),
                role="backend",
                service=str(backend["service"]),
                port=int(backend["port"]),
                log_file=str(backend["log_file"]),
                command=backend_cmd,
                cwd=backend_cwd,
                env=backend_env,
            )
        )

        frontend = env_config["frontend"]
        frontend_env = dict(base_env)
        frontend_runtime = str(frontend.get("runtime", "dev")).strip().lower() or "dev"
        if _is_external_artifact_runtime(frontend_runtime):
            artifact_frontend_dir = _assert_external_runtime_ready(
                repo_root,
                manifest,
                str(environment),
                frontend,
            )
            env_var = RUNTIME_FRONTEND_ENV_VARS.get(str(environment))
            if env_var:
                frontend_env[env_var] = str(artifact_frontend_dir)
        frontend_cmd = _build_frontend_command(
            repo_root,
            manifest,
            frontend,
            environment=str(environment),
        )
        services.append(
            ServiceSpec(
                environment=str(environment),
                role="frontend",
                service=str(frontend["service"]),
                port=int(frontend["port"]),
                log_file=str(frontend["log_file"]),
                command=frontend_cmd,
                cwd=frontend_dir,
                env=frontend_env,
            )
        )

    return services


def _normalize_environment_key(raw: str) -> str:
    token = str(raw or "").strip().casefold()
    if not token:
        raise DevStackError("Environment name is required (dev, template, client).")
    canonical = ENVIRONMENT_ALIASES.get(token)
    if canonical is None:
        allowed = ", ".join(sorted(ENVIRONMENT_ALIASES))
        raise DevStackError(f"Unknown environment {raw!r}. Expected one of: {allowed}.")
    return canonical


def _environment_config(manifest: dict[str, Any], environment: str) -> dict[str, Any]:
    environments = manifest.get("environments", {})
    if environment not in environments:
        raise DevStackError(f"Environment {environment!r} is not defined in manifest.")
    return environments[environment]


def _environment_service_names(manifest: dict[str, Any], environment: str) -> tuple[str, str]:
    env_config = _environment_config(manifest, environment)
    backend_name = str(env_config["backend"]["service"])
    frontend_name = str(env_config["frontend"]["service"])
    return backend_name, frontend_name


def _canonical_environment(manifest: dict[str, Any], environment: str) -> str:
    token = str(environment or "").strip()
    environments = manifest.get("environments", {})
    if token in environments:
        return token
    return _normalize_environment_key(token)


def _iter_services_for_environment(
    repo_root: Path,
    manifest: dict[str, Any],
    environment: str,
) -> list[ServiceSpec]:
    canonical = _canonical_environment(manifest, environment)
    return [spec for spec in _iter_services(repo_root, manifest) if spec.environment == canonical]


def _sort_services_for_start(specs: list[ServiceSpec]) -> list[ServiceSpec]:
    role_order = {"backend": 0, "frontend": 1}
    return sorted(specs, key=lambda spec: (role_order.get(spec.role, 9), spec.service))


def _environment_runtime_label(repo_root: Path, manifest: dict[str, Any], environment: str) -> str:
    if environment in ENVIRONMENT_RUNTIME_ROOT_KEYS:
        return str(
            _resolve_environment_runtime_root(repo_root, manifest, environment) / "current"
        )
    paths = manifest["paths"]
    return str(repo_root / paths["backend_dir"])


def _http_status_code(url: str, *, timeout_seconds: float = 2.5) -> int | None:
    import urllib.error
    import urllib.request

    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            return int(response.status)
    except urllib.error.HTTPError as exc:
        return int(exc.code)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return None


def _service_runtime_details(
    *,
    spec: ServiceSpec,
    run_dir: Path,
    host: str,
) -> dict[str, Any]:
    pid_path = _pid_path(run_dir, spec.service)
    record = _read_pid_record(pid_path)
    status = _service_status(spec=spec, run_dir=run_dir, host=host)
    pid = int(record.get("pid", 0)) if record else 0
    running = status in {"RUNNING", "UNMANAGED"}
    return {
        "service": spec.service,
        "role": spec.role,
        "port": spec.port,
        "status": status,
        "running": running,
        "pid": pid if running and pid > 0 else None,
        "cwd": str(spec.cwd),
    }


def _start_service_spec(
    *,
    repo_root: Path,
    manifest: dict[str, Any],
    spec: ServiceSpec,
    run_dir: Path,
    logs_dir: Path,
    host: str,
) -> subprocess.Popen[Any]:
    log_path = _resolve_service_log_path(repo_root, manifest, spec, logs_dir)
    process = _detached_popen(
        command=spec.command,
        cwd=spec.cwd,
        env=spec.env,
        log_path=log_path,
        service=spec.service,
    )
    if not _wait_for_port(host, spec.port):
        raise DevStackError(
            f"Failed to start {spec.service}: port {spec.port} is not listening. "
            f"See log: {log_path}"
        )
    record = {
        "pid": process.pid,
        "service": spec.service,
        "port": spec.port,
        "environment": spec.environment,
        "role": spec.role,
    }
    _write_pid_record(_pid_path(run_dir, spec.service), record)
    print(f"Started {spec.service} (pid={process.pid}, port={spec.port}, log={log_path})")
    return process


def _stop_service_by_pid(
    *,
    spec: ServiceSpec,
    run_dir: Path,
    host: str,
    allow_port_fallback: bool,
) -> bool:
    pid_file = _pid_path(run_dir, spec.service)
    record = _read_pid_record(pid_file)
    pid = int(record.get("pid", 0)) if record else 0
    service = str(record.get("service", spec.service)) if record else spec.service
    stopped = False
    state = _service_management_state(spec=spec, run_dir=run_dir, host=host)

    if pid and _is_process_alive(pid):
        _terminate_process_tree(pid)
        print(f"Stopped {service} (pid={pid})")
        stopped = True
    elif record is not None and pid:
        print(f"Removed stale pid for {service} (pid={pid})")
        stopped = True

    if allow_port_fallback and _is_port_listening(host, spec.port):
        listener_pid = _find_listening_pid_on_port(spec.port)
        if listener_pid and listener_pid != pid:
            _terminate_process_tree(listener_pid)
            if state == "UNMANAGED":
                print(
                    f"Stopped {service} listener outside dev-stack "
                    f"(pid={listener_pid}, port={spec.port})"
                )
            else:
                print(f"Stopped {service} listener (pid={listener_pid}, port={spec.port})")
            stopped = True

    pid_file.unlink(missing_ok=True)
    return stopped


def cmd_start_environment(repo_root: Path, manifest: dict[str, Any], environment: str) -> int:
    canonical = _normalize_environment_key(environment)
    _validate_prerequisites(repo_root, manifest)
    run_dir, logs_dir = _ensure_layout(repo_root, manifest)
    host = str(manifest["backend_launch"]["host"])
    specs = _sort_services_for_start(_iter_services_for_environment(repo_root, manifest, canonical))

    to_start: list[ServiceSpec] = []
    for spec in specs:
        state = _service_management_state(spec=spec, run_dir=run_dir, host=host)
        if state == "MANAGED":
            record = _read_pid_record(_pid_path(run_dir, spec.service)) or {}
            pid = int(record.get("pid", 0))
            print(f"Already running: {spec.service} (pid={pid}, port={spec.port})")
            continue
        if state == "UNMANAGED":
            raise DevStackError(_format_unmanaged_service_error(spec, canonical))
        if state == "STALE":
            _pid_path(run_dir, spec.service).unlink(missing_ok=True)
        if _is_port_listening(host, spec.port):
            raise DevStackError(
                f"Cannot start {spec.service}: port {spec.port} is already in use. "
                f"Stop the conflicting process or run `dev_stack.py stop {environment}`."
            )
        to_start.append(spec)

    if not to_start:
        print(f"Environment {canonical} is already running.")
        return 0

    started_processes: list[tuple[ServiceSpec, subprocess.Popen[Any]]] = []
    try:
        for spec in to_start:
            process = _start_service_spec(
                repo_root=repo_root,
                manifest=manifest,
                spec=spec,
                run_dir=run_dir,
                logs_dir=logs_dir,
                host=host,
            )
            started_processes.append((spec, process))
    except DevStackError:
        for spec, process in reversed(started_processes):
            if _is_process_alive(process.pid):
                _terminate_process_tree(process.pid)
            _pid_path(run_dir, spec.service).unlink(missing_ok=True)
        raise

    print(f"Environment {canonical} started: {len(started_processes)} process(es).")
    return 0


def cmd_stop_environment(repo_root: Path, manifest: dict[str, Any], environment: str) -> int:
    canonical = _normalize_environment_key(environment)
    run_dir, _ = _ensure_layout(repo_root, manifest)
    host = str(manifest["backend_launch"]["host"])
    specs = _iter_services_for_environment(repo_root, manifest, canonical)

    if not specs:
        raise DevStackError(f"No services configured for environment {canonical}.")

    stopped_any = False
    for spec in specs:
        if _stop_service_by_pid(
            spec=spec,
            run_dir=run_dir,
            host=host,
            allow_port_fallback=True,
        ):
            stopped_any = True

    if not stopped_any:
        print(f"Environment {canonical} is already stopped.")
    return 0


def cmd_restart_environment(repo_root: Path, manifest: dict[str, Any], environment: str) -> int:
    stop_code = cmd_stop_environment(repo_root, manifest, environment)
    if stop_code != 0:
        return stop_code
    _reset_port_cache()
    return cmd_start_environment(repo_root, manifest, environment)


def cmd_status_environment(repo_root: Path, manifest: dict[str, Any], environment: str) -> int:
    canonical = _normalize_environment_key(environment)
    run_dir, _ = _ensure_layout(repo_root, manifest)
    host = str(manifest["backend_launch"]["host"])
    specs = _iter_services_for_environment(repo_root, manifest, canonical)
    if not specs:
        raise DevStackError(f"No services configured for environment {canonical}.")

    backend = next((item for item in specs if item.role == "backend"), None)
    frontend = next((item for item in specs if item.role == "frontend"), None)
    if backend is None or frontend is None:
        raise DevStackError(f"Environment {canonical} must define backend and frontend services.")

    backend_info = _service_runtime_details(spec=backend, run_dir=run_dir, host=host)
    frontend_info = _service_runtime_details(spec=frontend, run_dir=run_dir, host=host)
    backend_state = _service_management_state(spec=backend, run_dir=run_dir, host=host)
    frontend_state = _service_management_state(spec=frontend, run_dir=run_dir, host=host)
    env_config = _environment_config(manifest, canonical)
    database_name = str(env_config["backend"]["database"])
    runtime_label = _environment_runtime_label(repo_root, manifest, canonical)

    backend_docs_status: str | int = "n/a"
    if backend_info["running"]:
        docs_code = _http_status_code(f"http://{host}:{backend.port}/docs")
        backend_docs_status = docs_code if docs_code is not None else "unreachable"

    frontend_status: str | int = "n/a"
    if frontend_info["running"]:
        front_code = _http_status_code(f"http://{host}:{frontend.port}/")
        frontend_status = front_code if front_code is not None else "unreachable"

    display = ENVIRONMENT_DISPLAY.get(canonical, canonical)
    print(f"Environment: {display}")
    print("")
    print("Backend:")
    print(f"  Running: {'Yes' if backend_info['running'] else 'No'}")
    if backend_state == "UNMANAGED":
        listener_pid = _find_listening_pid_on_port(backend.port)
        print("  Managed by dev-stack: No (running outside dev-stack)")
        if listener_pid:
            print(f"  Listener PID: {listener_pid}")
    else:
        print(f"  Managed by dev-stack: {'Yes' if backend_state == 'MANAGED' else 'No'}")
    print(f"  Port: {backend.port}")
    print(f"  PID: {backend_info['pid'] or '-'}")
    print(f"  Cwd: {backend_info['cwd']}")
    print("")
    print("Frontend:")
    print(f"  Running: {'Yes' if frontend_info['running'] else 'No'}")
    if frontend_state == "UNMANAGED":
        listener_pid = _find_listening_pid_on_port(frontend.port)
        print("  Managed by dev-stack: No (running outside dev-stack)")
        if listener_pid:
            print(f"  Listener PID: {listener_pid}")
    else:
        print(f"  Managed by dev-stack: {'Yes' if frontend_state == 'MANAGED' else 'No'}")
    print(f"  Port: {frontend.port}")
    print(f"  PID: {frontend_info['pid'] or '-'}")
    print(f"  Cwd: {frontend_info['cwd']}")
    print("")
    print("Database:")
    print(f"  {database_name}")
    print("")
    print("Runtime:")
    print(f"  {runtime_label}")
    print("")
    print("Health:")
    print(f"  Backend Docs: {backend_docs_status}")
    print(f"  Frontend Root: {frontend_status}")
    return 0


def _ensure_layout(repo_root: Path, manifest: dict[str, Any]) -> tuple[Path, Path]:
    paths = manifest["paths"]
    run_dir = repo_root / paths["run_dir"]
    logs_dir = repo_root / paths["logs_dir"]
    run_dir.mkdir(parents=True, exist_ok=True)
    logs_dir.mkdir(parents=True, exist_ok=True)
    return run_dir, logs_dir


def _pid_path(run_dir: Path, service: str) -> Path:
    return run_dir / f"{service}.json"


def _read_pid_record(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def _write_pid_record(path: Path, record: dict[str, Any]) -> None:
    path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")


def _is_process_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if sys.platform == "win32":
        import ctypes

        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        handle = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if handle:
            ctypes.windll.kernel32.CloseHandle(handle)
            return True
        return False

    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _reset_port_cache() -> None:
    global _listening_ports_cache
    _listening_ports_cache = None


def _port_check_hosts(host: str) -> list[str]:
    normalized = str(host or "").strip() or "127.0.0.1"
    if normalized in {"127.0.0.1", "localhost"}:
        return ["127.0.0.1"]
    return [normalized]


def _parse_windows_netstat_listening_ports(stdout: str) -> set[int]:
    ports: set[int] = set()
    for line in stdout.splitlines():
        if "LISTENING" not in line.upper():
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        local_address = parts[1]
        if ":" not in local_address:
            continue
        port_token = local_address.rsplit(":", 1)[-1]
        try:
            ports.add(int(port_token))
        except ValueError:
            continue
    return ports


def _collect_listening_tcp_ports() -> set[int]:
    if sys.platform == "win32":
        try:
            result = subprocess.run(
                ["netstat", "-ano", "-p", "tcp"],
                capture_output=True,
                text=True,
                check=False,
                timeout=NETSTAT_TIMEOUT_SECONDS,
                encoding="utf-8",
                errors="replace",
            )
        except (OSError, subprocess.TimeoutExpired):
            return set()
        return _parse_windows_netstat_listening_ports(result.stdout)

    for command in (
        ["ss", "-H", "-ltn"],
        ["netstat", "-ltn"],
    ):
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=False,
                timeout=NETSTAT_TIMEOUT_SECONDS,
                encoding="utf-8",
                errors="replace",
            )
        except (OSError, subprocess.TimeoutExpired):
            continue
        if result.returncode != 0:
            continue
        ports: set[int] = set()
        for line in result.stdout.splitlines():
            if "LISTEN" not in line.upper():
                continue
            for token in line.split():
                if ":" not in token:
                    continue
                port_token = token.rsplit(":", 1)[-1]
                try:
                    ports.add(int(port_token))
                except ValueError:
                    continue
        if ports:
            return ports
    return set()


def _get_listening_ports() -> set[int]:
    global _listening_ports_cache
    if _listening_ports_cache is None:
        _listening_ports_cache = _collect_listening_tcp_ports()
    return _listening_ports_cache


def _probe_port_connect(host: str, port: int, *, timeout: float) -> bool:
    safe_timeout = max(0.05, min(timeout, PORT_CONNECT_TIMEOUT_SECONDS))
    sock: socket.socket | None = None
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(safe_timeout)
        sock.connect((host, port))
        return True
    except (TimeoutError, ConnectionRefusedError, OSError, socket.timeout):
        return False
    finally:
        if sock is not None:
            sock.close()


def _is_port_listening(host: str, port: int) -> bool:
    if sys.platform == "win32":
        if port in _get_listening_ports():
            return True

    deadline = time.monotonic() + PORT_CHECK_BUDGET_SECONDS
    for candidate in _port_check_hosts(host):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        if _probe_port_connect(candidate, port, timeout=remaining):
            return True
    return False


def _find_listening_pid_on_port(port: int) -> int | None:
    if sys.platform == "win32":
        try:
            result = subprocess.run(
                ["netstat", "-ano", "-p", "tcp"],
                capture_output=True,
                text=True,
                check=False,
                timeout=NETSTAT_TIMEOUT_SECONDS,
                encoding="utf-8",
                errors="replace",
            )
        except (OSError, subprocess.TimeoutExpired):
            return None
        needle = f":{port}"
        for line in result.stdout.splitlines():
            if "LISTENING" not in line.upper() or needle not in line:
                continue
            parts = line.split()
            if len(parts) < 5:
                continue
            local_address = parts[1]
            if not local_address.endswith(needle):
                continue
            try:
                return int(parts[-1])
            except ValueError:
                continue
        return None

    result = subprocess.run(
        ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
        capture_output=True,
        text=True,
        check=False,
    )
    for line in result.stdout.splitlines():
        token = line.strip()
        if token.isdigit():
            return int(token)
    return None


def _detached_popen(
    *,
    command: list[str],
    cwd: Path,
    env: dict[str, str],
    log_path: Path,
    service: str,
) -> subprocess.Popen[Any]:
    _assert_no_shell_launcher(command, service=service)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_handle = open(log_path, "a", encoding="utf-8")
    log_handle.write(f"\n===== dev-stack start {service} =====\n")
    log_handle.flush()

    child_env = dict(env)
    if sys.platform == "win32":
        child_env.setdefault("PYTHONIOENCODING", "utf-8")

    popen_kwargs: dict[str, Any] = {
        "args": command,
        "cwd": cwd,
        "env": child_env,
        "stdin": subprocess.DEVNULL,
        "stdout": log_handle,
        "stderr": subprocess.STDOUT,
    }
    if sys.platform == "win32":
        popen_kwargs.update(_windows_subprocess_kwargs())
    else:
        popen_kwargs["start_new_session"] = True

    process = subprocess.Popen(**popen_kwargs)
    log_handle.close()
    return process


def _windows_startupinfo() -> subprocess.STARTUPINFO:
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = subprocess.SW_HIDE
    return startupinfo


def _windows_subprocess_kwargs() -> dict[str, Any]:
    return {
        "creationflags": _windows_creation_flags(),
        "startupinfo": _windows_startupinfo(),
    }


def _windows_creation_flags() -> int:
    CREATE_NEW_PROCESS_GROUP = 0x00000200
    CREATE_NO_WINDOW = 0x08000000
    return CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW


def _assert_no_shell_launcher(command: list[str], *, service: str) -> None:
    executable = Path(str(command[0]))
    suffix = executable.suffix.lower()
    blocked = {".cmd", ".bat", ".ps1", ".vbs", ".wsf"}
    if suffix in blocked:
        raise DevStackError(
            f"Refusing to launch {service} via shell wrapper {executable.name}. "
            f"Use a native executable such as python.exe or node.exe."
        )


PORT_READY_TIMEOUT_SECONDS = 20.0


def _wait_for_port(host: str, port: int, *, timeout_seconds: float = PORT_READY_TIMEOUT_SECONDS) -> bool:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if _is_port_listening(host, port):
            return True
        time.sleep(0.05)
    return _is_port_listening(host, port)


def _terminate_process_tree(pid: int) -> None:
    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            **_windows_subprocess_kwargs(),
        )
        return

    try:
        os.kill(pid, 15)
    except OSError:
        return


def _validate_prerequisites(repo_root: Path, manifest: dict[str, Any]) -> None:
    paths = manifest["paths"]
    backend_venv = repo_root / paths["backend_venv"]
    frontend_node_modules = repo_root / paths["frontend_node_modules"]

    missing: list[str] = []
    if not backend_venv.is_dir():
        missing.append(str(paths["backend_venv"]))
    else:
        python_executable = _resolve_python_executable(repo_root, manifest)
        if not python_executable.is_file():
            missing.append(str(python_executable.relative_to(repo_root)))

    if not frontend_node_modules.is_dir():
        missing.append(str(paths["frontend_node_modules"]))

    if missing:
        lines = [
            "Dev stack prerequisites are missing:",
            *[f"  - {item}" for item in missing],
            "",
            "Install dependencies first:",
            "  cd backend && python -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt",
            "  cd frontend && npm install",
        ]
        raise DevStackError("\n".join(lines))


def _collect_ports(manifest: dict[str, Any]) -> list[int]:
    ports: list[int] = []
    for environment in manifest["environment_order"]:
        env_config = manifest["environments"][environment]
        ports.append(int(env_config["backend"]["port"]))
        ports.append(int(env_config["frontend"]["port"]))
    return ports


def _check_ports_available(manifest: dict[str, Any], host: str) -> None:
    blocked: list[int] = []
    for port in _collect_ports(manifest):
        if _is_port_listening(host, port):
            blocked.append(port)
    if blocked:
        joined = ", ".join(str(port) for port in blocked)
        raise DevStackError(
            "Cannot start dev stack: the following ports are already in use: "
            f"{joined}. Stop conflicting processes or run `dev-stack.ps1 stop`."
        )


def _service_management_state(
    *,
    spec: ServiceSpec,
    run_dir: Path,
    host: str,
) -> str:
    """Return STOPPED | MANAGED | UNMANAGED | STALE | FAILED."""
    pid_path = _pid_path(run_dir, spec.service)
    record = _read_pid_record(pid_path)
    port_open = _is_port_listening(host, spec.port)
    pid = int(record.get("pid", 0)) if record else 0
    pid_alive = _is_process_alive(pid) if pid else False

    if port_open:
        if record is not None and pid_alive:
            return "MANAGED"
        return "UNMANAGED"

    if pid_alive:
        return "FAILED"
    if record is not None:
        return "STALE"
    return "STOPPED"


def _format_unmanaged_service_error(spec: ServiceSpec, environment: str) -> str:
    listener_pid = _find_listening_pid_on_port(spec.port)
    pid_hint = f" (pid={listener_pid})" if listener_pid else ""
    env_token = environment.casefold()
    return (
        f"{spec.service} on port {spec.port} is running outside dev-stack{pid_hint}. "
        f"Stop it first: python scripts/dev-stack/dev_stack.py stop {env_token}"
    )


def _service_status(
    *,
    spec: ServiceSpec,
    run_dir: Path,
    host: str,
) -> str:
    state = _service_management_state(spec=spec, run_dir=run_dir, host=host)
    if state == "MANAGED":
        return "RUNNING"
    if state == "UNMANAGED":
        return "UNMANAGED"
    if state == "FAILED":
        return "FAILED"
    if state == "STALE":
        return "STALE PID"
    return "STOPPED"


def _format_status_line(environment: str, role: str, status: str) -> str:
    label = f"{environment} {role}"
    return f"{label:<18} {status}"


def cmd_status(repo_root: Path, manifest: dict[str, Any]) -> int:
    run_dir, _ = _ensure_layout(repo_root, manifest)
    host = str(manifest["backend_launch"]["host"])
    for spec in _iter_services(repo_root, manifest):
        status = _service_status(spec=spec, run_dir=run_dir, host=host)
        print(_format_status_line(spec.environment, spec.role, status))
    return 0


def cmd_stop(repo_root: Path, manifest: dict[str, Any]) -> int:
    run_dir, _ = _ensure_layout(repo_root, manifest)
    host = str(manifest["backend_launch"]["host"])
    services = _iter_services(repo_root, manifest)
    pid_files = sorted(run_dir.glob("*.json"))
    any_port_open = any(_is_port_listening(host, spec.port) for spec in services)

    if not pid_files and not any_port_open:
        print("Dev stack is already stopped.")
        return 0

    stopped_any = False
    for spec in services:
        if _stop_service_by_pid(
            spec=spec,
            run_dir=run_dir,
            host=host,
            allow_port_fallback=True,
        ):
            stopped_any = True

    if not stopped_any:
        print("Dev stack is already stopped.")
    return 0


def cmd_start(repo_root: Path, manifest: dict[str, Any]) -> int:
    _validate_prerequisites(repo_root, manifest)
    run_dir, logs_dir = _ensure_layout(repo_root, manifest)
    host = str(manifest["backend_launch"]["host"])

    alive_services = []
    for spec in _iter_services(repo_root, manifest):
        if _service_status(spec=spec, run_dir=run_dir, host=host) == "RUNNING":
            alive_services.append(spec.service)
    if alive_services:
        raise DevStackError(
            "Dev stack is already running for: "
            + ", ".join(alive_services)
            + ". Run `dev-stack.ps1 stop` first."
        )

    stale_files = [path for path in run_dir.glob("*.json")]
    for path in stale_files:
        path.unlink(missing_ok=True)

    _check_ports_available(manifest, host)

    started = 0
    started_processes: list[tuple[ServiceSpec, subprocess.Popen[Any]]] = []
    try:
        for spec in _iter_services(repo_root, manifest):
            log_path = _resolve_service_log_path(repo_root, manifest, spec, logs_dir)
            process = _start_service_spec(
                repo_root=repo_root,
                manifest=manifest,
                spec=spec,
                run_dir=run_dir,
                logs_dir=logs_dir,
                host=host,
            )
            started_processes.append((spec, process))
            started += 1
    except DevStackError:
        for spec, process in reversed(started_processes):
            if _is_process_alive(process.pid):
                _terminate_process_tree(process.pid)
            _pid_path(run_dir, spec.service).unlink(missing_ok=True)
        raise

    print(f"Dev stack started: {started} processes.")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Local dev stack manager")
    parser.add_argument("command", choices=["start", "stop", "status", "restart"])
    parser.add_argument(
        "environment",
        nargs="?",
        default=None,
        metavar="ENV",
        help="Optional environment scope: dev, template, client",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=None,
        help="Repository root (defaults to parent of scripts/dev-stack)",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=None,
        help="Path to manifest.yaml",
    )
    return parser


def _dispatch_command(
    repo_root: Path,
    manifest: dict[str, Any],
    command: str,
    environment: str | None,
) -> int:
    if environment:
        if command == "start":
            return cmd_start_environment(repo_root, manifest, environment)
        if command == "stop":
            return cmd_stop_environment(repo_root, manifest, environment)
        if command == "restart":
            return cmd_restart_environment(repo_root, manifest, environment)
        return cmd_status_environment(repo_root, manifest, environment)

    if command == "start":
        return cmd_start(repo_root, manifest)
    if command == "stop":
        return cmd_stop(repo_root, manifest)
    return cmd_status(repo_root, manifest)


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    repo_root = args.repo_root or _repo_root_from_script()
    manifest_path = args.manifest or (Path(__file__).resolve().parent / MANIFEST_NAME)
    manifest = _load_manifest_text(manifest_path)

    try:
        _reset_port_cache()
        if args.environment:
            _normalize_environment_key(args.environment)
        return _dispatch_command(repo_root, manifest, args.command, args.environment)
    except DevStackError as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
