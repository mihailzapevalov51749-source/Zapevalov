"""Generate and persist tenant module configuration diffs."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.tenant_module_configurations.constants import DEFAULT_CONFIG_VERSION
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.validation import is_usable_settings_schema
from app.modules.tenant_module_configuration_diffs.diff_generator import (
    build_target_configuration_from_schema,
    generate_configuration_diff_payload,
)
from app.modules.tenant_module_configuration_diffs import crud as diff_crud
from app.modules.tenant_module_configuration_diffs.models import TenantModuleConfigurationDiff
from app.modules.tenant_module_configuration_diffs.preview_integration import apply_diff_to_preview_payload
from app.modules.tenant_module_configuration_diffs.publication_diff import (
    build_target_configuration_from_publication_snapshot,
)
from app.modules.tenant_module_configuration_diffs.risk_analysis import compute_configuration_diff_risk_level
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer

logger = logging.getLogger(__name__)


def resolve_target_configuration_for_offer(
    db: Session,
    offer: TenantModuleUpdateOffer,
) -> dict[str, Any] | None:
    """Publication offers use snapshot; release offers use manifest defaults."""
    if getattr(offer, "publication_id", None):
        from app.modules.platform_module_publications.crud import get_publication

        publication = get_publication(db, int(offer.publication_id))
        snapshot = publication.snapshot_payload if publication is not None else None
        if not isinstance(snapshot, dict) or not snapshot:
            logger.warning(
                "Skip publication diff: snapshot missing publication_id=%s offer_id=%s",
                offer.publication_id,
                offer.id,
            )
            return None
        return build_target_configuration_from_publication_snapshot(snapshot)

    manifest = get_active_manifest_for_module(db, str(offer.module_key))
    if manifest is None or not is_usable_settings_schema(manifest.settings_schema):
        logger.warning(
            "Skip configuration diff: manifest schema unavailable tenant_id=%s module_key=%s offer_id=%s",
            offer.tenant_id,
            offer.module_key,
            offer.id,
        )
        return None
    return build_target_configuration_from_schema(dict(manifest.settings_schema or {}))


def build_configuration_diff_payload_for_offer(
    db: Session,
    offer: TenantModuleUpdateOffer,
    *,
    target_configuration: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    configuration = get_configuration(
        db,
        tenant_id=int(offer.tenant_id),
        module_key=str(offer.module_key),
    )
    if configuration is None:
        logger.warning(
            "Skip configuration diff: tenant config missing tenant_id=%s module_key=%s offer_id=%s",
            offer.tenant_id,
            offer.module_key,
            offer.id,
        )
        return None

    if target_configuration is None:
        target_configuration = resolve_target_configuration_for_offer(db, offer)
        if target_configuration is None:
            return None

    diff_payload = generate_configuration_diff_payload(
        current_configuration=configuration,
        target_configuration=target_configuration,
    )
    risk_level = compute_configuration_diff_risk_level(diff_payload)

    return {
        "tenant_id": int(offer.tenant_id),
        "module_key": str(offer.module_key),
        "offer_id": int(offer.id),
        "release_id": offer.release_id,
        "from_module_version": str(offer.from_version or configuration.module_version or "1.0.0"),
        "to_module_version": str(offer.to_version or offer.from_version or "1.0.0"),
        "from_config_version": str(configuration.config_version or DEFAULT_CONFIG_VERSION),
        "to_config_version": str(target_configuration.get("schema_version") or DEFAULT_CONFIG_VERSION),
        "diff_payload": diff_payload,
        "risk_level": risk_level,
    }


def generate_configuration_diff_for_offer(
    db: Session,
    offer: TenantModuleUpdateOffer,
    *,
    target_configuration: dict[str, Any] | None = None,
    commit: bool = False,
) -> dict[str, TenantModuleConfigurationDiff | None | str]:
    if offer.id is not None:
        existing = diff_crud.get_latest_diff_for_offer(
            db,
            tenant_id=int(offer.tenant_id),
            offer_id=int(offer.id),
        )
        if existing is not None:
            return {"status": "exists", "diff": existing}

    payload = build_configuration_diff_payload_for_offer(
        db,
        offer,
        target_configuration=target_configuration,
    )
    if payload is None:
        return {"status": "skipped", "diff": None}

    now = datetime.utcnow()
    diff = TenantModuleConfigurationDiff(
        tenant_id=payload["tenant_id"],
        module_key=payload["module_key"],
        offer_id=payload["offer_id"],
        release_id=payload["release_id"],
        from_module_version=payload["from_module_version"],
        to_module_version=payload["to_module_version"],
        from_config_version=payload["from_config_version"],
        to_config_version=payload["to_config_version"],
        diff_payload=payload["diff_payload"],
        risk_level=payload["risk_level"],
        generated_at=now,
    )
    db.add(diff)
    db.flush()

    if commit:
        db.commit()

    return {"status": "created", "diff": diff}


def enrich_preview_payload_with_configuration_diff(
    db: Session,
    offer: TenantModuleUpdateOffer,
    payload: dict[str, Any],
    *,
    target_configuration: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if target_configuration is None and getattr(offer, "publication_id", None):
        target_configuration = resolve_target_configuration_for_offer(db, offer)

    result = generate_configuration_diff_for_offer(
        db,
        offer,
        target_configuration=target_configuration,
        commit=False,
    )
    diff = result.get("diff")
    if diff is None:
        return payload

    return apply_diff_to_preview_payload(
        payload,
        diff.diff_payload if isinstance(diff.diff_payload, dict) else {},
        risk_level=str(diff.risk_level or compute_configuration_diff_risk_level(diff.diff_payload)),
    )


def backfill_configuration_diffs_for_offers(
    db: Session,
    *,
    tenant_ids: list[int] | None = None,
    commit: bool = True,
) -> dict[str, int | list[str]]:
    from app.modules.tenant_module_update_offers import crud as offers_crud
    from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus

    totals: dict[str, int | list[str]] = {
        "created": 0,
        "skipped": 0,
        "offers": 0,
        "skipped_reasons": [],
    }

    query = db.query(TenantModuleUpdateOffer).filter(
        TenantModuleUpdateOffer.status == TenantModuleUpdateOfferStatus.AVAILABLE
    )
    if tenant_ids:
        query = query.filter(TenantModuleUpdateOffer.tenant_id.in_(tenant_ids))

    for offer in query.order_by(TenantModuleUpdateOffer.id.asc()).all():
        totals["offers"] = int(totals["offers"]) + 1
        result = generate_configuration_diff_for_offer(db, offer, commit=False)
        status = str(result.get("status") or "skipped")
        if status == "created":
            totals["created"] = int(totals["created"]) + 1
        else:
            totals["skipped"] = int(totals["skipped"]) + 1
            skipped_reasons = totals["skipped_reasons"]
            assert isinstance(skipped_reasons, list)
            entry = f"tenant={offer.tenant_id} module={offer.module_key} offer={offer.id}"
            if entry not in skipped_reasons:
                skipped_reasons.append(entry)

    if commit:
        db.commit()

    return totals


def backfill_publication_configuration_diffs(
    db: Session,
    *,
    commit: bool = True,
) -> dict[str, int]:
    """Create missing diffs for available publication offers; patch preview metadata only."""
    from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus
    from app.modules.tenant_module_update_previews import crud as preview_crud

    totals = {
        "offers_scanned": 0,
        "diffs_created": 0,
        "diffs_existing": 0,
        "diffs_skipped": 0,
        "previews_patched": 0,
    }

    offers = (
        db.query(TenantModuleUpdateOffer)
        .filter(TenantModuleUpdateOffer.publication_id.isnot(None))
        .filter(TenantModuleUpdateOffer.status == TenantModuleUpdateOfferStatus.AVAILABLE)
        .order_by(TenantModuleUpdateOffer.id.asc())
        .all()
    )

    for offer in offers:
        totals["offers_scanned"] += 1
        result = generate_configuration_diff_for_offer(db, offer, commit=False)
        status = str(result.get("status") or "skipped")
        if status == "created":
            totals["diffs_created"] += 1
        elif status == "exists":
            totals["diffs_existing"] += 1
        else:
            totals["diffs_skipped"] += 1
            continue

        diff = result.get("diff")
        if diff is None:
            continue

        preview = preview_crud.get_current_preview_for_offer(
            db,
            tenant_id=int(offer.tenant_id),
            offer_id=int(offer.id),
        )
        if preview is None:
            continue

        impact_analysis = dict(preview.impact_analysis or {})
        if impact_analysis.get("configuration_diff"):
            continue

        patched_payload = apply_diff_to_preview_payload(
            {"impact_analysis": impact_analysis, "risk_level": preview.risk_level},
            diff.diff_payload if isinstance(diff.diff_payload, dict) else {},
            risk_level=str(diff.risk_level or preview.risk_level),
        )
        preview.impact_analysis = patched_payload.get("impact_analysis") or impact_analysis
        preview.risk_level = str(patched_payload.get("risk_level") or preview.risk_level)
        preview.affected_settings = patched_payload.get("affected_settings") or preview.affected_settings
        preview.affected_permissions = patched_payload.get("affected_permissions") or preview.affected_permissions
        preview.affected_views = patched_payload.get("affected_views") or preview.affected_views
        preview.affected_rules = patched_payload.get("affected_rules") or preview.affected_rules
        preview.affected_templates = patched_payload.get("affected_templates") or preview.affected_templates
        totals["previews_patched"] += 1

    if commit:
        db.commit()

    return totals
