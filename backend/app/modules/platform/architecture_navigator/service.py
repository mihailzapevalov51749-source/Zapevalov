"""Service layer for Architecture Navigator."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.runtime_paths import try_dev_monorepo_root
from app.modules.platform.architecture_navigator.catalog import CATALOG_COMPONENTS, CATALOG_LINKS
from app.modules.platform.architecture_navigator.constants import (
    CATEGORY_LABELS,
    CATEGORY_ORDER,
    COMPONENT_TYPE_LABELS,
    ArchitectureFindingKind,
    ArchitectureLinkType,
    ArchitectureSourceKind,
)
from app.modules.platform.architecture_navigator.configuration_registry_catalog import (
    CONFIGURATION_REGISTRY_COMPONENTS,
)
from app.modules.platform.architecture_navigator.standards_registry_catalog import (
    STANDARDS_REGISTRY_COMPONENTS,
)
from app.modules.platform.architecture_navigator.registry_catalog import (
    REGISTRY_FIELD_OVERRIDES,
    REGISTRY_SUPPLEMENT_COMPONENTS,
)
from app.modules.platform.architecture_navigator.registry_documents import (
    resolve_registry_document_path,
)
from app.modules.platform.architecture_navigator.registry_constants import (
    CATEGORY_TO_REGISTRY,
    COMPOSITIONAL_REGISTRY_ORDER,
    DEPLOYMENT_PHASE_COMPONENT_KEYS,
    ELEMENT_STATUS_ACTIVE,
    ELEMENT_STATUS_DEPRECATED,
    LEGACY_DATA_COMPONENT_KEY_RENAMES,
    LEGACY_DATA_COMPONENT_KEYS,
    LEGACY_GOVERNANCE_REGISTRY_KEYS,
    LEGACY_INTERFACE_COMPONENT_KEY_RENAMES,
    LEGACY_INTERFACE_SUBSYSTEM_KEYS,
    LEGACY_MODULE_COMPONENT_KEYS,
    LEGACY_RUNTIME_COMPONENT_KEYS,
    LEGACY_SERVICE_COMPONENT_KEY_RENAMES,
    COMPONENTS_REGISTRY_COMPONENT_KEYS,
    COMPONENTS_REGISTRY_ELEMENT_STATUS,
    CONFIGURATION_REGISTRY_COMPONENT_KEYS,
    LEGACY_COMPONENT_DISPLAY_NAMES,
    LEGACY_CONFIGURATION_COMPONENT_KEYS,
    LEGACY_STANDARDS_COMPONENT_KEYS,
    LEGACY_STANDARDS_LINK_RENAMES,
    STANDARDS_REGISTRY_COMPONENT_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_COMPONENTS,
    REGISTRY_CONFIGURATION,
    REGISTRY_CORE,
    REGISTRY_DATA,
    REGISTRY_INTERFACE,
    REGISTRY_LABELS,
    REGISTRY_ORDER,
    REGISTRY_OVERVIEW,
    REGISTRY_PUBLICATION,
    REGISTRY_RULES,
    REGISTRY_RUNTIME_LEGACY,
    REGISTRY_SERVICES,
    REGISTRY_STANDARDS,
    resolve_registry_key,
)
from app.modules.platform.architecture_navigator.models import (
    ArchitectureComponent,
    ArchitectureFinding,
    ArchitectureLink,
    ArchitectureScan,
)
from app.modules.platform.architecture_navigator.ownership_policy import OWNERSHIP_ROLE_PRIMARY
from app.modules.platform.architecture_navigator.scanner import run_architecture_scan
from app.modules.platform.architecture_navigator.schemas import (
    ArchitectureComponentCard,
    ArchitectureFindingSummary,
    ArchitectureLatestScanResponse,
    ArchitecturePlaceInTree,
    ArchitectureRegistryDocumentResponse,
    ArchitectureRegistryElementItem,
    ArchitectureRegistryElementsResponse,
    ArchitectureRegistryListItem,
    ArchitectureRegistryOverviewResponse,
    ArchitectureRelatedItem,
    ArchitectureScanInfo,
    ArchitectureScanResponse,
    ArchitectureScanSummary,
    ArchitectureTreeCategory,
    ArchitectureTreeNode,
    ArchitectureTreeResponse,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantType


def _related_item(component: ArchitectureComponent | None) -> ArchitectureRelatedItem | None:
    if component is None:
        return None
    return ArchitectureRelatedItem(
        key=component.component_key,
        title=component.title,
        technical_name=component.technical_name,
    )


def _merged_seed_row(row: dict) -> dict:
    overrides = REGISTRY_FIELD_OVERRIDES.get(row["component_key"], {})
    merged = {**row, **overrides}
    merged["registry_key"] = merged.get("registry_key") or CATEGORY_TO_REGISTRY.get(
        merged.get("category_key", ""),
        REGISTRY_OVERVIEW,
    )
    migrated_key = REGISTRY_COMPONENT_MIGRATION.get(merged["component_key"])
    if migrated_key:
        merged["registry_key"] = migrated_key
    merged.setdefault("element_status", ELEMENT_STATUS_ACTIVE)
    merged.setdefault("implementation_json", {})
    merged.setdefault("documents_json", {})
    merged.setdefault("metadata_json", {})
    return merged


def _apply_registry_fields(component: ArchitectureComponent, row: dict) -> bool:
    merged = _merged_seed_row(row)
    changed = False
    for field in (
        "registry_key",
        "element_status",
        "architecture_zone",
        "title",
        "technical_name",
        "category_key",
        "component_type",
        "description",
        "purpose",
        "parent_key",
        "sort_order",
    ):
        value = merged.get(field)
        if value is not None and getattr(component, field) != value:
            setattr(component, field, value)
            changed = True
    for json_field in ("implementation_json", "documents_json", "metadata_json"):
        value = merged.get(json_field) or {}
        if value and getattr(component, json_field) != value:
            setattr(component, json_field, value)
            changed = True
    return changed


def _all_seed_rows() -> list[dict]:
    return [
        *CATALOG_COMPONENTS,
        *REGISTRY_SUPPLEMENT_COMPONENTS,
        *CONFIGURATION_REGISTRY_COMPONENTS,
        *STANDARDS_REGISTRY_COMPONENTS,
    ]


def _migrate_legacy_runtime_registry(db: Session) -> bool:
    """Archive former Runtime-tab elements and remap registry_key=runtime rows."""
    changed = False
    legacy_keys = set(LEGACY_RUNTIME_COMPONENT_KEYS)
    for row in db.query(ArchitectureComponent).filter(
        or_(
            ArchitectureComponent.registry_key.in_([REGISTRY_RUNTIME_LEGACY, REGISTRY_ARCHIVED]),
            ArchitectureComponent.component_key.in_(legacy_keys),
        )
    ).all():
        if row.component_key in legacy_keys or row.registry_key == REGISTRY_RUNTIME_LEGACY:
            if row.registry_key != REGISTRY_ARCHIVED:
                row.registry_key = REGISTRY_ARCHIVED
                changed = True
            if row.element_status != ELEMENT_STATUS_DEPRECATED:
                row.element_status = ELEMENT_STATUS_DEPRECATED
                changed = True
    return changed


def _migrate_legacy_publication_rules_registry(db: Session) -> bool:
    """Remap v1.0 publication/rules registry rows to v1.2 compositional or archived homes."""
    changed = False
    legacy_registry_keys = {REGISTRY_PUBLICATION, REGISTRY_RULES, *LEGACY_GOVERNANCE_REGISTRY_KEYS}
    for row in db.query(ArchitectureComponent).filter(
        or_(
            ArchitectureComponent.registry_key.in_(legacy_registry_keys),
            ArchitectureComponent.component_key.in_(REGISTRY_COMPONENT_MIGRATION.keys()),
        )
    ).all():
        target_key = REGISTRY_COMPONENT_MIGRATION.get(row.component_key)
        if target_key is None and row.registry_key in legacy_registry_keys:
            target_key = REGISTRY_ARCHIVED
        if target_key and row.registry_key != target_key:
            row.registry_key = target_key
            changed = True
    return changed


def _migrate_services_registry_v1(db: Session) -> bool:
    """WI-ARCH-REG-SERV-002: normalize services tab to nine platform services."""
    changed = False
    existing_keys = {
        row.component_key
        for row in db.query(ArchitectureComponent).all()
    }
    for old_key, new_key in LEGACY_SERVICE_COMPONENT_KEY_RENAMES.items():
        if old_key not in existing_keys:
            continue
        if new_key in existing_keys:
            legacy = db.query(ArchitectureComponent).filter_by(component_key=old_key).one_or_none()
            if legacy is not None:
                legacy.registry_key = REGISTRY_ARCHIVED
                legacy.element_status = ELEMENT_STATUS_DEPRECATED
                legacy.architecture_zone = "legacy_services"
                changed = True
            continue
        legacy = db.query(ArchitectureComponent).filter_by(component_key=old_key).one_or_none()
        if legacy is not None and legacy.component_key != new_key:
            legacy.component_key = new_key
            legacy.registry_key = REGISTRY_SERVICES
            changed = True

    for phase_key in DEPLOYMENT_PHASE_COMPONENT_KEYS:
        row = db.query(ArchitectureComponent).filter_by(component_key=phase_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_ARCHIVED:
            row.registry_key = REGISTRY_ARCHIVED
            changed = True
        if row.parent_key != "deployment-execution":
            row.parent_key = "deployment-execution"
            changed = True
        if row.element_status != ELEMENT_STATUS_DEPRECATED:
            row.element_status = ELEMENT_STATUS_DEPRECATED
            changed = True

    return changed


def _migrate_configuration_registry_v1(db: Session) -> bool:
    """WI-ARCH-REG-CONF-002: normalize configuration tab to thirty-six elements."""
    changed = False
    canonical_published_catalog = "config-group-published-catalog"

    for legacy_key in LEGACY_CONFIGURATION_COMPONENT_KEYS | {"dirty-dev-check"}:
        row = db.query(ArchitectureComponent).filter_by(component_key=legacy_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_ARCHIVED:
            row.registry_key = REGISTRY_ARCHIVED
            changed = True
        if row.element_status != ELEMENT_STATUS_DEPRECATED:
            row.element_status = ELEMENT_STATUS_DEPRECATED
            changed = True
        expected_zone = (
            "legacy_publication" if legacy_key == "dirty-dev-check" else "legacy_configuration"
        )
        if row.architecture_zone != expected_zone:
            row.architecture_zone = expected_zone
            changed = True
        if legacy_key == "dirty-dev-check" and row.parent_key != "publication-service":
            row.parent_key = "publication-service"
            changed = True
        if legacy_key == "published-catalog" and row.parent_key != canonical_published_catalog:
            row.parent_key = canonical_published_catalog
            changed = True

    for component_key in CONFIGURATION_REGISTRY_COMPONENT_KEYS:
        row = db.query(ArchitectureComponent).filter_by(component_key=component_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_CONFIGURATION:
            row.registry_key = REGISTRY_CONFIGURATION
            changed = True
        if row.category_key != "configuration":
            row.category_key = "configuration"
            changed = True
        if row.architecture_zone != "configuration":
            row.architecture_zone = "configuration"
            changed = True
        if row.element_status != ELEMENT_STATUS_ACTIVE:
            row.element_status = ELEMENT_STATUS_ACTIVE
            changed = True

    for link in db.query(ArchitectureLink).filter(
        or_(
            ArchitectureLink.from_component_key == "published-catalog",
            ArchitectureLink.to_component_key == "published-catalog",
        )
    ).all():
        if link.from_component_key == "published-catalog":
            link.from_component_key = canonical_published_catalog
            changed = True
        if link.to_component_key == "published-catalog":
            link.to_component_key = canonical_published_catalog
            changed = True

    return changed


def _migrate_standards_registry_v1(db: Session) -> bool:
    """WI-ARCH-REG-STD-002: normalize standards tab to thirty-five elements."""
    changed = False

    for legacy_key in LEGACY_STANDARDS_COMPONENT_KEYS:
        row = db.query(ArchitectureComponent).filter_by(component_key=legacy_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_ARCHIVED:
            row.registry_key = REGISTRY_ARCHIVED
            changed = True
        if row.element_status != ELEMENT_STATUS_DEPRECATED:
            row.element_status = ELEMENT_STATUS_DEPRECATED
            changed = True
        if row.architecture_zone != "legacy_standards":
            row.architecture_zone = "legacy_standards"
            changed = True

    for component_key in STANDARDS_REGISTRY_COMPONENT_KEYS:
        row = db.query(ArchitectureComponent).filter_by(component_key=component_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_STANDARDS:
            row.registry_key = REGISTRY_STANDARDS
            changed = True
        if row.category_key != "decisions":
            row.category_key = "decisions"
            changed = True
        if row.architecture_zone != "standards":
            row.architecture_zone = "standards"
            changed = True
        if row.element_status != ELEMENT_STATUS_ACTIVE:
            row.element_status = ELEMENT_STATUS_ACTIVE
            changed = True

    for old_key, new_key in LEGACY_STANDARDS_LINK_RENAMES.items():
        for link in db.query(ArchitectureLink).filter(
            or_(
                ArchitectureLink.from_component_key == old_key,
                ArchitectureLink.to_component_key == old_key,
            )
        ).all():
            if link.from_component_key == old_key:
                link.from_component_key = new_key
                changed = True
            if link.to_component_key == old_key:
                link.to_component_key = new_key
                changed = True

    return changed


def _migrate_modules_registry_v1(db: Session) -> bool:
    """WI-ARCH-REG-MOD-002: normalize modules tab to six platform modules."""
    changed = False

    process = db.query(ArchitectureComponent).filter_by(component_key="process-engine").one_or_none()
    if process is not None:
        if process.registry_key != REGISTRY_CORE:
            process.registry_key = REGISTRY_CORE
            changed = True
        if process.category_key != "core":
            process.category_key = "core"
            changed = True
        if process.architecture_zone != "core":
            process.architecture_zone = "core"
            changed = True
        if process.title == "Процессы":
            process.title = "Движок процессов"
            changed = True

    for legacy_key in LEGACY_MODULE_COMPONENT_KEYS:
        row = db.query(ArchitectureComponent).filter_by(component_key=legacy_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_ARCHIVED:
            row.registry_key = REGISTRY_ARCHIVED
            changed = True
        if row.element_status != ELEMENT_STATUS_DEPRECATED:
            row.element_status = ELEMENT_STATUS_DEPRECATED
            changed = True
        if row.architecture_zone != "legacy_modules":
            row.architecture_zone = "legacy_modules"
            changed = True

    return changed


def _migrate_data_registry_v1(db: Session) -> bool:
    """WI-ARCH-REG-DATA-002: normalize data tab to eleven platform data contours."""
    changed = False
    existing_keys = {
        row.component_key
        for row in db.query(ArchitectureComponent).all()
    }

    for old_key, new_key in LEGACY_DATA_COMPONENT_KEY_RENAMES.items():
        if old_key not in existing_keys:
            continue
        if new_key in existing_keys:
            legacy = db.query(ArchitectureComponent).filter_by(component_key=old_key).one_or_none()
            if legacy is not None:
                legacy.registry_key = REGISTRY_ARCHIVED
                legacy.element_status = ELEMENT_STATUS_DEPRECATED
                legacy.architecture_zone = "legacy_data"
                changed = True
            continue
        legacy = db.query(ArchitectureComponent).filter_by(component_key=old_key).one_or_none()
        if legacy is not None and legacy.component_key != new_key:
            legacy.component_key = new_key
            legacy.registry_key = REGISTRY_DATA
            legacy.category_key = "data"
            legacy.architecture_zone = "data"
            changed = True

    for core_key in ("entity-engine", "event-engine"):
        row = db.query(ArchitectureComponent).filter_by(component_key=core_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_CORE:
            row.registry_key = REGISTRY_CORE
            changed = True
        if row.category_key != "core":
            row.category_key = "core"
            changed = True
        if row.architecture_zone != "core":
            row.architecture_zone = "core"
            changed = True

    for legacy_key in LEGACY_DATA_COMPONENT_KEYS:
        row = db.query(ArchitectureComponent).filter_by(component_key=legacy_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_ARCHIVED:
            row.registry_key = REGISTRY_ARCHIVED
            changed = True
        if row.element_status != ELEMENT_STATUS_DEPRECATED:
            row.element_status = ELEMENT_STATUS_DEPRECATED
            changed = True
        if row.architecture_zone != "legacy_data":
            row.architecture_zone = "legacy_data"
            changed = True

    version_pin = db.query(ArchitectureComponent).filter_by(component_key="version-pin").one_or_none()
    if version_pin is not None and version_pin.registry_key != REGISTRY_ARCHIVED:
        version_pin.registry_key = REGISTRY_ARCHIVED
        version_pin.element_status = ELEMENT_STATUS_DEPRECATED
        version_pin.architecture_zone = "legacy_publication"
        changed = True

    return changed


def _migrate_interface_registry_v1(db: Session) -> bool:
    """WI-ARCH-REG-UI-002: normalize interface tab to twenty platform UI elements."""
    changed = False
    existing_keys = {
        row.component_key
        for row in db.query(ArchitectureComponent).all()
    }

    for legacy_key in LEGACY_INTERFACE_SUBSYSTEM_KEYS:
        row = db.query(ArchitectureComponent).filter_by(component_key=legacy_key).one_or_none()
        if row is None:
            continue
        if row.registry_key != REGISTRY_ARCHIVED:
            row.registry_key = REGISTRY_ARCHIVED
            changed = True
        if row.element_status != ELEMENT_STATUS_DEPRECATED:
            row.element_status = ELEMENT_STATUS_DEPRECATED
            changed = True
        if row.architecture_zone != "legacy_subsystems":
            row.architecture_zone = "legacy_subsystems"
            changed = True

    for old_key, new_key in LEGACY_INTERFACE_COMPONENT_KEY_RENAMES.items():
        if old_key not in existing_keys:
            continue
        if new_key in existing_keys:
            legacy = db.query(ArchitectureComponent).filter_by(component_key=old_key).one_or_none()
            if legacy is not None:
                legacy.registry_key = REGISTRY_ARCHIVED
                legacy.element_status = ELEMENT_STATUS_DEPRECATED
                legacy.architecture_zone = "legacy_interface"
                changed = True
            continue
        legacy = db.query(ArchitectureComponent).filter_by(component_key=old_key).one_or_none()
        if legacy is not None and legacy.component_key != new_key:
            legacy.component_key = new_key
            legacy.registry_key = REGISTRY_INTERFACE
            legacy.category_key = "platform_ui_elements"
            legacy.architecture_zone = "interface"
            changed = True
            for link in db.query(ArchitectureLink).filter(
                ArchitectureLink.from_component_key == old_key
            ).all():
                link.from_component_key = new_key
                changed = True
            for link in db.query(ArchitectureLink).filter(
                ArchitectureLink.to_component_key == old_key
            ).all():
                link.to_component_key = new_key
                changed = True

    return changed


def _migrate_components_registry_v1(db: Session) -> bool:
    """WI-ARCH-REG-COMP-002: normalize components tab to eighteen platform components."""
    changed = False
    seed_by_key = {row["component_key"]: row for row in CATALOG_COMPONENTS}

    for component_key in COMPONENTS_REGISTRY_COMPONENT_KEYS:
        row = db.query(ArchitectureComponent).filter_by(component_key=component_key).one_or_none()
        if row is None:
            continue

        expected_status = COMPONENTS_REGISTRY_ELEMENT_STATUS.get(
            component_key,
            ELEMENT_STATUS_ACTIVE,
        )
        if row.registry_key != REGISTRY_COMPONENTS:
            row.registry_key = REGISTRY_COMPONENTS
            changed = True
        if row.category_key != "platform_components":
            row.category_key = "platform_components"
            changed = True
        if row.architecture_zone != "components":
            row.architecture_zone = "components"
            changed = True
        if row.element_status != expected_status:
            row.element_status = expected_status
            changed = True

        seed_row = seed_by_key.get(component_key)
        if seed_row is not None:
            expected_title = seed_row.get("title")
            expected_technical_name = seed_row.get("technical_name")
            if expected_title and row.title != expected_title:
                row.title = expected_title
                changed = True
            if expected_technical_name and row.technical_name != expected_technical_name:
                row.technical_name = expected_technical_name
                changed = True

        legacy_display = LEGACY_COMPONENT_DISPLAY_NAMES.get(component_key)
        if legacy_display and row.title == legacy_display:
            seed_row = seed_by_key.get(component_key)
            if seed_row and row.title != seed_row.get("title"):
                row.title = seed_row["title"]
                changed = True
        if legacy_display and row.technical_name == legacy_display:
            seed_row = seed_by_key.get(component_key)
            if seed_row and row.technical_name != seed_row.get("technical_name"):
                row.technical_name = seed_row["technical_name"]
                changed = True

    return changed


def _find_existing_component_for_seed(
    existing: dict[str, ArchitectureComponent],
    seed_key: str,
) -> ArchitectureComponent | None:
    """Resolve seed row to a persisted component, including legacy rename sources."""
    current = existing.get(seed_key)
    if current is not None:
        return current
    for old_key, new_key in LEGACY_SERVICE_COMPONENT_KEY_RENAMES.items():
        if new_key == seed_key:
            legacy = existing.get(old_key)
            if legacy is not None:
                return legacy
    for old_key, new_key in LEGACY_DATA_COMPONENT_KEY_RENAMES.items():
        if new_key == seed_key:
            legacy = existing.get(old_key)
            if legacy is not None:
                return legacy
    for old_key, new_key in LEGACY_INTERFACE_COMPONENT_KEY_RENAMES.items():
        if new_key == seed_key:
            legacy = existing.get(old_key)
            if legacy is not None:
                return legacy
    return None


def _migrate_catalog_links_v1(db: Session) -> bool:
    """WI-ARCH-LINKS-002: sync DB links to canonical CATALOG_LINKS (idempotent)."""
    archived_keys = {
        _merged_seed_row(row)["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row).get("registry_key") == REGISTRY_ARCHIVED
    }
    canonical_links = {(link["from"], link["to"], link["type"]) for link in CATALOG_LINKS}
    changed = False
    for link in list(db.query(ArchitectureLink).all()):
        current = (link.from_component_key, link.to_component_key, link.link_type)
        if (
            link.from_component_key in archived_keys
            or link.to_component_key in archived_keys
            or current not in canonical_links
        ):
            db.delete(link)
            changed = True
    existing_links = {
        (link.from_component_key, link.to_component_key, link.link_type)
        for link in db.query(ArchitectureLink).all()
    }
    for from_key, to_key, link_type in sorted(canonical_links):
        if (from_key, to_key, link_type) in existing_links:
            continue
        db.add(
            ArchitectureLink(
                from_component_key=from_key,
                to_component_key=to_key,
                link_type=link_type,
            )
        )
        changed = True
    return changed


def _reload_component_index(db: Session) -> dict[str, ArchitectureComponent]:
    return {row.component_key: row for row in db.query(ArchitectureComponent).all()}


def ensure_catalog_seeded(db: Session) -> None:
    updated_components = False
    updated_links = False

    if _migrate_legacy_runtime_registry(db):
        updated_components = True

    if _migrate_legacy_publication_rules_registry(db):
        updated_components = True

    if _migrate_services_registry_v1(db):
        updated_components = True

    if _migrate_modules_registry_v1(db):
        updated_components = True

    if _migrate_data_registry_v1(db):
        updated_components = True

    if _migrate_interface_registry_v1(db):
        updated_components = True

    if _migrate_components_registry_v1(db):
        updated_components = True

    if _migrate_configuration_registry_v1(db):
        updated_components = True

    if _migrate_standards_registry_v1(db):
        updated_components = True

    if _migrate_catalog_links_v1(db):
        updated_links = True

    if updated_components:
        db.flush()

    existing = _reload_component_index(db)
    added_components = False
    for row in _all_seed_rows():
        merged = _merged_seed_row(row)
        current = _find_existing_component_for_seed(existing, merged["component_key"])
        if current is None:
            component = ArchitectureComponent(
                component_key=merged["component_key"],
                technical_name=merged["technical_name"],
                component_type=merged["component_type"],
                category_key=merged["category_key"],
                title=merged["title"],
                description=merged.get("description"),
                purpose=merged.get("purpose"),
                parent_key=merged.get("parent_key"),
                registry_key=merged["registry_key"],
                element_status=merged["element_status"],
                architecture_zone=merged.get("architecture_zone"),
                implementation_json=merged.get("implementation_json") or {},
                documents_json=merged.get("documents_json") or {},
                metadata_json=merged.get("metadata_json") or {},
                sort_order=merged.get("sort_order", 0),
                catalog_sources=merged.get(
                    "catalog_sources",
                    [ArchitectureSourceKind.CATALOG_SEED.value],
                ),
            )
            db.add(component)
            existing[merged["component_key"]] = component
            added_components = True
        elif _apply_registry_fields(current, row):
            updated_components = True

    if added_components:
        db.flush()

    existing_links = {
        (link.from_component_key, link.to_component_key, link.link_type)
        for link in db.query(ArchitectureLink).all()
    }
    added_links = False
    for link in CATALOG_LINKS:
        key = (link["from"], link["to"], link["type"])
        if key in existing_links:
            continue
        db.add(
            ArchitectureLink(
                from_component_key=link["from"],
                to_component_key=link["to"],
                link_type=link["type"],
            )
        )
        added_links = True

    if added_components or added_links or updated_components or updated_links:
        db.commit()


def _component_map(db: Session) -> dict[str, ArchitectureComponent]:
    return {row.component_key: row for row in db.query(ArchitectureComponent).all()}


def _resolve_component(db: Session, component_ref: str | int) -> ArchitectureComponent:
    ensure_catalog_seeded(db)
    query = db.query(ArchitectureComponent)
    if isinstance(component_ref, int) or str(component_ref).isdigit():
        component = query.filter(ArchitectureComponent.id == int(component_ref)).one_or_none()
    else:
        component = query.filter(ArchitectureComponent.component_key == str(component_ref)).one_or_none()
    if component is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Компонент не найден")
    return component


def _build_path(
    component: ArchitectureComponent,
    by_key: dict[str, ArchitectureComponent],
) -> list[ArchitectureRelatedItem]:
    path: list[ArchitectureRelatedItem] = []
    category_label = CATEGORY_LABELS.get(component.category_key, component.category_key)
    path.append(
        ArchitectureRelatedItem(
            key=component.category_key,
            title=category_label,
            technical_name=component.category_key,
        )
    )
    if component.parent_key and component.parent_key in by_key:
        parent = by_key[component.parent_key]
        parent_item = _related_item(parent)
        if parent_item:
            path.append(parent_item)
    current = _related_item(component)
    if current:
        path.append(current)
    return path


def _linked_items(
    db: Session,
    component_key: str,
    link_type: str,
    direction: str,
) -> list[ArchitectureRelatedItem]:
    by_key = _component_map(db)
    if direction == "out":
        links = (
            db.query(ArchitectureLink)
            .filter(
                ArchitectureLink.from_component_key == component_key,
                ArchitectureLink.link_type == link_type,
            )
            .all()
        )
        keys = [link.to_component_key for link in links]
    else:
        links = (
            db.query(ArchitectureLink)
            .filter(
                ArchitectureLink.to_component_key == component_key,
                ArchitectureLink.link_type == link_type,
            )
            .all()
        )
        keys = [link.from_component_key for link in links]

    items: list[ArchitectureRelatedItem] = []
    for key in keys:
        item = _related_item(by_key.get(key))
        if item:
            items.append(item)
    return items


def _children_items(
    component: ArchitectureComponent,
    by_key: dict[str, ArchitectureComponent],
) -> list[ArchitectureRelatedItem]:
    children = [
        row
        for row in by_key.values()
        if row.parent_key == component.component_key
    ]
    children.sort(key=lambda row: (row.sort_order, row.title))
    return [item for row in children if (item := _related_item(row))]


def _decision_items(db: Session, component_key: str) -> list[ArchitectureRelatedItem]:
    by_key = _component_map(db)
    items: list[ArchitectureRelatedItem] = []
    for row in by_key.values():
        if row.component_type != "architecture_decision":
            continue
        if component_key in (row.description or "") or component_key.replace("-", " ") in (row.title or "").lower():
            item = _related_item(row)
            if item:
                items.append(item)
    linked = _linked_items(db, component_key, ArchitectureLinkType.USED_BY.value, "in")
    for item in linked:
        comp = by_key.get(item.key)
        if comp and comp.component_type == "architecture_decision" and item not in items:
            items.append(item)
    return items


def _restriction_items(db: Session, component_key: str) -> list[ArchitectureRelatedItem]:
    by_key = _component_map(db)
    items: list[ArchitectureRelatedItem] = []
    linked = _linked_items(db, component_key, ArchitectureLinkType.USED_BY.value, "in")
    for item in linked:
        comp = by_key.get(item.key)
        if comp and comp.component_type == "architecture_restriction":
            items.append(item)
    if not items:
        for row in by_key.values():
            if row.component_type != "architecture_restriction":
                continue
            item = _related_item(row)
            if item:
                items.append(item)
    return items[:6]


def _finding_summary_for_component(db: Session, component_key: str) -> ArchitectureFindingSummary:
    latest_scan = db.query(ArchitectureScan).order_by(ArchitectureScan.started_at.desc()).first()
    if latest_scan is None:
        return ArchitectureFindingSummary()

    findings = (
        db.query(ArchitectureFinding)
        .filter(
            ArchitectureFinding.scan_id == latest_scan.id,
            ArchitectureFinding.component_key == component_key,
        )
        .all()
    )
    summary = ArchitectureFindingSummary()
    for finding in findings:
        if finding.finding_kind == ArchitectureFindingKind.ROUTE.value:
            summary.routes += 1
        elif finding.finding_kind == ArchitectureFindingKind.TABLE.value:
            summary.tables += 1
        elif finding.finding_kind == ArchitectureFindingKind.SERVICE.value:
            summary.services += 1
        elif finding.finding_kind == ArchitectureFindingKind.DEPENDENCY.value:
            summary.dependencies += 1
        elif finding.finding_kind == ArchitectureFindingKind.DOCUMENT.value:
            summary.documents += 1
        elif finding.finding_kind == ArchitectureFindingKind.RULE.value:
            summary.rules += 1
    return summary


def _sources_for_component(component: ArchitectureComponent, db: Session) -> list[str]:
    sources = list(component.catalog_sources or [])
    latest_scan = db.query(ArchitectureScan).order_by(ArchitectureScan.started_at.desc()).first()
    if latest_scan:
        scan_sources = {
            row[0]
            for row in db.query(ArchitectureFinding.source_kind)
            .filter(
                ArchitectureFinding.scan_id == latest_scan.id,
                ArchitectureFinding.component_key == component.component_key,
            )
            .distinct()
            .all()
        }
        sources.extend(sorted(scan_sources))
    labels = {
        ArchitectureSourceKind.CATALOG_SEED.value: "Catalog Seed",
        ArchitectureSourceKind.ARCHITECTURE_DOCUMENT.value: "Architecture Document",
        ArchitectureSourceKind.CURSOR_RULE.value: "Cursor Rule",
        ArchitectureSourceKind.DATABASE_SCAN.value: "Database Scan",
        ArchitectureSourceKind.CODE_SCAN.value: "Code Scan",
        ArchitectureSourceKind.API_ROUTE_SCAN.value: "API Route Scan",
        ArchitectureSourceKind.FRONTEND_ROUTE_SCAN.value: "Frontend Route Scan",
    }
    return [labels.get(value, value) for value in dict.fromkeys(sources)]


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item]


def _implementation_files_from_scan(db: Session, component_key: str) -> tuple[list[str], list[str]]:
    latest_scan = db.query(ArchitectureScan).order_by(ArchitectureScan.started_at.desc()).first()
    if latest_scan is None:
        return [], []

    rows = (
        db.query(ArchitectureFinding)
        .filter(
            ArchitectureFinding.scan_id == latest_scan.id,
            ArchitectureFinding.component_key == component_key,
            ArchitectureFinding.finding_kind.in_(
                [
                    ArchitectureFindingKind.BACKEND_FILE.value,
                    ArchitectureFindingKind.FRONTEND_FILE.value,
                ]
            ),
        )
        .order_by(ArchitectureFinding.label)
        .all()
    )
    backend_files = sorted(
        {
            row.label
            for row in rows
            if row.finding_kind == ArchitectureFindingKind.BACKEND_FILE.value
            and (row.details_json or {}).get("ownership_role", OWNERSHIP_ROLE_PRIMARY) == OWNERSHIP_ROLE_PRIMARY
        }
    )
    frontend_files = sorted(
        {
            row.label
            for row in rows
            if row.finding_kind == ArchitectureFindingKind.FRONTEND_FILE.value
            and (row.details_json or {}).get("ownership_role", OWNERSHIP_ROLE_PRIMARY) == OWNERSHIP_ROLE_PRIMARY
        }
    )
    return backend_files, frontend_files


def _implementation_details(component: ArchitectureComponent) -> dict[str, list[str]]:
    """Legacy registry metadata — no longer used for implementation file lists."""
    metadata = getattr(component, "metadata_json", None) or {}
    documents = getattr(component, "documents_json", None) or {}
    return {
        "api_endpoints": _string_list(metadata.get("api_endpoints")),
        "database_schemas": _string_list(metadata.get("database_schemas")),
        "tables": _string_list(metadata.get("tables")),
        "migrations": _string_list(metadata.get("migrations")),
        "tests": _string_list(metadata.get("tests")),
        "related_adrs": _string_list(documents.get("related_adrs") or metadata.get("related_adrs")),
        "change_history": _string_list(metadata.get("change_history")),
    }


def list_registries(db: Session) -> list[ArchitectureRegistryListItem]:
    ensure_catalog_seeded(db)
    from sqlalchemy import func

    counts = dict(
        db.query(ArchitectureComponent.registry_key, func.count(ArchitectureComponent.id))
        .group_by(ArchitectureComponent.registry_key)
        .all()
    )
    items: list[ArchitectureRegistryListItem] = []
    for registry_key in REGISTRY_ORDER:
        if registry_key == REGISTRY_OVERVIEW:
            continue
        if registry_key not in COMPOSITIONAL_REGISTRY_ORDER:
            continue
        items.append(
            ArchitectureRegistryListItem(
                key=registry_key,
                title=REGISTRY_LABELS[registry_key],
                element_count=int(counts.get(registry_key, 0)),
            )
        )
    return items


def list_registry_elements(db: Session, registry_key: str) -> ArchitectureRegistryElementsResponse:
    ensure_catalog_seeded(db)
    resolved_key = resolve_registry_key(registry_key)
    if resolved_key not in REGISTRY_LABELS or resolved_key == REGISTRY_OVERVIEW:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Реестр не найден")

    rows = (
        db.query(ArchitectureComponent)
        .filter(ArchitectureComponent.registry_key == resolved_key)
        .order_by(ArchitectureComponent.sort_order, ArchitectureComponent.title)
        .all()
    )
    return ArchitectureRegistryElementsResponse(
        registry_key=resolved_key,
        registry_label=REGISTRY_LABELS[resolved_key],
        elements=[
            ArchitectureRegistryElementItem(
                id=row.id,
                key=row.component_key,
                title=row.title,
                technical_name=row.technical_name,
                component_type=row.component_type,
                element_status=row.element_status,
                sort_order=row.sort_order,
            )
            for row in rows
        ],
    )


def get_registry_overview(db: Session) -> ArchitectureRegistryOverviewResponse:
    ensure_catalog_seeded(db)
    latest_scan = db.query(ArchitectureScan).order_by(ArchitectureScan.started_at.desc()).first()
    total_elements = (
        db.query(ArchitectureComponent)
        .filter(ArchitectureComponent.registry_key.in_(COMPOSITIONAL_REGISTRY_ORDER))
        .count()
    )
    latest = get_latest_scan(db)
    return ArchitectureRegistryOverviewResponse(
        registries=list_registries(db),
        total_elements=total_elements,
        last_scan=_scan_info_from_latest(latest_scan),
        global_findings=latest.global_findings,
    )


def get_architecture_tree(db: Session) -> ArchitectureTreeResponse:
    ensure_catalog_seeded(db)
    rows = db.query(ArchitectureComponent).order_by(
        ArchitectureComponent.category_key,
        ArchitectureComponent.sort_order,
        ArchitectureComponent.title,
    ).all()

    by_category: dict[str, list[ArchitectureTreeNode]] = {key: [] for key in CATEGORY_ORDER}
    for row in rows:
        node = ArchitectureTreeNode(
            id=row.id,
            key=row.component_key,
            title=row.title,
            technical_name=row.technical_name,
            component_type=row.component_type,
            category_key=row.category_key,
            parent_key=row.parent_key,
            children=[],
        )
        by_category.setdefault(row.category_key, []).append(node)

    categories: list[ArchitectureTreeCategory] = []
    for category_key in CATEGORY_ORDER:
        children = by_category.get(category_key, [])
        if not children:
            continue
        categories.append(
            ArchitectureTreeCategory(
                key=category_key,
                title=CATEGORY_LABELS.get(category_key, category_key),
                children=children,
            )
        )
    return ArchitectureTreeResponse(categories=categories)


def _scan_info_from_latest(latest_scan: ArchitectureScan | None) -> ArchitectureScanInfo:
    if latest_scan is None:
        return ArchitectureScanInfo()
    return ArchitectureScanInfo(
        scan_id=latest_scan.id,
        scanned_at=latest_scan.finished_at or latest_scan.started_at,
        scanner_version=latest_scan.scanner_version,
    )


def get_component_card(db: Session, component_ref: str | int) -> ArchitectureComponentCard:
    component = _resolve_component(db, component_ref)
    backend_files, frontend_files = _implementation_files_from_scan(db, component.component_key)
    latest_scan = db.query(ArchitectureScan).order_by(ArchitectureScan.started_at.desc()).first()
    last_scan = _scan_info_from_latest(latest_scan)

    return ArchitectureComponentCard(
        id=component.id,
        key=component.component_key,
        title=component.title,
        technical_name=component.technical_name,
        description=component.description,
        purpose=component.purpose,
        backend_files=backend_files,
        frontend_files=frontend_files,
        last_scan=last_scan,
    )


def execute_architecture_scan(db: Session, user_id: int | None) -> ArchitectureScanResponse:
    ensure_catalog_seeded(db)
    draft = run_architecture_scan()
    started_at = datetime.utcnow()

    scan = ArchitectureScan(
        scanner_version=draft.scanner_version,
        status="running",
        started_at=started_at,
        triggered_by_user_id=user_id,
        summary_json={},
    )
    db.add(scan)
    db.flush()

    for finding in draft.findings:
        db.add(
            ArchitectureFinding(
                scan_id=scan.id,
                component_key=finding.component_key,
                finding_kind=finding.finding_kind,
                source_kind=finding.source_kind,
                label=finding.label,
                value=finding.value,
                details_json=finding.details,
            )
        )

    component_count = db.query(ArchitectureComponent).count()
    summary = ArchitectureScanSummary(
        routes=draft.summary.get("routes", 0),
        tables=draft.summary.get("tables", 0),
        frontend_routes=draft.summary.get("frontend_routes", 0),
        architecture_documents=draft.summary.get("architecture_documents", 0),
        cursor_rules=draft.summary.get("cursor_rules", 0),
        backend_files=draft.summary.get("backend_files", 0),
        frontend_files=draft.summary.get("frontend_files", 0),
        components=draft.summary.get("components", component_count),
    )
    scan.status = "completed"
    scan.finished_at = datetime.utcnow()
    scan.summary_json = summary.model_dump()
    db.commit()
    db.refresh(scan)

    findings_count = (
        db.query(ArchitectureFinding)
        .filter(ArchitectureFinding.scan_id == scan.id)
        .count()
    )
    return ArchitectureScanResponse(
        id=scan.id,
        scanner_version=scan.scanner_version,
        status=scan.status,
        started_at=scan.started_at,
        finished_at=scan.finished_at,
        summary=summary,
        findings_count=findings_count,
    )


def get_latest_scan(db: Session) -> ArchitectureLatestScanResponse:
    scan = db.query(ArchitectureScan).order_by(ArchitectureScan.started_at.desc()).first()
    if scan is None:
        return ArchitectureLatestScanResponse(scan=None)

    summary_data = scan.summary_json or {}
    summary = ArchitectureScanSummary(**summary_data) if summary_data else ArchitectureScanSummary()
    findings = db.query(ArchitectureFinding).filter(ArchitectureFinding.scan_id == scan.id).all()
    global_summary = ArchitectureFindingSummary()
    for finding in findings:
        if finding.finding_kind == ArchitectureFindingKind.ROUTE.value:
            global_summary.routes += 1
        elif finding.finding_kind == ArchitectureFindingKind.TABLE.value:
            global_summary.tables += 1
        elif finding.finding_kind == ArchitectureFindingKind.SERVICE.value:
            global_summary.services += 1
        elif finding.finding_kind == ArchitectureFindingKind.DEPENDENCY.value:
            global_summary.dependencies += 1
        elif finding.finding_kind == ArchitectureFindingKind.DOCUMENT.value:
            global_summary.documents += 1
        elif finding.finding_kind == ArchitectureFindingKind.RULE.value:
            global_summary.rules += 1

    return ArchitectureLatestScanResponse(
        scan=ArchitectureScanResponse(
            id=scan.id,
            scanner_version=scan.scanner_version,
            status=scan.status,
            started_at=scan.started_at,
            finished_at=scan.finished_at,
            summary=summary,
            findings_count=len(findings),
        ),
        global_findings=global_summary,
    )


def _document_title_from_markdown(content: str, fallback: str) -> str:
    for line in content.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def get_registry_document(registry_key: str) -> ArchitectureRegistryDocumentResponse:
    resolved_key = resolve_registry_key(registry_key)
    if resolved_key in LEGACY_GOVERNANCE_REGISTRY_KEYS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Для этой вкладки документ открывается в разделе Architecture Governance",
        )

    document_path = resolve_registry_document_path(resolved_key)
    if document_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Для вкладки «{REGISTRY_LABELS.get(resolved_key, resolved_key)}» документ не настроен",
        )

    mono_root = try_dev_monorepo_root()
    if mono_root is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Просмотр архитектурных документов доступен только в DEV-контуре с монорепозиторием",
        )

    absolute_path = (mono_root / document_path).resolve()
    docs_root = (mono_root / "docs").resolve()
    if docs_root not in absolute_path.parents and absolute_path != docs_root:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Недопустимый путь к документу",
        )

    if not absolute_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Архитектурный документ не найден: {document_path}. "
                f"Проверьте наличие файла в docs/architecture/."
            ),
        )

    content = absolute_path.read_text(encoding="utf-8")
    updated_at = datetime.fromtimestamp(absolute_path.stat().st_mtime, tz=timezone.utc)
    registry_label = REGISTRY_LABELS.get(resolved_key, resolved_key)
    fallback_title = Path(document_path).name

    return ArchitectureRegistryDocumentResponse(
        registry_key=resolved_key,
        registry_label=registry_label,
        document_path=document_path,
        document_title=_document_title_from_markdown(content, fallback_title),
        content=content,
        updated_at=updated_at,
    )


def assert_dev_tenant_access(db: Session, tenant_id: int) -> None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant не найден")
    tenant_type = getattr(portal, "tenant_type", None)
    if tenant_type not in {TenantType.DEV.value, TenantType.DEV}:
        if tenant_id != 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Архитектурный навигатор доступен только в DEV",
            )
