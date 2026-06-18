"""Business logic for platform module publications."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_module_publications.constants import (
    GENERATOR_SOURCE,
    PUBLICATION_IMMUTABLE_STATUSES,
    PUBLICATION_PUBLISH_SOURCE_STATUSES,
    PUBLICATION_REVIEW_ACTION_STATUSES,
    PUBLICATION_REVIEW_SOURCE_STATUSES,
    PUBLICATION_SUBMIT_SOURCE_STATUSES,
    PlatformModulePublicationStatus,
    PlatformModulePublicationType,
    TENANT_EVENT_CODE_MODULE_PUBLICATION_PUBLISHED,
)
from app.modules.platform_module_publications.crud import (
    get_publication,
    list_publications,
    list_publications_for_source_tenant,
)
from app.modules.platform_module_publications.exceptions import PublicationPreconditionError
from app.modules.platform_module_publications.models import PlatformModulePublication
from app.modules.platform_module_publications.snapshot import build_publication_snapshot
from app.modules.platform_release.constants import EXCLUDED_OFFER_TENANT_TYPES
from app.modules.platform_release.dependencies import assert_reviewer_action
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_management.exceptions import TenantWriteForbiddenError
from app.modules.tenant_management.tenant_write_policy import (
    assert_tenant_allows_publish_source,
    assert_tenant_allows_publish_target,
)
from app.modules.tenant_module_configuration_diffs.diff_generator import (
    diff_flat_block,
    diff_permissions_block,
    diff_templates_block,
)
from app.modules.tenant_module_configuration_diffs.risk_analysis import compute_configuration_diff_risk_level
from app.modules.tenant_module_configurations.constants import MANIFEST_DEFAULTS_SOURCE
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.models import TenantModuleConfiguration
from app.modules.tenant_module_configurations.runtime.cache import (
    invalidate_runtime_module_configuration_cache,
)
from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus
from app.modules.tenant_module_update_offers.generator import is_version_less
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_configuration_diffs.generator import (
    generate_configuration_diff_for_offer,
)
from app.modules.tenant_module_update_previews.generator import regenerate_preview_after_offer_change
from app.modules.tenant_modules.crud import get_tenant_module
from app.modules.tenant_modules.models import TenantModule
from app.modules.users.models import User


def _resolve_module_title(db: Session, module_key: str) -> str | None:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    if module is None:
        return None
    return str(module.title or module_key)


def _resolve_tenant_name(db: Session, tenant_id: int) -> str | None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    return portal.name if portal is not None else None


def _resolve_user_name(db: Session, user_id: int | None) -> str | None:
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        return None
    return user.full_name or user.email


def _publication_to_dict(db: Session, publication: PlatformModulePublication) -> dict[str, Any]:
    snapshot = publication.snapshot_payload if isinstance(publication.snapshot_payload, dict) else {}
    return {
        "id": publication.id,
        "module_key": publication.module_key,
        "module_title": _resolve_module_title(db, publication.module_key),
        "source_tenant_id": publication.source_tenant_id,
        "source_tenant_name": _resolve_tenant_name(db, publication.source_tenant_id),
        "target_tenant_id": publication.target_tenant_id,
        "target_tenant_name": _resolve_tenant_name(db, publication.target_tenant_id),
        "from_module_version": publication.from_module_version,
        "to_module_version": publication.to_module_version,
        "from_config_version": publication.from_config_version,
        "to_config_version": publication.to_config_version,
        "manifest_version": publication.manifest_version,
        "publication_status": publication.publication_status,
        "publication_type": publication.publication_type,
        "release_summary": publication.release_summary,
        "risk_level": publication.risk_level,
        "created_by": publication.created_by,
        "created_by_name": _resolve_user_name(db, publication.created_by),
        "reviewed_by": publication.reviewed_by,
        "reviewed_by_name": _resolve_user_name(db, publication.reviewed_by),
        "approved_by": publication.approved_by,
        "approved_by_name": _resolve_user_name(db, publication.approved_by),
        "created_at": publication.created_at,
        "review_started_at": publication.review_started_at,
        "approved_at": publication.approved_at,
        "published_at": publication.published_at,
        "notes": publication.notes,
        "snapshot_payload": snapshot,
    }


def _compute_review_diff(
    db: Session,
    publication: PlatformModulePublication,
) -> dict[str, Any]:
    template_configuration = get_configuration(
        db,
        tenant_id=int(publication.target_tenant_id),
        module_key=str(publication.module_key),
    )
    snapshot = publication.snapshot_payload if isinstance(publication.snapshot_payload, dict) else {}

    current_settings = dict(template_configuration.settings or {}) if template_configuration else {}
    current_permissions = dict(template_configuration.permissions or {}) if template_configuration else {}
    current_views = dict(template_configuration.views or {}) if template_configuration else {}
    current_rules = dict(template_configuration.rules or {}) if template_configuration else {}
    current_templates = dict(template_configuration.templates or {}) if template_configuration else {}

    return {
        "settings": diff_flat_block(current_settings, snapshot.get("settings")),
        "permissions": diff_permissions_block(current_permissions, snapshot.get("permissions")),
        "views": diff_flat_block(current_views, snapshot.get("views")),
        "rules": diff_flat_block(current_rules, snapshot.get("rules")),
        "templates": diff_templates_block(current_templates, snapshot.get("templates")),
    }


def _get_publication_or_404(db: Session, publication_id: int) -> PlatformModulePublication:
    publication = get_publication(db, publication_id)
    if publication is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Публикация модуля не найдена")
    return publication


def _assert_status(publication: PlatformModulePublication, allowed: frozenset[str], action: str) -> None:
    if publication.publication_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Нельзя выполнить {action} для статуса {publication.publication_status}",
        )


def list_all_publications(db: Session) -> list[dict[str, Any]]:
    return [_publication_to_dict(db, row) for row in list_publications(db)]


def list_dev_publications(db: Session, *, source_tenant_id: int) -> list[dict[str, Any]]:
    return [
        _publication_to_dict(db, row)
        for row in list_publications_for_source_tenant(db, source_tenant_id=source_tenant_id)
    ]


def get_publication_detail(db: Session, publication_id: int) -> dict[str, Any]:
    publication = _get_publication_or_404(db, publication_id)
    payload = _publication_to_dict(db, publication)
    diff_payload = _compute_review_diff(db, publication)
    manifest = get_active_manifest_for_module(db, publication.module_key)
    payload["configuration_diff"] = diff_payload
    payload["manifest"] = {
        "module_key": publication.module_key,
        "manifest_version": publication.manifest_version,
        "settings_schema": manifest.settings_schema if manifest is not None else {},
    }
    if publication.risk_level is None:
        publication.risk_level = compute_configuration_diff_risk_level(diff_payload)
        db.flush()
        payload["risk_level"] = publication.risk_level
    return payload


def create_publication(
    db: Session,
    *,
    module_key: str,
    actor: User,
    release_summary: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id

    dev_tenant_id = resolve_dev_tenant_portal_id(db)
    if dev_tenant_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="DEV tenant не найден")

    try:
        assert_tenant_allows_publish_source(db, int(dev_tenant_id))
    except TenantWriteForbiddenError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error

    try:
        snapshot_meta = build_publication_snapshot(
            db,
            source_tenant_id=int(dev_tenant_id),
            module_key=module_key,
        )
    except PublicationPreconditionError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error.message) from error

    now = datetime.utcnow()
    publication = PlatformModulePublication(
        module_key=module_key,
        source_tenant_id=int(dev_tenant_id),
        target_tenant_id=int(snapshot_meta["target_tenant_id"]),
        from_module_version=str(snapshot_meta["from_module_version"]),
        to_module_version=str(snapshot_meta["to_module_version"]),
        from_config_version=str(snapshot_meta["from_config_version"]),
        to_config_version=str(snapshot_meta["to_config_version"]),
        manifest_version=str(snapshot_meta["manifest_version"]),
        publication_status=PlatformModulePublicationStatus.DRAFT,
        publication_type=PlatformModulePublicationType.MODULE_CONFIGURATION,
        release_summary=release_summary,
        snapshot_payload=dict(snapshot_meta["snapshot_payload"]),
        created_by=int(actor.id) if actor.id else None,
        created_at=now,
        notes=notes,
    )
    db.add(publication)
    db.flush()

    diff_payload = _compute_review_diff(db, publication)
    publication.risk_level = compute_configuration_diff_risk_level(diff_payload)
    db.commit()
    db.refresh(publication)
    return _publication_to_dict(db, publication)


def submit_publication_for_review(
    db: Session,
    *,
    publication_id: int,
    actor: User,
) -> dict[str, Any]:
    publication = _get_publication_or_404(db, publication_id)
    _assert_status(publication, PUBLICATION_SUBMIT_SOURCE_STATUSES, "submit_for_review")
    publication.publication_status = PlatformModulePublicationStatus.READY_FOR_REVIEW
    publication.notes = publication.notes or f"submitted_by={actor.id}"
    db.commit()
    db.refresh(publication)
    return _publication_to_dict(db, publication)


def start_publication_review(
    db: Session,
    *,
    publication_id: int,
    actor: User,
) -> dict[str, Any]:
    assert_reviewer_action(actor)
    publication = _get_publication_or_404(db, publication_id)
    _assert_status(publication, PUBLICATION_REVIEW_SOURCE_STATUSES, "start_review")
    publication.publication_status = PlatformModulePublicationStatus.IN_REVIEW
    publication.review_started_at = datetime.utcnow()
    publication.reviewed_by = int(actor.id) if actor.id else None
    db.commit()
    db.refresh(publication)
    return _publication_to_dict(db, publication)


def approve_publication(
    db: Session,
    *,
    publication_id: int,
    actor: User,
    notes: str | None = None,
) -> dict[str, Any]:
    assert_reviewer_action(actor)
    publication = _get_publication_or_404(db, publication_id)
    _assert_status(publication, PUBLICATION_REVIEW_ACTION_STATUSES, "approve")
    publication.publication_status = PlatformModulePublicationStatus.APPROVED
    publication.approved_by = int(actor.id) if actor.id else None
    publication.approved_at = datetime.utcnow()
    if notes:
        publication.notes = notes
    db.commit()
    db.refresh(publication)
    return _publication_to_dict(db, publication)


def reject_publication(
    db: Session,
    *,
    publication_id: int,
    actor: User,
    notes: str | None = None,
) -> dict[str, Any]:
    assert_reviewer_action(actor)
    publication = _get_publication_or_404(db, publication_id)
    _assert_status(publication, PUBLICATION_REVIEW_ACTION_STATUSES, "reject")
    publication.publication_status = PlatformModulePublicationStatus.REJECTED
    publication.reviewed_by = int(actor.id) if actor.id else None
    if notes:
        publication.notes = notes
    db.commit()
    db.refresh(publication)
    return _publication_to_dict(db, publication)


def _apply_snapshot_to_template(db: Session, publication: PlatformModulePublication) -> None:
    snapshot = publication.snapshot_payload if isinstance(publication.snapshot_payload, dict) else {}
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Snapshot публикации пуст")

    template_tenant_id = int(publication.target_tenant_id)
    try:
        assert_tenant_allows_publish_target(db, template_tenant_id)
    except TenantWriteForbiddenError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error

    module_key = str(publication.module_key)
    configuration = get_configuration(db, tenant_id=template_tenant_id, module_key=module_key)
    now = datetime.utcnow()

    if configuration is None:
        configuration = TenantModuleConfiguration(
            tenant_id=template_tenant_id,
            module_key=module_key,
            module_version=publication.to_module_version,
            config_version=publication.to_config_version,
            schema_version=str(snapshot.get("schema_version") or publication.to_config_version),
            settings=dict(snapshot.get("settings") or {}),
            permissions=dict(snapshot.get("permissions") or {}),
            views=dict(snapshot.get("views") or {}),
            rules=dict(snapshot.get("rules") or {}),
            templates=dict(snapshot.get("templates") or {}),
            source=MANIFEST_DEFAULTS_SOURCE,
            created_at=now,
            updated_at=now,
        )
        db.add(configuration)
    else:
        configuration.settings = dict(snapshot.get("settings") or {})
        configuration.permissions = dict(snapshot.get("permissions") or {})
        configuration.views = dict(snapshot.get("views") or {})
        configuration.rules = dict(snapshot.get("rules") or {})
        configuration.templates = dict(snapshot.get("templates") or {})
        configuration.module_version = publication.to_module_version
        configuration.config_version = publication.to_config_version
        configuration.schema_version = str(snapshot.get("schema_version") or publication.to_config_version)
        configuration.source = str(snapshot.get("source") or MANIFEST_DEFAULTS_SOURCE)
        configuration.updated_at = now

    tenant_module = get_tenant_module(db, tenant_id=template_tenant_id, module_key=module_key)
    if tenant_module is None:
        tenant_module = TenantModule(
            tenant_id=template_tenant_id,
            portal_id=template_tenant_id,
            module_key=module_key,
            installed_version=publication.to_module_version,
            enabled=True,
            source=GENERATOR_SOURCE,
            created_at=now,
            updated_at=now,
        )
        db.add(tenant_module)
    else:
        tenant_module.installed_version = publication.to_module_version
        tenant_module.updated_at = now

    invalidate_runtime_module_configuration_cache(template_tenant_id, module_key)


def _generate_client_offers_from_publication(
    db: Session,
    publication: PlatformModulePublication,
) -> dict[str, Any]:
    now = datetime.utcnow()
    created_offer_ids: list[int] = []
    tenant_ids: list[int] = []

    client_portals = (
        db.query(Portal)
        .filter(Portal.tenant_type == TenantType.CLIENT.value)
        .filter(Portal.tenant_status == TenantStatus.ACTIVE.value)
        .order_by(Portal.id.asc())
        .all()
    )

    release_summary = (
        publication.release_summary
        or f"Published module configuration {publication.module_key} "
        f"{publication.from_module_version} → {publication.to_module_version}"
    )

    for portal in client_portals:
        tenant_type = str(portal.tenant_type or "").upper()
        if tenant_type in EXCLUDED_OFFER_TENANT_TYPES:
            continue

        tenant_module = get_tenant_module(
            db,
            tenant_id=int(portal.id),
            module_key=str(publication.module_key),
        )
        installed_version = (
            str(tenant_module.installed_version)
            if tenant_module is not None
            else publication.from_module_version
        )

        if not is_version_less(installed_version, publication.to_module_version):
            continue

        existing = (
            db.query(TenantModuleUpdateOffer)
            .filter(
                TenantModuleUpdateOffer.tenant_id == portal.id,
                TenantModuleUpdateOffer.module_key == publication.module_key,
                TenantModuleUpdateOffer.status == TenantModuleUpdateOfferStatus.AVAILABLE,
            )
            .all()
        )
        for row in existing:
            row.status = TenantModuleUpdateOfferStatus.WITHDRAWN
            row.updated_at = now

        offer = TenantModuleUpdateOffer(
            tenant_id=int(portal.id),
            module_key=str(publication.module_key),
            from_version=installed_version,
            to_version=str(publication.to_module_version),
            release_id=None,
            publication_id=int(publication.id),
            status=TenantModuleUpdateOfferStatus.AVAILABLE,
            offered_at=now,
            change_summary=release_summary,
            notes=f"Generated by {GENERATOR_SOURCE}; publication_id={publication.id}",
            created_at=now,
            updated_at=now,
        )
        db.add(offer)
        db.flush()
        regenerate_preview_after_offer_change(db, offer, commit=False)
        generate_configuration_diff_for_offer(db, offer, commit=False)
        created_offer_ids.append(int(offer.id))
        tenant_ids.append(int(portal.id))

    return {
        "offers_created": len(created_offer_ids),
        "offer_ids": created_offer_ids,
        "tenant_ids": tenant_ids,
    }


def publish_publication_to_template(
    db: Session,
    *,
    publication_id: int,
    actor: User,
) -> dict[str, Any]:
    assert_reviewer_action(actor)
    publication = _get_publication_or_404(db, publication_id)

    if publication.publication_status == PlatformModulePublicationStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Публикация уже опубликована",
        )

    _assert_status(publication, PUBLICATION_PUBLISH_SOURCE_STATUSES, "publish")

    try:
        assert_tenant_allows_publish_source(db, int(publication.source_tenant_id))
        assert_tenant_allows_publish_target(db, int(publication.target_tenant_id))
    except TenantWriteForbiddenError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error

    _apply_snapshot_to_template(db, publication)
    offer_stats = _generate_client_offers_from_publication(db, publication)

    publication.publication_status = PlatformModulePublicationStatus.PUBLISHED
    publication.published_at = datetime.utcnow()
    db.commit()
    db.refresh(publication)

    return {
        "publication": _publication_to_dict(db, publication),
        "template_tenant_id": publication.target_tenant_id,
        "offers_created": offer_stats["offers_created"],
        "offer_ids": offer_stats["offer_ids"],
        "tenant_ids": offer_stats["tenant_ids"],
    }
