"""Stable fingerprint of analyzer source files for dashboard freshness checks."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

from app.core.runtime_paths import get_app_root

ANALYZER_VERSION = "1"

ANALYZER_FINGERPRINT_FILES = (
    "modules/platform_dashboard_analyzer/stage_works.py",
    "modules/platform_dashboard_analyzer/analyzer.py",
    "modules/platform_dashboard_analyzer/backend_scan.py",
    "modules/platform_dashboard_analyzer/frontend_scan.py",
    "modules/platform_dashboard_analyzer/doc_reader.py",
)


@dataclass(frozen=True)
class AnalyzerFingerprint:
    version: str
    hash: str


def compute_analyzer_fingerprint(app_root: Path | None = None) -> AnalyzerFingerprint:
    root = app_root or get_app_root()
    digest = hashlib.sha256()

    for rel in ANALYZER_FINGERPRINT_FILES:
        path = root / rel
        content = path.read_text(encoding="utf-8", errors="ignore") if path.is_file() else ""
        digest.update(rel.encode("utf-8"))
        digest.update(b"\0")
        digest.update(content.encode("utf-8"))
        digest.update(b"\0")

    return AnalyzerFingerprint(version=ANALYZER_VERSION, hash=digest.hexdigest())
