import re
from pathlib import Path

from app.modules.platform_dashboard_analyzer.types import BackendScanResult

SCANNED_BACKEND_EVIDENCE_FILES = (
    "modules/platform/runtime/relation_instances/router.py",
    "modules/platform/runtime/relation_instances/test_relation_instances.py",
    "modules/platform/runtime/search/service.py",
    "modules/platform/runtime/search/router.py",
    "modules/platform/runtime/search/ranking.py",
    "modules/platform/runtime/search/test_search.py",
    "modules/platform/search/service.py",
    "modules/platform/search/permissions.py",
    "modules/platform/search/repository.py",
    "modules/platform/search/test_platform_search.py",
)


def scan_backend(backend_dir: Path) -> BackendScanResult:
    result = BackendScanResult()
    modules_dir = backend_dir / "modules"

    if modules_dir.exists():
        for path in modules_dir.rglob("*"):
            if path.is_dir():
                rel = path.relative_to(backend_dir).as_posix()
                if rel.count("/") <= 3:
                    result.module_paths.add(rel)

            if path.name == "models.py" and path.is_file():
                text = path.read_text(encoding="utf-8", errors="ignore")
                for match in re.finditer(r'__tablename__\s*=\s*"([^"]+)"', text):
                    result.model_tables.add(match.group(1))

            if path.name.startswith("test_") and path.suffix == ".py":
                result.test_paths.add(path.relative_to(backend_dir).as_posix())

            if path.name == "router.py" and path.is_file():
                text = path.read_text(encoding="utf-8", errors="ignore")
                for match in re.finditer(r'prefix\s*=\s*"([^"]+)"', text):
                    result.router_markers.add(match.group(1))
                for match in re.finditer(r"APIRouter\(", text):
                    result.router_markers.add(path.parent.relative_to(backend_dir).as_posix())

    main_py = backend_dir / "main.py"
    if main_py.exists():
        result.main_py_text = main_py.read_text(encoding="utf-8", errors="ignore")
        for match in re.finditer(r"include_router\((\w+)", result.main_py_text):
            result.router_markers.add(match.group(1))

    for rel in SCANNED_BACKEND_EVIDENCE_FILES:
        path = backend_dir / rel
        if path.is_file():
            result.file_contents[rel] = path.read_text(encoding="utf-8", errors="ignore")

    return result


def backend_has_module(scan: BackendScanResult, *parts: str) -> bool:
    needle = "/".join(parts)
    return any(needle in path for path in scan.module_paths)


def backend_has_router_marker(scan: BackendScanResult, marker: str) -> bool:
    if marker in scan.router_markers:
        return True
    return marker in scan.main_py_text


def backend_has_table(scan: BackendScanResult, table_name: str) -> bool:
    return table_name in scan.model_tables


def backend_has_tests(scan: BackendScanResult, *needles: str) -> bool:
    if not scan.test_paths:
        return False
    if not needles:
        return len(scan.test_paths) > 0
    joined = "\n".join(scan.test_paths)
    return any(needle in joined for needle in needles)
