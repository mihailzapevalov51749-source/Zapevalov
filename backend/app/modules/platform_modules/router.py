"""Read-only API for platform modules registry."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_modules import manifest_service, service
from app.modules.platform_modules.manifest_schemas import PlatformModuleManifestOut
from app.modules.platform_modules.schemas import PlatformModuleOut
from app.modules.platform_modules.version_schemas import PlatformModuleVersionDetailOut, PlatformModuleVersionOut
from app.modules.platform_modules import version_service
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/modules",
    tags=["Platform Modules"],
)


@router.get("", response_model=list[PlatformModuleOut])
def list_platform_modules_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_platform_modules(db)


@router.get("/{module_key}/manifest", response_model=PlatformModuleManifestOut)
def get_platform_module_manifest_endpoint(
    module_key: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    manifest = manifest_service.get_platform_module_manifest(db, module_key)
    if manifest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Манифест модуля не найден",
        )
    return manifest


@router.get("/{module_key}/versions", response_model=list[PlatformModuleVersionOut])
def list_module_versions_endpoint(
    module_key: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    module = service.get_platform_module(db, module_key)
    if module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Модуль платформы не найден",
        )
    return version_service.list_module_versions(db, module_key)


@router.get("/{module_key}/latest-version", response_model=PlatformModuleVersionDetailOut)
def get_latest_module_version_endpoint(
    module_key: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    module = service.get_platform_module(db, module_key)
    if module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Модуль платформы не найден",
        )
    latest = version_service.get_latest_module_version(db, module_key)
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Версии модуля не найдены",
        )
    return latest


@router.get("/{module_key}/settings-schema")
def get_platform_module_settings_schema_endpoint(
    module_key: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
) -> dict[str, Any]:
    schema = manifest_service.get_platform_module_settings_schema(db, module_key)
    if schema is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings schema модуля не найдена",
        )
    return schema


@router.get("/{module_key}", response_model=PlatformModuleOut)
def get_platform_module_endpoint(
    module_key: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    module = service.get_platform_module(db, module_key)
    if module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Модуль платформы не найден",
        )
    return module
