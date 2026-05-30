from pathlib import Path

from app.modules.platform_dashboard_analyzer.types import FrontendScanResult

SCANNED_FRONTEND_PATHS = (
    "modules/platformDashboard",
    "modules/objectViews",
    "modules/objectEntities",
    "modules/objectTypeTable",
    "modules/designer",
    "modules/navigation",
    "modules/notifications",
    # Legacy block isolation guards (portal canvas, editor palette, API, registry)
    "portal",
    "api",
    "modules/editor",
    "modules/blocks",
    "shared/legacy",
    "shared/shell",
    "shared/search",
    # Other stage work evidence scanned by explicit file paths
    "modules/runtimeReadGateway",
    "shared/entityCardShell",
    "modules/universalTable",
)

SCANNED_FRONTEND_EVIDENCE_FILES = (
    "api/runtimeRelationsApi.js",
    "api/platformSearchApi.js",
    "modules/objectEntities/components/ObjectEntityRelatedEntities.jsx",
    "modules/objectEntities/hooks/useObjectEntityRelations.js",
    "modules/objectEntities/components/ObjectEntityCardTabsBlock.jsx",
    "modules/objectEntities/services/resolveCreatableRelationOptions.js",
    "portal/PortalLibraryRuntimePage.jsx",
    "modules/documentLibraries/utils/libraryDeepLink.js",
    "modules/designer/components/shell/DesignerShell.jsx",
)


def scan_frontend(frontend_dir: Path) -> FrontendScanResult:
    result = FrontendScanResult()

    for rel in SCANNED_FRONTEND_PATHS:
        path = frontend_dir / rel
        if path.exists():
            result.module_paths.add(rel)

    for rel in SCANNED_FRONTEND_PATHS:
        path = frontend_dir / rel
        if not path.exists():
            continue
        for file_path in path.rglob("*"):
            if not file_path.is_file():
                continue
            if file_path.suffix not in {".js", ".jsx", ".ts", ".tsx"}:
                continue
            rel_path = file_path.relative_to(frontend_dir).as_posix()
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            result.file_contents[rel_path] = text
            if "platformDevelopmentManifest" in text:
                result.manifest_fallback_files.add(rel_path)

    for rel in SCANNED_FRONTEND_EVIDENCE_FILES:
        path = frontend_dir / rel
        if not path.is_file():
            continue
        rel_path = path.relative_to(frontend_dir).as_posix()
        if rel_path not in result.file_contents:
            result.file_contents[rel_path] = path.read_text(encoding="utf-8", errors="ignore")

    return result


def frontend_has_module(scan: FrontendScanResult, module_path: str) -> bool:
    return module_path in scan.module_paths or any(
        path.startswith(module_path) for path in scan.module_paths
    )


def frontend_has_marker(scan: FrontendScanResult, marker: str) -> bool:
    return any(marker in text for text in scan.file_contents.values())


def frontend_uses_real_api(scan: FrontendScanResult, api_marker: str) -> bool:
    dashboard_api = scan.file_contents.get("modules/platformDashboard/api/platformDashboardApi.js", "")
    return api_marker in dashboard_api or frontend_has_marker(scan, api_marker)
