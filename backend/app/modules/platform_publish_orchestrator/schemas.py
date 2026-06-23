"""API schemas for Publish Orchestrator."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.modules.platform_publish_orchestrator.types import PublishResult


class PublishOrchestratorResultOut(BaseModel):
  status: str
  release_package_id: int
  current_phase: str
  deployment_id: int | None = None
  deployment_key: str | None = None
  materialized_release_id: str | None = None
  errors: list[str] = Field(default_factory=list)


def publish_result_to_out(result: PublishResult) -> PublishOrchestratorResultOut:
  return PublishOrchestratorResultOut(
    status=result.status.value,
    release_package_id=result.release_package_id,
    current_phase=result.current_phase.value,
    deployment_id=result.deployment_id,
    deployment_key=result.deployment_key,
    materialized_release_id=result.materialized_release_id,
    errors=list(result.errors),
  )
