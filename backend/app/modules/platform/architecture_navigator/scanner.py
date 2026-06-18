"""Architecture Scanner v1 — lightweight evidence collection."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from app.modules.platform.architecture_navigator.constants import (
    SCANNER_VERSION,
    ArchitectureFindingKind,
    ArchitectureSourceKind,
)
from app.modules.platform_dashboard_analyzer.backend_scan import scan_backend


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


def _repo_root() -> Path:
    # scanner.py → .../backend/app/modules/platform/architecture_navigator/scanner.py
    return Path(__file__).resolve().parents[5]


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


def _scan_api_routes(repo_root: Path) -> list[ScanFindingDraft]:
    backend_dir = repo_root / "backend" / "app"
    scan = scan_backend(backend_dir)
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


def _scan_frontend_routes(repo_root: Path) -> list[ScanFindingDraft]:
    app_jsx = repo_root / "frontend" / "src" / "App.jsx"
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


def _scan_database_schema(repo_root: Path) -> list[ScanFindingDraft]:
    backend_dir = repo_root / "backend" / "app"
    scan = scan_backend(backend_dir)
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


def _attach_component_hints(findings: list[ScanFindingDraft]) -> None:
    """Best-effort mapping of scan results to catalog component keys."""
    hints: dict[str, str] = {
        "control_plane": "control-plane",
        "platform_event_journal": "event-engine",
        "session_bridge": "session-bridge",
        "platform_users": "platform-identity",
        "runtime_entity": "entity-engine",
        "designer": "studio",
        "published": "published-catalog",
        "release": "release-governance",
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
    repo_root = _repo_root()
    draft = ScanDraft()

    doc_findings = _scan_architecture_docs(repo_root)
    rule_findings = _scan_cursor_rules(repo_root)
    api_findings = _scan_api_routes(repo_root)
    fe_findings = _scan_frontend_routes(repo_root)
    db_findings = _scan_database_schema(repo_root)

    draft.findings = doc_findings + rule_findings + api_findings + fe_findings + db_findings
    _attach_component_hints(draft.findings)

    draft.summary = {
        "routes": len(api_findings),
        "tables": len(db_findings),
        "frontend_routes": len(fe_findings),
        "architecture_documents": len(doc_findings),
        "cursor_rules": len(rule_findings),
        "components": 0,
    }
    return draft
