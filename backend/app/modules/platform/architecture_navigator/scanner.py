"""Architecture Scanner v1 — lightweight evidence collection."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from app.core.runtime_paths import (
    get_app_root,
    get_dev_frontend_src_dir,
    is_dev_filesystem_scan_enabled,
    try_dev_monorepo_root,
)
from app.modules.platform.architecture_navigator.constants import (
    SCANNER_VERSION,
    ArchitectureFindingKind,
    ArchitectureSourceKind,
)
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.coverage_resolver import (
    iter_platform_implementation_files,
    resolve_file_primary_owner,
)
from app.modules.platform.architecture_navigator.ownership_policy import (
    OWNERSHIP_ROLE_PRIMARY,
    OWNERSHIP_ROLE_RELATED,
)
from app.modules.platform_dashboard_analyzer.backend_scan import scan_backend

_IMPLEMENTATION_FILE_SUFFIXES = frozenset({".py", ".jsx", ".js", ".ts", ".tsx", ".css"})
_SKIP_DIR_NAMES = frozenset({"__pycache__", "node_modules", ".pytest_cache"})


@dataclass
class ScanFindingDraft:
    component_key: str | None
    finding_kind: str
    source_kind: str
    label: str
    value: str | None = None
    details: dict = field(default_factory=dict)


@dataclass
class ScanDraft:
    scanner_version: str = SCANNER_VERSION
    findings: list[ScanFindingDraft] = field(default_factory=list)
    summary: dict = field(default_factory=dict)


def _scan_architecture_docs(repo_root: Path) -> list[ScanFindingDraft]:
    docs_dir = repo_root / "docs" / "architecture"
    findings: list[ScanFindingDraft] = []
    if not docs_dir.exists():
        return findings

    for path in sorted(docs_dir.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".md", ".mdc"}:
            continue
        rel = path.relative_to(repo_root).as_posix()
        findings.append(
            ScanFindingDraft(
                component_key=None,
                finding_kind=ArchitectureFindingKind.DOCUMENT.value,
                source_kind=ArchitectureSourceKind.ARCHITECTURE_DOCUMENT.value,
                label=rel,
                value=path.name,
            )
        )
    return findings


def _scan_cursor_rules(repo_root: Path) -> list[ScanFindingDraft]:
    rules_dir = repo_root / ".cursor" / "rules"
    findings: list[ScanFindingDraft] = []
    if not rules_dir.exists():
        return findings

    for path in sorted(rules_dir.glob("*.mdc")):
        rel = path.relative_to(repo_root).as_posix()
        findings.append(
            ScanFindingDraft(
                component_key=None,
                finding_kind=ArchitectureFindingKind.RULE.value,
                source_kind=ArchitectureSourceKind.CURSOR_RULE.value,
                label=rel,
                value=path.name,
            )
        )
    return findings


def _scan_api_routes(app_root: Path) -> list[ScanFindingDraft]:
    scan = scan_backend(app_root)
    findings: list[ScanFindingDraft] = []
    for marker in sorted(scan.router_markers):
        if not marker or marker == "APIRouter(":
            continue
        findings.append(
            ScanFindingDraft(
                component_key=None,
                finding_kind=ArchitectureFindingKind.ROUTE.value,
                source_kind=ArchitectureSourceKind.API_ROUTE_SCAN.value,
                label=marker,
            )
        )
    return findings


def _scan_frontend_routes(frontend_src: Path) -> list[ScanFindingDraft]:
    app_jsx = frontend_src / "App.jsx"
    findings: list[ScanFindingDraft] = []
    if not app_jsx.exists():
        return findings

    text = app_jsx.read_text(encoding="utf-8", errors="ignore")
    for match in re.finditer(r'path="([^"]+)"', text):
        route = match.group(1).strip()
        if not route or route.startswith("*"):
            continue
        findings.append(
            ScanFindingDraft(
                component_key=None,
                finding_kind=ArchitectureFindingKind.ROUTE.value,
                source_kind=ArchitectureSourceKind.FRONTEND_ROUTE_SCAN.value,
                label=route,
            )
        )
    return findings


def _scan_database_schema(app_root: Path) -> list[ScanFindingDraft]:
    scan = scan_backend(app_root)
    findings: list[ScanFindingDraft] = []
    for table in sorted(scan.model_tables):
        findings.append(
            ScanFindingDraft(
                component_key=None,
                finding_kind=ArchitectureFindingKind.TABLE.value,
                source_kind=ArchitectureSourceKind.DATABASE_SCAN.value,
                label=table,
            )
        )
    return findings


def _is_implementation_source(path: Path) -> bool:
    if path.suffix.lower() not in _IMPLEMENTATION_FILE_SUFFIXES:
        return False
    return not any(part in _SKIP_DIR_NAMES for part in path.parts)


def _iter_scoped_files(root: Path, prefix: str) -> list[Path]:
    normalized = prefix.strip().strip("/")
    if not normalized:
        return []
    target = root / normalized
    if target.is_file() and _is_implementation_source(target):
        return [target]
    if not target.is_dir():
        return []
    files: list[Path] = []
    for path in sorted(target.rglob("*")):
        if path.is_file() and _is_implementation_source(path):
            files.append(path)
    return files


def _scope_matches_prefix(rel: str, prefix: str) -> bool:
    norm = prefix.strip().strip("/")
    if not norm:
        return False
    if norm.endswith((".py", ".js", ".jsx", ".ts", ".tsx", ".css")):
        return rel == norm or rel.endswith("/" + norm)
    return rel == norm or rel.startswith(norm.rstrip("/") + "/") or rel.startswith(norm)


def _component_keys_for_file(rel: str, side: str) -> list[str]:
    owners: list[str] = []
    for component_key, scope in COMPONENT_SCAN_SCOPES.items():
        for prefix in scope.get(side) or []:
            if _scope_matches_prefix(rel, prefix):
                owners.append(component_key)
                break
    return owners


def _append_file_ownership_findings(
    findings: list[ScanFindingDraft],
    *,
    rel: str,
    side: str,
    path: Path,
    finding_kind: str,
) -> None:
    candidates = _component_keys_for_file(rel, side)
    primary = resolve_file_primary_owner(rel, side, candidates)
    related = sorted({key for key in candidates if key != primary})
    findings.append(
        ScanFindingDraft(
            component_key=primary,
            finding_kind=finding_kind,
            source_kind=ArchitectureSourceKind.CODE_SCAN.value,
            label=rel,
            value=path.name,
            details={"ownership_role": OWNERSHIP_ROLE_PRIMARY},
        )
    )
    for related_key in related:
        findings.append(
            ScanFindingDraft(
                component_key=related_key,
                finding_kind=finding_kind,
                source_kind=ArchitectureSourceKind.CODE_SCAN.value,
                label=rel,
                value=path.name,
                details={
                    "ownership_role": OWNERSHIP_ROLE_RELATED,
                    "primary_owner": primary,
                },
            )
        )


def _scan_component_implementation_files(
    app_root: Path,
    frontend_src: Path | None,
) -> list[ScanFindingDraft]:
    findings: list[ScanFindingDraft] = []
    seen_backend: set[str] = set()
    seen_frontend: set[str] = set()

    for component_key, scope in COMPONENT_SCAN_SCOPES.items():
        for prefix in scope.get("backend") or []:
            for path in _iter_scoped_files(app_root, prefix):
                rel = path.relative_to(app_root).as_posix()
                if rel in seen_backend:
                    continue
                seen_backend.add(rel)
                _append_file_ownership_findings(
                    findings,
                    rel=rel,
                    side="backend",
                    path=path,
                    finding_kind=ArchitectureFindingKind.BACKEND_FILE.value,
                )
        if frontend_src is None:
            continue
        for prefix in scope.get("frontend") or []:
            for path in _iter_scoped_files(frontend_src, prefix):
                rel = path.relative_to(frontend_src).as_posix()
                if rel in seen_frontend:
                    continue
                seen_frontend.add(rel)
                _append_file_ownership_findings(
                    findings,
                    rel=rel,
                    side="frontend",
                    path=path,
                    finding_kind=ArchitectureFindingKind.FRONTEND_FILE.value,
                )

    for side, rel in iter_platform_implementation_files(app_root, frontend_src):
        if side == "backend":
            if rel in seen_backend:
                continue
            base = app_root
            finding_kind = ArchitectureFindingKind.BACKEND_FILE.value
        else:
            if frontend_src is None or rel in seen_frontend:
                continue
            base = frontend_src
            finding_kind = ArchitectureFindingKind.FRONTEND_FILE.value
        path = base / rel
        if not path.is_file():
            continue
        if side == "backend":
            seen_backend.add(rel)
        else:
            seen_frontend.add(rel)
        _append_file_ownership_findings(
            findings,
            rel=rel,
            side=side,
            path=path,
            finding_kind=finding_kind,
        )
    return findings


def _attach_component_hints(findings: list[ScanFindingDraft]) -> None:
    """Best-effort mapping of scan results to catalog component keys."""
    hints: dict[str, str] = {
        "control_plane": "control-plane",
        "platform_event_journal": "journals-data",
        "session_bridge": "session-bridge",
        "platform_users": "platform-identity",
        "company_database_provisioning": "company-provisioning",
        "platform_publish_orchestrator": "deployment-execution",
        "platform_deployment_registry": "deployment-execution",
        "designer/publish": "publication-service",
        "platform/search": "search-service",
        "modules/files": "file-service",
        "modules/notifications": "notifications-module",
        "modules/yasii": "module-yasii",
        "modules/ai_context": "ai-context-engine",
        "runtime_entity": "entity-engine",
        "designer": "studio",
        "published": "config-group-published-catalog",
        "release": "release-package",
        "calendar": "calendar-module",
        "chats": "chats-module",
        "document_libraries": "document-libraries-module",
    }
    for finding in findings:
        if finding.component_key:
            continue
        needle = finding.label.lower()
        for token, component_key in hints.items():
            if token in needle:
                finding.component_key = component_key
                break


def run_architecture_scan() -> ScanDraft:
    app_root = get_app_root()
    draft = ScanDraft()

    api_findings = _scan_api_routes(app_root)
    db_findings = _scan_database_schema(app_root)
    implementation_findings = _scan_component_implementation_files(
        app_root,
        get_dev_frontend_src_dir(),
    )
    doc_findings: list[ScanFindingDraft] = []
    rule_findings: list[ScanFindingDraft] = []
    fe_findings: list[ScanFindingDraft] = []

    if is_dev_filesystem_scan_enabled():
        mono = try_dev_monorepo_root()
        if mono is not None:
            doc_findings = _scan_architecture_docs(mono)
            rule_findings = _scan_cursor_rules(mono)
        frontend_src = get_dev_frontend_src_dir()
        if frontend_src is not None:
            fe_findings = _scan_frontend_routes(frontend_src)

    draft.findings = (
        doc_findings
        + rule_findings
        + api_findings
        + fe_findings
        + db_findings
        + implementation_findings
    )
    _attach_component_hints(draft.findings)

    backend_file_count = sum(
        1 for item in implementation_findings if item.finding_kind == ArchitectureFindingKind.BACKEND_FILE.value
    )
    frontend_file_count = sum(
        1 for item in implementation_findings if item.finding_kind == ArchitectureFindingKind.FRONTEND_FILE.value
    )

    primary_count = sum(
        1
        for item in implementation_findings
        if item.details.get("ownership_role") == OWNERSHIP_ROLE_PRIMARY
    )
    related_count = sum(
        1
        for item in implementation_findings
        if item.details.get("ownership_role") == OWNERSHIP_ROLE_RELATED
    )

    draft.summary = {
        "routes": len(api_findings),
        "tables": len(db_findings),
        "frontend_routes": len(fe_findings),
        "architecture_documents": len(doc_findings),
        "cursor_rules": len(rule_findings),
        "backend_files": backend_file_count,
        "frontend_files": frontend_file_count,
        "primary_implementation_findings": primary_count,
        "related_implementation_findings": related_count,
        "components": len({item.component_key for item in implementation_findings if item.component_key}),
    }
    return draft
