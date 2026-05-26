from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.platform.designer.publish import repository
from app.modules.platform.designer.publish.draft_loader import load_tenant_draft_catalog
from app.modules.platform.designer.publish.models import (
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.platform.designer.publish.schemas import (
    PublishHistoryItem,
    PublishLatestInfo,
    PublishResult,
    PublishSummaryCounts,
    PublishValidationReport,
)
from app.modules.platform.designer.publish.snapshot_builder import (
    SCHEMA_VERSION,
    build_snapshot_payload,
    compute_payload_hash,
)
from app.modules.platform.designer.publish.validators import validate_tenant_draft_catalog
from app.modules.platform.shared.enums import PublishStatus
from app.modules.users.models import User


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


def _summary_from_report(report: PublishValidationReport) -> dict:
    return report.summary.model_dump()


def validate_publish(db: Session, tenant_id: int) -> PublishValidationReport:
    catalog = load_tenant_draft_catalog(db, tenant_id)
    return validate_tenant_draft_catalog(catalog)


def _create_failed_publish_record(
    db: Session,
    tenant_id: int,
    report: PublishValidationReport,
    current_user: User | None,
) -> DesignerPublishRecord:
    record = DesignerPublishRecord(
        id=uuid4(),
        tenant_id=tenant_id,
        snapshot_id=None,
        catalog_version=None,
        status=PublishStatus.FAILED.value,
        summary_json=_summary_from_report(report),
        error_json={
            "errors": [issue.model_dump() for issue in report.errors],
            "warnings": [issue.model_dump() for issue in report.warnings],
        },
        published_by=_actor_user_id(current_user),
        published_at=datetime.now(timezone.utc),
    )
    return repository.insert_publish_record(db, record)


def publish_tenant_catalog(
    db: Session,
    tenant_id: int,
    current_user: User | None,
) -> PublishResult:
    catalog = load_tenant_draft_catalog(db, tenant_id)
    report = validate_tenant_draft_catalog(catalog)

    if not report.valid:
        _create_failed_publish_record(db, tenant_id, report, current_user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=report.model_dump(),
        )

    published_at = datetime.now(timezone.utc)
    user_id = _actor_user_id(current_user)

    try:
        next_catalog_version = repository.get_max_catalog_version(db, tenant_id) + 1

        payload = build_snapshot_payload(
            tenant_id=tenant_id,
            catalog_version=next_catalog_version,
            catalog=catalog,
        )
        payload_hash = compute_payload_hash(payload)

        snapshot = DesignerMetadataSnapshot(
            id=uuid4(),
            tenant_id=tenant_id,
            catalog_version=next_catalog_version,
            schema_version=SCHEMA_VERSION,
            payload=payload,
            payload_hash=payload_hash,
            published_by=user_id,
            published_at=published_at,
        )
        snapshot = repository.insert_snapshot(db, snapshot)

        publish_record = DesignerPublishRecord(
            id=uuid4(),
            tenant_id=tenant_id,
            snapshot_id=snapshot.id,
            catalog_version=next_catalog_version,
            status=PublishStatus.SUCCESS.value,
            summary_json=_summary_from_report(report),
            error_json={},
            published_by=user_id,
            published_at=published_at,
        )
        publish_record = repository.insert_publish_record(db, publish_record)

        repository.touch_object_types_last_published_at(
            db,
            tenant_id,
            published_at=published_at,
        )

        db.commit()
        db.refresh(snapshot)
        db.refresh(publish_record)

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Publish conflict: catalog_version уже существует",
        ) from exc
    except Exception:
        db.rollback()
        raise

    return PublishResult(
        tenant_id=tenant_id,
        catalog_version=snapshot.catalog_version,
        schema_version=snapshot.schema_version,
        snapshot_id=snapshot.id,
        publish_record_id=publish_record.id,
        published_at=snapshot.published_at,
        payload_hash=snapshot.payload_hash,
        summary=report.summary,
    )


def get_latest_publish_info(
    db: Session,
    tenant_id: int,
) -> PublishLatestInfo:
    snapshot = repository.get_latest_snapshot(db, tenant_id)

    if not snapshot:
        return PublishLatestInfo(tenant_id=tenant_id)

    latest_record = repository.get_latest_publish_record(db, tenant_id)

    summary = PublishSummaryCounts()
    if latest_record and latest_record.summary_json:
        summary = PublishSummaryCounts(**latest_record.summary_json)

    return PublishLatestInfo(
        tenant_id=tenant_id,
        catalog_version=snapshot.catalog_version,
        schema_version=snapshot.schema_version,
        snapshot_id=snapshot.id,
        publish_record_id=latest_record.id if latest_record else None,
        status=latest_record.status if latest_record else PublishStatus.SUCCESS.value,
        published_at=snapshot.published_at,
        payload_hash=snapshot.payload_hash,
        summary=summary,
    )


def get_publish_history(
    db: Session,
    tenant_id: int,
) -> list[PublishHistoryItem]:
    records = repository.list_publish_records(db, tenant_id)

    items: list[PublishHistoryItem] = []
    for record in records:
        summary_data = record.summary_json or {}
        items.append(
            PublishHistoryItem(
                id=record.id,
                tenant_id=record.tenant_id,
                snapshot_id=record.snapshot_id,
                catalog_version=record.catalog_version,
                status=record.status,
                summary=PublishSummaryCounts(**summary_data),
                published_at=record.published_at,
                published_by=record.published_by,
            ),
        )

    return items
