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


def _resolve_template_artifact_dir(
    repo_root: Path,
    manifest: dict[str, Any],
    frontend: dict[str, Any],
) -> Path:
    paths = manifest["paths"]
    frontend_dir = repo_root / paths["frontend_dir"]
    artifact_relative = str(frontend.get("artifact_dir", "dist-template")).strip() or "dist-template"
    return frontend_dir / artifact_relative


def _assert_template_artifact_ready(
    repo_root: Path,
    manifest: dict[str, Any],
    frontend: dict[str, Any],
) -> None:
    artifact_dir = _resolve_template_artifact_dir(repo_root, manifest, frontend)
    index_file = artifact_dir / "index.html"
    if artifact_dir.is_dir() and index_file.is_file():
        return

    raise DevStackError(
        "TEMPLATE artifact runtime is not ready.\n"
        f"Expected build output: {artifact_dir.relative_to(repo_root)}/index.html\n"
        "Build once from frontend/:\n"
        "  npm run build:template"
    )


def _build_frontend_command(
    repo_root: Path,
    manifest: dict[str, Any],
    frontend: dict[str, Any],
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

    if runtime == "artifact":
        _assert_template_artifact_ready(repo_root, manifest, frontend)
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

    services: list[ServiceSpec] = []
    for environment in manifest["environment_order"]:
        env_config = manifest["environments"][environment]

        backend = env_config["backend"]
        backend_env = dict(base_env)
        backend_env["APP_ENV"] = str(backend["app_env"])
        backend_env["YASNOPRO_ENV"] = str(backend["app_env"])
        backend_env["DATABASE_URL"] = _database_url(manifest, str(backend["database"]))
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
                cwd=backend_dir,
                env=backend_env,
            )
        )

        frontend = env_config["frontend"]
        frontend_cmd = _build_frontend_command(repo_root, manifest, frontend)
        services.append(
            ServiceSpec(
                environment=str(environment),
                role="frontend",
                service=str(frontend["service"]),
                port=int(frontend["port"]),
                log_file=str(frontend["log_file"]),
                command=frontend_cmd,
                cwd=frontend_dir,
                env=dict(base_env),
            )
        )

    return services


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


def _service_status(
    *,
    spec: ServiceSpec,
    run_dir: Path,
    host: str,
) -> str:
    pid_path = _pid_path(run_dir, spec.service)
    record = _read_pid_record(pid_path)
    port_open = _is_port_listening(host, spec.port)

    if record is None:
        return "RUNNING" if port_open else "STOPPED"

    pid = int(record.get("pid", 0))
    pid_alive = _is_process_alive(pid)

    if port_open:
        return "RUNNING"

    if pid_alive:
        return "FAILED"

    return "STALE PID"


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
        pid_file = _pid_path(run_dir, spec.service)
        record = _read_pid_record(pid_file)
        pid = int(record.get("pid", 0)) if record else 0
        service = str(record.get("service", spec.service)) if record else spec.service

        if pid and _is_process_alive(pid):
            _terminate_process_tree(pid)
            print(f"Stopped {service} (pid={pid})")
            stopped_any = True
        elif record is not None and pid:
            print(f"Removed stale pid for {service} (pid={pid})")
            stopped_any = True

        if _is_port_listening(host, spec.port):
            listener_pid = _find_listening_pid_on_port(spec.port)
            if listener_pid and listener_pid != pid:
                _terminate_process_tree(listener_pid)
                print(f"Stopped {service} listener (pid={listener_pid}, port={spec.port})")
                stopped_any = True

        pid_file.unlink(missing_ok=True)

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
            log_path = logs_dir / spec.log_file
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
            started_processes.append((spec, process))
            print(f"Started {spec.service} (pid={process.pid}, port={spec.port}, log={log_path})")
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
    parser.add_argument("command", choices=["start", "stop", "status"])
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


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    repo_root = args.repo_root or _repo_root_from_script()
    manifest_path = args.manifest or (Path(__file__).resolve().parent / MANIFEST_NAME)
    manifest = _load_manifest_text(manifest_path)

    try:
        _reset_port_cache()
        if args.command == "start":
            return cmd_start(repo_root, manifest)
        if args.command == "stop":
            return cmd_stop(repo_root, manifest)
        return cmd_status(repo_root, manifest)
    except DevStackError as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
