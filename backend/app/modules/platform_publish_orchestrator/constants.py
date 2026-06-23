"""Publish Orchestrator lifecycle phases (WI-IMPL-006, ADR-CP-001 / ADR-DEP-001)."""

from __future__ import annotations

from enum import Enum


class PublishPhase(str, Enum):
  """Normative publish orchestration phases."""

  VALIDATING = "validating"
  DEPLOYMENT_CREATED = "deployment_created"
  MATERIALIZATION_PENDING = "materialization_pending"
  VERIFY_PENDING = "verify_pending"
  VERIFY_PASSED = "verify_passed"
  VERIFY_FAILED = "verify_failed"
  ACTIVATING = "activating"
  ACTIVATED = "activated"
  ACTIVATION_FAILED = "activation_failed"
  ACTIVATION_PENDING = "activation_pending"
  VERSION_PIN_PENDING = "version_pin_pending"
  VERSION_PINNING = "version_pinning"
  VERSION_PINNED = "version_pinned"
  VERSION_PIN_FAILED = "version_pin_failed"
  AUDIT_PENDING = "audit_pending"
  COMPLETED = "completed"
  FAILED = "failed"


class PublishOrchestratorStatus(str, Enum):
  """Top-level orchestrator run status."""

  IN_PROGRESS = "in_progress"
  COMPLETED = "completed"
  FAILED = "failed"


class PublishExtensionStatus(str, Enum):
  """Status for stub extension point invocations."""

  NOT_IMPLEMENTED = "not_implemented"
  SKIPPED = "skipped"
  COMPLETED = "completed"
  FAILED = "failed"


PUBLISH_ORCHESTRATOR_MANIFEST_KEY = "publish_orchestrator"
