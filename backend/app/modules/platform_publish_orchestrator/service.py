"""Publish Orchestrator service entry points (WI-IMPL-006)."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_deployment_registry.constants import (
  PlatformDeploymentKind,
  PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_publish_orchestrator.orchestrator import PublishOrchestrator
from app.modules.platform_publish_orchestrator.types import PublishContext, PublishResult
from app.modules.platform_release.constants import PlatformReleaseStatus
from app.modules.platform_release.dependencies import assert_reviewer_action
from app.modules.platform_release_package_registry import service as package_registry_service
from app.modules.platform_release_package_registry.governance import get_review_status
from app.modules.tenant_environment.resolver import resolve_template_tenant_id
from app.modules.users.models import User


def generate_deployment_key(*, now: datetime | None = None) -> str:
  moment = now or datetime.utcnow()
  date_part = moment.strftime("%Y%m%d")
  serial = uuid4().int % 10000
  return f"DPL-{date_part}-{serial:04d}"


def build_publish_context(
  *,
  package,
  deployment_kind: str,
  target_environment_type: str,
  target_tenant_id: int,
  deployment_key: str | None = None,
  deployment_manifest_json: dict | None = None,
  actor_user_id: int | None = None,
  previous_platform_version: str | None = None,
  previous_release_package_id: int | None = None,
) -> PublishContext:
  manifest = package.package_manifest_json if isinstance(package.package_manifest_json, dict) else {}
  schema_revision = manifest.get("schema_revision")
  return PublishContext(
    release_package_id=package.id,
    package_key=package.package_key,
    platform_version=package.platform_version,
    deployment_kind=deployment_kind,
    target_environment_type=target_environment_type,
    target_tenant_id=target_tenant_id,
    deployment_key=deployment_key or generate_deployment_key(),
    deployment_manifest_json=dict(deployment_manifest_json or {}),
    actor_user_id=actor_user_id,
    previous_platform_version=previous_platform_version,
    previous_release_package_id=previous_release_package_id,
    target_schema_revision=str(schema_revision).strip() if schema_revision else None,
  )


def run_publish(db: Session, context: PublishContext) -> PublishResult:
  """Core orchestrator entry — deployment + materialize + verify + activate (WI-IMPL-007–009)."""
  orchestrator = PublishOrchestrator(db)
  return orchestrator.run(context)


def run_template_publish(
  db: Session,
  *,
  release_id: int,
  actor: User,
) -> tuple[object, PublishResult]:
  """
  Template publish single entry point (ADR-TPL-001 / ADR-CP-001).

  Validates review state, publishes package registry row, delegates to orchestrator.
  Does NOT mark_succeeded, activate, or pin version.
  """
  assert_reviewer_action(actor)
  package = package_registry_service.get_release_package(db, release_id)
  governance_status = get_review_status(package)
  if governance_status != PlatformReleaseStatus.APPROVED_BY_PLATFORM.value:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Release must be approved by platform before publishing to template.",
    )
  
  allowed_package_statuses = {"ready", "published"}

  if str(package.status or "").strip().lower() not in allowed_package_statuses:
   raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail=(
      "Release package must be ready or published before publishing to template. "
      f"Current status: {package.status}"
    ),
  )

  template_tenant_id = resolve_template_tenant_id(db)
  if template_tenant_id is None:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Эталонный tenant (TEMPLATE) не найден",
    )

  if str(package.status or "").strip().lower() == "ready":
    package = package_registry_service.publish_package(db, package_id=package.id)
  context = build_publish_context(
    package=package,
    deployment_kind=PlatformDeploymentKind.TEMPLATE_PUBLISH.value,
    target_environment_type=PlatformDeploymentTargetEnvironmentType.TEMPLATE.value,
    target_tenant_id=template_tenant_id,
    deployment_manifest_json={
      "created_via": "platform_releases_api_adapter",
      "orchestrator_entry": "run_template_publish",
    },
    actor_user_id=actor.id if actor.id else None,
  )
  result = run_publish(db, context)
  db.refresh(package)
  return package, result
