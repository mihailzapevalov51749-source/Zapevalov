from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import repository
from app.modules.platform.runtime.catalog.schemas import (
    RuntimeCatalogPayload,
    RuntimeCatalogVersionInfo,
)
from app.modules.platform.shared.exceptions import CatalogNotFound


def get_latest_catalog(db: Session, tenant_id: int) -> RuntimeCatalogPayload:
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published catalog не найден для tenant",
        )

    payload = snapshot.payload or {}

    return RuntimeCatalogPayload(
        schema_version=payload.get("schema_version", snapshot.schema_version),
        catalog_version=payload.get("catalog_version", snapshot.catalog_version),
        tenant_id=payload.get("tenant_id", tenant_id),
        published_at=payload.get("published_at", snapshot.published_at.isoformat()),
        object_types=payload.get("object_types", []),
        relations=payload.get("relations", []),
    )


def get_catalog_version_info(
    db: Session,
    tenant_id: int,
) -> RuntimeCatalogVersionInfo:
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published catalog не найден для tenant",
        )

    return RuntimeCatalogVersionInfo(
        tenant_id=tenant_id,
        catalog_version=snapshot.catalog_version,
        schema_version=snapshot.schema_version,
        published_at=snapshot.published_at,
        payload_hash=snapshot.payload_hash,
    )


@dataclass(frozen=True)
class PublishedObjectTypeMetadata:
    tenant_id: int
    catalog_version: int
    object_type_id: UUID
    object_type_key: str
    fields: list[dict[str, Any]]


def get_published_object_type_metadata(
    db: Session,
    tenant_id: int,
    object_type_key: str,
) -> PublishedObjectTypeMetadata:
    """Resolve object type + fields from latest published snapshot only."""
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise CatalogNotFound(f"Published catalog не найден для tenant {tenant_id}")

    payload = snapshot.payload or {}
    catalog_version = payload.get("catalog_version", snapshot.catalog_version)

    for object_type in payload.get("object_types", []):
        if object_type.get("key") != object_type_key:
            continue

        raw_id = object_type.get("id")
        if not raw_id:
            break

        return PublishedObjectTypeMetadata(
            tenant_id=tenant_id,
            catalog_version=catalog_version,
            object_type_id=UUID(str(raw_id)),
            object_type_key=object_type_key,
            fields=list(object_type.get("fields") or []),
        )

    raise CatalogNotFound(
        f"ObjectType '{object_type_key}' не найден в published catalog "
        f"для tenant {tenant_id}",
    )


@dataclass(frozen=True)
class PublishedRelationMetadata:
    tenant_id: int
    catalog_version: int
    relation_id: UUID
    relation_key: str
    relation_type: str
    source_object_type_key: str
    target_object_type_key: str
    is_active: bool


def get_published_relation_metadata(
    db: Session,
    tenant_id: int,
    relation_key: str,
) -> PublishedRelationMetadata:
    """Resolve relation definition from latest published snapshot only."""
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        raise CatalogNotFound(f"Published catalog не найден для tenant {tenant_id}")

    payload = snapshot.payload or {}
    catalog_version = payload.get("catalog_version", snapshot.catalog_version)

    for relation in payload.get("relations", []):
        if relation.get("key") != relation_key:
            continue

        raw_id = relation.get("id")
        if not raw_id:
            break

        return PublishedRelationMetadata(
            tenant_id=tenant_id,
            catalog_version=catalog_version,
            relation_id=UUID(str(raw_id)),
            relation_key=relation_key,
            relation_type=str(relation.get("relation_type", "")),
            source_object_type_key=str(relation.get("source_object_type_key", "")),
            target_object_type_key=str(relation.get("target_object_type_key", "")),
            is_active=bool(relation.get("is_active", True)),
        )

    raise CatalogNotFound(
        f"Relation '{relation_key}' не найдена в published catalog "
        f"для tenant {tenant_id}",
    )
