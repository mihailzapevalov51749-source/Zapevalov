"""Lightweight provenance snapshots for verification without ORM coupling."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_release_package_registry.models import PlatformReleasePackage


@dataclass(frozen=True)
class BuildSnapshot:
    id: int
    build_key: str
    commit_sha: str
    backend_digest: str | None = None
    frontend_digest: str | None = None
    schema_revision: str | None = None


@dataclass(frozen=True)
class PackageSnapshot:
    id: int
    package_key: str
    platform_version: str
    build_id: int
    package_manifest_json: dict[str, Any]
    module_bom_json: dict[str, Any]


def build_snapshot_from_orm(build: PlatformCodeBuild) -> BuildSnapshot:
    return BuildSnapshot(
        id=build.id,
        build_key=build.build_key,
        commit_sha=build.commit_sha,
        backend_digest=build.backend_digest,
        frontend_digest=build.frontend_digest,
        schema_revision=build.schema_revision,
    )


def package_snapshot_from_orm(package: PlatformReleasePackage) -> PackageSnapshot:
    manifest = package.package_manifest_json if isinstance(package.package_manifest_json, dict) else {}
    module_bom = package.module_bom_json if isinstance(package.module_bom_json, dict) else {}
    return PackageSnapshot(
        id=package.id,
        package_key=package.package_key,
        platform_version=package.platform_version,
        build_id=package.build_id,
        package_manifest_json=manifest,
        module_bom_json=module_bom,
    )
