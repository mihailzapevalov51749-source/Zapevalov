"""Publish Orchestrator contracts (WI-IMPL-006)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

from app.modules.platform_publish_orchestrator.constants import (
  PublishExtensionStatus,
  PublishOrchestratorStatus,
  PublishPhase,
)


@dataclass
class PublishContext:
  """Single publish attempt context passed through orchestrator phases."""

  release_package_id: int
  package_key: str
  platform_version: str
  deployment_kind: str
  target_environment_type: str
  target_tenant_id: int
  deployment_key: str
  deployment_manifest_json: dict[str, Any] = field(default_factory=dict)
  actor_user_id: int | None = None
  previous_platform_version: str | None = None
  previous_release_package_id: int | None = None
  target_schema_revision: str | None = None

  def to_dict(self) -> dict[str, Any]:
    return asdict(self)


@dataclass
class PublishExtensionResult:
  """Result of a single extension point (stub on foundation phase)."""

  phase: PublishPhase
  status: PublishExtensionStatus
  message: str

  def to_dict(self) -> dict[str, str]:
    return {
      "phase": self.phase.value,
      "status": self.status.value,
      "message": self.message,
    }


@dataclass
class PublishResult:
  """Orchestrator outcome for a publish run."""

  status: PublishOrchestratorStatus
  release_package_id: int
  current_phase: PublishPhase
  deployment_id: int | None = None
  deployment_key: str | None = None
  materialized_release_id: str | None = None
  errors: list[str] = field(default_factory=list)
  started_at: datetime | None = None
  finished_at: datetime | None = None

  def to_dict(self) -> dict[str, Any]:
    return {
      "status": self.status.value,
      "release_package_id": self.release_package_id,
      "current_phase": self.current_phase.value,
      "deployment_id": self.deployment_id,
      "deployment_key": self.deployment_key,
      "materialized_release_id": self.materialized_release_id,
      "errors": list(self.errors),
      "started_at": self.started_at.isoformat() if self.started_at else None,
      "finished_at": self.finished_at.isoformat() if self.finished_at else None,
    }
