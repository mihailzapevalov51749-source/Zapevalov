"""Verify result contract for Digest Bridge (WI-IMPL-003)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

VerifyStatus = Literal["passed", "failed", "partial"]


@dataclass
class VerifyIssue:
    code: str
    message: str
    layer: str

    def to_dict(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message, "layer": self.layer}


@dataclass
class VerifyResult:
    """
    Unified Digest Bridge verification result.

    status:
      - passed: full provenance chain verified
      - partial: legacy/incomplete linkage; some layers OK
      - failed: provenance mismatch or missing required artifacts
    """

    status: VerifyStatus
    build_match: bool = False
    package_match: bool = False
    manifest_match: bool = False
    runtime_match: bool = False
    drift_detected: bool = False
    issues: list[VerifyIssue] = field(default_factory=list)
    checks: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "build_match": self.build_match,
            "package_match": self.package_match,
            "manifest_match": self.manifest_match,
            "runtime_match": self.runtime_match,
            "drift_detected": self.drift_detected,
            "issues": [issue.to_dict() for issue in self.issues],
            "checks": self.checks,
        }
