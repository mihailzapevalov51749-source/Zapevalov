#!/usr/bin/env python3
"""One-shot demo readiness E2E validation on tenants 1 → 2 → 21."""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.platform_module_publications.constants import PlatformModulePublicationStatus
from app.modules.platform_module_publications.crud import get_publication
from app.modules.platform_module_publications.service import (
    approve_publication,
    create_publication,
    publish_publication_to_template,
    start_publication_review,
    submit_publication_for_review,
)
from app.modules.platform_modules.version_crud import get_latest_module_version
from app.modules.portals.models import Portal
from app.modules.tenant_management.demo_tenant_inventory import assert_demo_tenant_inventory
from app.modules.tenant_module_configuration_applies.apply_service import apply_module_configuration_update
from app.modules.tenant_module_configuration_diffs.generator import generate_configuration_diff_for_offer
from app.modules.tenant_module_configuration_rollbacks.rollback_service import rollback_module_configuration
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.runtime.enforcement import get_calendar_runtime_settings
from app.modules.tenant_module_configurations.runtime.service import get_runtime_module_configuration
from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.crud import get_current_preview_for_offer
from app.modules.tenant_module_update_previews.generator import build_preview_payload_from_offer
from app.modules.tenant_modules.models import TenantModule
from app.modules.users.models import Role, User

DEV_TENANT_ID = 1
TEMPLATE_TENANT_ID = 2
CLIENT_TENANT_ID = 21
MODULE_KEY = "runtime.calendar"
SETTING_KEY = "default_view"
BASELINE_VALUE = "week"
DEMO_VALUE = "month"


def _pick_dev_actor(db) -> User:
    user = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(User.tenant_id == DEV_TENANT_ID, Role.name.in_(["admin", "superadmin"]))
        .order_by(User.id.asc())
        .first()
    )
    if user is None:
        raise RuntimeError("DEV actor not found")
    return user


def _pick_reviewer(db) -> User:
    user = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(User.tenant_id.is_(None), Role.name == "superadmin")
        .order_by(User.id.asc())
        .first()
    )
    if user is None:
        raise RuntimeError("Platform reviewer not found")
    return user


def _pick_client_actor(db) -> User:
    user = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(User.tenant_id == CLIENT_TENANT_ID, Role.name.in_(["admin", "superadmin"]))
        .order_by(User.id.asc())
        .first()
    )
    if user is None:
        raise RuntimeError("Client actor not found")
    return user


def _config_settings(db, tenant_id: int) -> dict:
    cfg = get_configuration(db, tenant_id=tenant_id, module_key=MODULE_KEY)
    return dict(cfg.settings or {}) if cfg else {}


def _runtime_default_view(db, tenant_id: int) -> str:
    return str(get_calendar_runtime_settings(db, tenant_id=tenant_id).get(SETTING_KEY) or "")


def main() -> int:
    report: dict = {"started_at": datetime.utcnow().isoformat(), "stages": {}}
    db = SessionLocal()
    try:
        assert_demo_tenant_inventory(db)
        report["environment"] = {
            "tenant_count": db.query(Portal).count(),
            "tenant_ids": [row.id for row in db.query(Portal.id).order_by(Portal.id.asc()).all()],
        }

        baseline = {
            tid: {
                "config_default_view": _config_settings(db, tid).get(SETTING_KEY),
                "runtime_default_view": _runtime_default_view(db, tid),
            }
            for tid in (DEV_TENANT_ID, TEMPLATE_TENANT_ID, CLIENT_TENANT_ID)
        }
        report["baseline"] = baseline

        dev_cfg = get_configuration(db, tenant_id=DEV_TENANT_ID, module_key=MODULE_KEY)
        dev_module = (
            db.query(TenantModule)
            .filter(TenantModule.tenant_id == DEV_TENANT_ID, TenantModule.module_key == MODULE_KEY)
            .one()
        )
        latest = get_latest_module_version(db, MODULE_KEY)
        target_version = str(latest.version if latest else dev_module.installed_version or "1.0.0")

        settings = dict(dev_cfg.settings or {})
        settings[SETTING_KEY] = DEMO_VALUE
        dev_cfg.settings = settings
        dev_module.installed_version = target_version
        db.commit()

        after_dev = {
            "config_default_view": _config_settings(db, DEV_TENANT_ID).get(SETTING_KEY),
            "runtime_default_view": _runtime_default_view(db, DEV_TENANT_ID),
            "installed_version": dev_module.installed_version,
        }
        report["dev_change"] = {"before": baseline[DEV_TENANT_ID], "after": after_dev}

        dev_actor = _pick_dev_actor(db)
        reviewer = _pick_reviewer(db)
        client_actor = _pick_client_actor(db)

        publication = create_publication(
            db,
            module_key=MODULE_KEY,
            actor=dev_actor,
            release_summary="Demo readiness: calendar default_view week → month",
        )
        pub_id = int(publication["id"])
        report["publication_create"] = publication

        submitted = submit_publication_for_review(db, publication_id=pub_id, actor=dev_actor)
        in_review = start_publication_review(db, publication_id=pub_id, actor=reviewer)
        approved = approve_publication(db, publication_id=pub_id, actor=reviewer)
        report["review_flow"] = {
            "submitted": submitted["publication_status"],
            "in_review": in_review["publication_status"],
            "approved": approved["publication_status"],
        }

        publish_result = publish_publication_to_template(db, publication_id=pub_id, actor=reviewer)
        report["publish"] = publish_result

        template_cfg = _config_settings(db, TEMPLATE_TENANT_ID)
        report["template_update"] = {
            "before": baseline[TEMPLATE_TENANT_ID],
            "after_config_default_view": template_cfg.get(SETTING_KEY),
            "after_runtime_default_view": _runtime_default_view(db, TEMPLATE_TENANT_ID),
        }

        offer = (
            db.query(TenantModuleUpdateOffer)
            .filter(
                TenantModuleUpdateOffer.tenant_id == CLIENT_TENANT_ID,
                TenantModuleUpdateOffer.module_key == MODULE_KEY,
                TenantModuleUpdateOffer.status == TenantModuleUpdateOfferStatus.AVAILABLE,
                TenantModuleUpdateOffer.publication_id == pub_id,
            )
            .order_by(TenantModuleUpdateOffer.id.desc())
            .first()
        )
        if offer is None:
            raise RuntimeError("Client offer not found after publish")

        preview_row = get_current_preview_for_offer(db, tenant_id=CLIENT_TENANT_ID, offer_id=int(offer.id))
        preview_payload = build_preview_payload_from_offer(db, offer)
        diff = generate_configuration_diff_for_offer(db, offer, commit=True)
        report["offer"] = {
            "id": int(offer.id),
            "from_version": offer.from_version,
            "to_version": offer.to_version,
            "publication_id": offer.publication_id,
            "status": offer.status,
        }
        report["preview"] = {
            "preview_id": int(preview_row.id) if preview_row else None,
            "has_impact_analysis": bool(preview_payload.get("impact_analysis")),
            "publication_metadata": (preview_payload.get("impact_analysis") or {}).get("publication_metadata"),
            "configuration_diff_keys": list((diff or {}).keys()) if isinstance(diff, dict) else str(type(diff)),
            "settings_diff": ((diff or {}).get("settings") if isinstance(diff, dict) else None),
        }

        runtime_before_apply = _runtime_default_view(db, CLIENT_TENANT_ID)
        apply_result = apply_module_configuration_update(
            db,
            tenant_id=CLIENT_TENANT_ID,
            offer_id=int(offer.id),
            applied_by=client_actor,
        )
        runtime_after_apply = _runtime_default_view(db, CLIENT_TENANT_ID)
        report["apply"] = {
            "result": apply_result,
            "runtime_before": runtime_before_apply,
            "runtime_after": runtime_after_apply,
        }

        rollback_result = rollback_module_configuration(
            db,
            tenant_id=CLIENT_TENANT_ID,
            apply_id=int(apply_result["apply_id"]),
            rolled_back_by=client_actor,
        )
        runtime_after_rollback = _runtime_default_view(db, CLIENT_TENANT_ID)
        report["rollback"] = {
            "result": rollback_result,
            "runtime_after_rollback": runtime_after_rollback,
            "runtime_matches_pre_apply": runtime_after_rollback == runtime_before_apply,
        }

        pub_row = get_publication(db, pub_id)
        report["final_counts"] = {
            "publications": db.query(Portal).count(),  # placeholder fix below
        }
        from app.modules.platform_module_publications.models import PlatformModulePublication
        from app.modules.tenant_module_configuration_applies.models import TenantModuleConfigurationApply
        from app.modules.tenant_module_configuration_rollbacks.models import TenantModuleConfigurationRollback

        report["final_counts"] = {
            "tenants": db.query(Portal).count(),
            "publications": db.query(PlatformModulePublication).count(),
            "offers_client_available": db.query(TenantModuleUpdateOffer)
            .filter(
                TenantModuleUpdateOffer.tenant_id == CLIENT_TENANT_ID,
                TenantModuleUpdateOffer.status == TenantModuleUpdateOfferStatus.AVAILABLE,
            )
            .count(),
            "applies_client": db.query(TenantModuleConfigurationApply)
            .filter(TenantModuleConfigurationApply.tenant_id == CLIENT_TENANT_ID)
            .count(),
            "rollbacks_client": db.query(TenantModuleConfigurationRollback)
            .filter(TenantModuleConfigurationRollback.tenant_id == CLIENT_TENANT_ID)
            .count(),
        }
        report["publication_final_status"] = pub_row.publication_status if pub_row else None
        assert_demo_tenant_inventory(db)

        stages = {
            "DEV Change": "PASS" if after_dev["config_default_view"] == DEMO_VALUE else "FAIL",
            "Publication": "PASS" if pub_id else "FAIL",
            "Review": "PASS"
            if str(report["review_flow"]["in_review"]).lower() in {"in_review", "approved", "published"}
            else "FAIL",
            "Approve": "PASS"
            if str(report["review_flow"]["approved"]).lower() in {"approved", "published"}
            else "FAIL",
            "Publish": "PASS"
            if str(publish_result["publication"]["publication_status"]).lower() == "published"
            else "FAIL",
            "Template Update": "PASS"
            if template_cfg.get(SETTING_KEY) == DEMO_VALUE
            else "FAIL",
            "Offer": "PASS" if offer is not None else "FAIL",
            "Preview": "PASS" if preview_row and preview_payload.get("impact_analysis") else "PARTIAL",
            "Apply": "PASS" if apply_result.get("status") == "completed" else "FAIL",
            "Runtime Change": "PASS"
            if runtime_before_apply != DEMO_VALUE and runtime_after_apply == DEMO_VALUE
            else "FAIL",
            "Rollback": "PASS" if rollback_result.get("status") == "completed" else "FAIL",
            "Runtime Restore": "PASS" if runtime_after_rollback == runtime_before_apply else "FAIL",
        }
        report["stage_table"] = stages
        report["finished_at"] = datetime.utcnow().isoformat()

        sys.stdout.buffer.write(json.dumps(report, ensure_ascii=False, indent=2, default=str).encode("utf-8"))
        sys.stdout.buffer.write(b"\n")
        return 0 if all(status in {"PASS", "PARTIAL"} for status in stages.values()) else 1
    except Exception as exc:
        db.rollback()
        error = {"error": str(exc), "type": type(exc).__name__}
        sys.stdout.buffer.write(json.dumps(error, ensure_ascii=False, indent=2).encode("utf-8"))
        sys.stdout.buffer.write(b"\n")
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
