"""Service layer for platform module manifests."""

from __future__ import annotations

from sqlalchemy.orm import Session

from typing import Any

from app.modules.platform_modules import manifest_crud
from app.modules.platform_modules.manifest_schemas import PlatformModuleManifestOut
from app.modules.platform_modules.settings_schema import (
    get_module_settings_schema,
    validate_settings_schema,
)


def list_platform_module_manifests(db: Session) -> list[PlatformModuleManifestOut]:
    return [
        PlatformModuleManifestOut.model_validate(item)
        for item in manifest_crud.list_platform_module_manifests(db)
    ]


def get_platform_module_manifest(
    db: Session,
    module_key: str,
) -> PlatformModuleManifestOut | None:
    manifest = manifest_crud.get_active_manifest_for_module(db, module_key)
    if manifest is None:
        return None
    return PlatformModuleManifestOut.model_validate(manifest)


def get_platform_module_settings_schema(
    db: Session,
    module_key: str,
) -> dict[str, Any] | None:
    manifest = manifest_crud.get_active_manifest_for_module(db, module_key)
    if manifest is not None and manifest.settings_schema:
        schema = dict(manifest.settings_schema)
        validate_settings_schema(schema, expected_module_key=module_key)
        return schema

    schema = get_module_settings_schema(module_key)
    if schema is None:
        return None

    validate_settings_schema(schema, expected_module_key=module_key)
    return schema
