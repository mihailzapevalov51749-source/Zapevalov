"""Factories for committed test entities with automatic cleanup registry."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release.models import TenantUpdateOffer
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import Role, User
from tests.support.test_cleanup_context import register_if_active

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def create_test_portal(
    db: Session,
    *,
    name: str | None = None,
    code: str | None = None,
    tenant_type: str = "CLIENT",
) -> Portal:
    tag = _suffix()
    portal = Portal(
        name=name or f"Registry test portal {tag}",
        original_name=name or f"Registry test portal {tag}",
        code=code or f"registry-portal-{tag}",
        tenant_type=tenant_type,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version="1.0.0",
        is_active=True,
    )
    db.add(portal)
    db.flush()
    register_if_active(entity_type="portal", entity_id=portal.id, entity_key=portal.code)
    return portal


def create_test_user(
    db: Session,
    *,
    role: Role,
    tenant_id: int | None = None,
    email_prefix: str = "registry_test",
) -> User:
    user = User(
        email=f"{email_prefix}_{_suffix()}@test.local",
        full_name="Registry Test User",
        hashed_password="hash",
        is_active=True,
        tenant_id=tenant_id,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    register_if_active(entity_type="user", entity_id=user.id, entity_key=user.email)
    return user


def create_test_membership(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    role_key: str = "tenant_user",
) -> TenantUserMembership:
    membership = TenantUserMembership(
        tenant_id=tenant_id,
        user_id=user_id,
        role_key=role_key,
        is_active=True,
    )
    db.add(membership)
    db.flush()
    register_if_active(entity_type="membership", entity_id=membership.id)
    return membership


def create_test_build(db: Session, *, version_label: str | None = None) -> PlatformCodeBuild:
    tag = _suffix()
    build = PlatformCodeBuild(
        build_key=f"regb{tag}"[:32],
        commit_sha=tag * 5,
        status="ready",
    )
    db.add(build)
    db.flush()
    register_if_active(entity_type="build", entity_id=build.id, entity_key=build.build_key)
    return build


def create_test_package(
    db: Session,
    *,
    build_id: int,
    title: str | None = None,
) -> PlatformReleasePackage:
    tag = _suffix()
    package = PlatformReleasePackage(
        package_key=f"regp{tag}"[:32],
        platform_version=f"9.9.9-reg-{tag}",
        build_id=build_id,
        status="draft",
        package_manifest_json={},
        module_bom_json={},
    )
    db.add(package)
    db.flush()
    register_if_active(
        entity_type="package",
        entity_id=package.id,
        entity_key=package.package_key,
    )
    return package


def create_test_deployment(
    db: Session,
    *,
    release_package_id: int,
    target_tenant_id: int,
) -> PlatformDeployment:
    tag = _suffix()
    deployment = PlatformDeployment(
        deployment_key=f"regd{tag}"[:32],
        release_package_id=release_package_id,
        target_environment_type="tenant",
        target_tenant_id=target_tenant_id,
        status="completed",
        target_platform_version=f"9.9.9-reg-{tag}",
    )
    db.add(deployment)
    db.flush()
    register_if_active(entity_type="deployment", entity_id=deployment.id)
    return deployment


def create_test_offer(
    db: Session,
    *,
    tenant_id: int,
    release_id: int,
) -> TenantUpdateOffer:
    offer = TenantUpdateOffer(
        tenant_id=tenant_id,
        release_id=release_id,
        from_version="1.0.0",
        to_version="9.9.9",
        status="available",
    )
    db.add(offer)
    db.flush()
    register_if_active(entity_type="offer", entity_id=offer.id)
    return offer


def create_test_environment_version(
    db: Session,
    *,
    tenant_id: int,
    platform_version: str = "1.0.0",
) -> PlatformEnvironmentVersion:
    row = PlatformEnvironmentVersion(
        tenant_id=tenant_id,
        environment_key="runtime",
        platform_version=platform_version,
        status="active",
    )
    db.add(row)
    db.flush()
    register_if_active(entity_type="environment_version", entity_id=row.id)
    return row


def create_test_version_history(
    db: Session,
    *,
    tenant_id: int,
    platform_version: str = "1.0.0",
) -> PlatformVersionHistory:
    row = PlatformVersionHistory(
        tenant_id=tenant_id,
        environment_key="runtime",
        platform_version=platform_version,
        status="active",
    )
    db.add(row)
    db.flush()
    register_if_active(entity_type="version_history", entity_id=row.id)
    return row


def ensure_test_role(db: Session, name: str = "user") -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role
