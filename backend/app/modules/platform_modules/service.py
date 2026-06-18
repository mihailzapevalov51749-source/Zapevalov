"""Service layer for platform modules registry."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules import crud
from app.modules.platform_modules.constants import resolve_module_dependencies
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.schemas import PlatformModuleOut


def serialize_platform_module(module: PlatformModule) -> PlatformModuleOut:
    payload = PlatformModuleOut.model_validate(module)
    return payload.model_copy(
        update={
            "dependencies": resolve_module_dependencies(module.module_key),
        }
    )


def list_platform_modules(db: Session) -> list[PlatformModuleOut]:
    return [serialize_platform_module(item) for item in crud.list_platform_modules(db)]


def get_platform_module(db: Session, module_key: str) -> PlatformModuleOut | None:
    module = crud.get_platform_module_by_key(db, module_key)
    if module is None:
        return None
    return serialize_platform_module(module)
