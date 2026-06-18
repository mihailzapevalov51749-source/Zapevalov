"""Legacy demo_tehzak cleanup helpers (WI-16)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.modules.company_database_provisioning.orphan_detection import (
    detect_orphan_company_provisioning,
)
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.portals.models import Portal
from app.modules.tenant_module_configurations.models import (
    TenantModuleConfigSnapshot,
    TenantModuleConfiguration,
)
from app.modules.tenant_modules.models import TenantModule
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import User

LEGACY_PORTAL_ID = 14
LEGACY_COMPANY_CODE = "demo_tehzak"
LEGACY_DATABASE_NAME = "yasnopro_dev"

PROTECTED_PORTAL_IDS = frozenset({1, 2, 21})


class LegacyCleanupError(RuntimeError):
    """Raised when legacy cleanup preconditions fail."""


@dataclass(frozen=True, slots=True)
class LegacyEntityRef:
    entity: str
    record_id: int
    portal_id: int | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class LegacyCleanupSnapshot:
    portal_id: int
    portal_code: str | None
    is_protected: bool
    entities: list[LegacyEntityRef] = field(default_factory=list)
    table_counts: dict[str, int] = field(default_factory=dict)
    user_memberships: dict[int, list[int]] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "portal_id": self.portal_id,
            "portal_code": self.portal_code,
            "is_protected": self.is_protected,
            "entities": [
                {
                    "entity": item.entity,
                    "id": item.record_id,
                    "portal_id": item.portal_id,
                    **item.extra,
                }
                for item in self.entities
            ],
            "table_counts": self.table_counts,
            "user_memberships": self.user_memberships,
        }


def assert_legacy_cleanup_target(db: Session, *, portal_id: int = LEGACY_PORTAL_ID) -> Portal:
    if portal_id in PROTECTED_PORTAL_IDS:
        raise LegacyCleanupError(f"Refusing cleanup for protected portal_id={portal_id}")

    portal = db.get(Portal, portal_id)
    if portal is None:
        raise LegacyCleanupError(f"Portal id={portal_id} not found")

    if portal.is_protected:
        raise LegacyCleanupError(f"Portal id={portal_id} is protected")

    code = str(portal.code or "").strip()
    if code != LEGACY_COMPANY_CODE:
        raise LegacyCleanupError(
            f"Portal id={portal_id} code={code!r} is not {LEGACY_COMPANY_CODE!r}",
        )

    return portal


def _append_model_rows(
    snapshot: LegacyCleanupSnapshot,
    *,
    entity: str,
    rows: list[Any],
    portal_attr: str = "portal_id",
) -> None:
    for row in rows:
        portal_id = getattr(row, portal_attr, None)
        if portal_id is None:
            portal_id = getattr(row, "tenant_id", None)
        snapshot.entities.append(
            LegacyEntityRef(
                entity=entity,
                record_id=int(row.id),
                portal_id=int(portal_id) if portal_id is not None else None,
            ),
        )


def _query_if_table_exists(db: Session, model, *filters):
    table_name = getattr(model, "__tablename__", None)
    if not table_name:
        return []
    insp = inspect(db.get_bind())
    if table_name not in insp.get_table_names():
        return []
    return db.query(model).filter(*filters).all()


def build_legacy_cleanup_snapshot(
    db: Session,
    *,
    portal_id: int = LEGACY_PORTAL_ID,
) -> LegacyCleanupSnapshot:
    portal = assert_legacy_cleanup_target(db, portal_id=portal_id)
    snapshot = LegacyCleanupSnapshot(
        portal_id=portal_id,
        portal_code=str(portal.code or "") or None,
        is_protected=bool(portal.is_protected),
    )

    companies = (
        db.query(CustomerCompany)
        .filter(
            (CustomerCompany.portal_id == portal_id)
            | (CustomerCompany.primary_portal_id == portal_id)
            | (CustomerCompany.code == LEGACY_COMPANY_CODE),
        )
        .all()
    )
    _append_model_rows(snapshot, entity="customer_companies", rows=companies)

    pages = db.query(Page).filter(Page.portal_id == portal_id).all()
    _append_model_rows(snapshot, entity="pages", rows=pages)

    navigation = db.query(NavigationItem).filter(NavigationItem.portal_id == portal_id).all()
    _append_model_rows(snapshot, entity="navigation_items", rows=navigation)

    modules = _query_if_table_exists(
        db,
        TenantModule,
        (TenantModule.portal_id == portal_id) | (TenantModule.tenant_id == portal_id),
    )
    _append_model_rows(snapshot, entity="tenant_modules", rows=modules)

    configs = _query_if_table_exists(
        db,
        TenantModuleConfiguration,
        TenantModuleConfiguration.tenant_id == portal_id,
    )
    _append_model_rows(snapshot, entity="tenant_module_configurations", rows=configs, portal_attr="tenant_id")

    config_snapshots = _query_if_table_exists(
        db,
        TenantModuleConfigSnapshot,
        TenantModuleConfigSnapshot.tenant_id == portal_id,
    )
    _append_model_rows(
        snapshot,
        entity="tenant_module_config_snapshots",
        rows=config_snapshots,
        portal_attr="tenant_id",
    )

    memberships = db.query(TenantUserMembership).filter(TenantUserMembership.tenant_id == portal_id).all()
    _append_model_rows(snapshot, entity="tenant_user_memberships", rows=memberships, portal_attr="tenant_id")

    profiles = db.query(TenantUserProfile).filter(TenantUserProfile.tenant_id == portal_id).all()
    _append_model_rows(snapshot, entity="tenant_user_profiles", rows=profiles, portal_attr="tenant_id")

    user_ids = sorted({int(m.user_id) for m in memberships})
    for user_id in user_ids:
        other_memberships = (
            db.query(TenantUserMembership)
            .filter(
                TenantUserMembership.user_id == user_id,
                TenantUserMembership.tenant_id != portal_id,
            )
            .count()
        )
        other_profiles = (
            db.query(TenantUserProfile)
            .filter(
                TenantUserProfile.user_id == user_id,
                TenantUserProfile.tenant_id != portal_id,
            )
            .count()
        )
        snapshot.user_memberships[user_id] = [other_memberships, other_profiles]
        user = db.get(User, user_id)
        if user is not None:
            snapshot.entities.append(
                LegacyEntityRef(
                    entity="users",
                    record_id=int(user.id),
                    portal_id=portal_id,
                    extra={
                        "email": user.email,
                        "exclusive": other_memberships == 0 and other_profiles == 0,
                    },
                ),
            )

    snapshot.entities.append(
        LegacyEntityRef(
            entity="portals",
            record_id=int(portal.id),
            portal_id=portal_id,
            extra={"code": portal.code},
        ),
    )

    insp = inspect(db.get_bind())
    for table in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns(table)}
        for col in ("portal_id", "tenant_id"):
            if col not in cols:
                continue
            try:
                count = db.execute(
                    text(f"SELECT COUNT(*) FROM {table} WHERE {col} = :portal_id"),
                    {"portal_id": portal_id},
                ).scalar()
            except Exception:
                continue
            if count:
                snapshot.table_counts[f"{table}.{col}"] = int(count)

    return snapshot


def users_safe_to_delete(snapshot: LegacyCleanupSnapshot) -> list[int]:
    safe_ids: list[int] = []
    for entity in snapshot.entities:
        if entity.entity != "users":
            continue
        if entity.extra.get("exclusive"):
            safe_ids.append(entity.record_id)
    return safe_ids


def delete_legacy_demo_tehzak(
    db: Session,
    *,
    portal_id: int = LEGACY_PORTAL_ID,
    include_module_registry: bool = True,
) -> list[LegacyEntityRef]:
    assert_legacy_cleanup_target(db, portal_id=portal_id)
    snapshot = build_legacy_cleanup_snapshot(db, portal_id=portal_id)
    deleted: list[LegacyEntityRef] = []

    def _delete_query(model, *filters) -> list[LegacyEntityRef]:
        rows = db.query(model).filter(*filters).all()
        refs = [
            LegacyEntityRef(
                entity=model.__tablename__,
                record_id=int(row.id),
                portal_id=portal_id,
            )
            for row in rows
        ]
        for row in rows:
            db.delete(row)
        return refs

    def _delete_by_sql(table: str, column: str) -> list[LegacyEntityRef]:
        try:
            rows = db.execute(
                text(f"SELECT id FROM {table} WHERE {column} = :portal_id"),
                {"portal_id": portal_id},
            ).mappings().all()
        except Exception:
            return []
        if not rows:
            return []
        ids = [int(row["id"]) for row in rows]
        db.execute(
            text(f"DELETE FROM {table} WHERE {column} = :portal_id"),
            {"portal_id": portal_id},
        )
        return [
            LegacyEntityRef(entity=table, record_id=record_id, portal_id=portal_id)
            for record_id in ids
        ]

    if include_module_registry:
        deleted.extend(_delete_by_sql("tenant_module_config_snapshots", "tenant_id"))
        deleted.extend(_delete_by_sql("tenant_module_configurations", "tenant_id"))
        deleted.extend(_delete_by_sql("tenant_modules", "tenant_id"))
    deleted.extend(_delete_query(NavigationItem, NavigationItem.portal_id == portal_id))
    deleted.extend(_delete_query(Page, Page.portal_id == portal_id))
    deleted.extend(_delete_query(TenantUserMembership, TenantUserMembership.tenant_id == portal_id))
    deleted.extend(_delete_query(TenantUserProfile, TenantUserProfile.tenant_id == portal_id))
    deleted.extend(
        _delete_query(
            CustomerCompany,
            (CustomerCompany.portal_id == portal_id)
            | (CustomerCompany.primary_portal_id == portal_id)
            | (CustomerCompany.code == LEGACY_COMPANY_CODE),
        ),
    )

    for user_id in users_safe_to_delete(snapshot):
        user = db.get(User, user_id)
        if user is not None:
            deleted.append(
                LegacyEntityRef(
                    entity="users",
                    record_id=int(user.id),
                    portal_id=portal_id,
                    extra={"email": user.email},
                ),
            )
            db.delete(user)

    portal = db.get(Portal, portal_id)
    if portal is not None:
        deleted.append(
            LegacyEntityRef(
                entity="portals",
                record_id=int(portal.id),
                portal_id=portal_id,
                extra={"code": portal.code},
            ),
        )
        db.delete(portal)

    db.flush()
    return deleted


def verify_legacy_demo_tehzak_removed(db: Session, *, portal_id: int = LEGACY_PORTAL_ID) -> dict[str, Any]:
    portal = db.get(Portal, portal_id)
    companies = (
        db.query(CustomerCompany)
        .filter(
            (CustomerCompany.portal_id == portal_id)
            | (CustomerCompany.code == LEGACY_COMPANY_CODE),
        )
        .count()
    )
    pages = db.query(Page).filter(Page.portal_id == portal_id).count()
    navigation = db.query(NavigationItem).filter(NavigationItem.portal_id == portal_id).count()
    modules = len(
        _query_if_table_exists(
            db,
            TenantModule,
            (TenantModule.portal_id == portal_id) | (TenantModule.tenant_id == portal_id),
        ),
    )
    configs = len(
        _query_if_table_exists(
            db,
            TenantModuleConfiguration,
            TenantModuleConfiguration.tenant_id == portal_id,
        ),
    )
    memberships = db.query(TenantUserMembership).filter(TenantUserMembership.tenant_id == portal_id).count()
    profiles = db.query(TenantUserProfile).filter(TenantUserProfile.tenant_id == portal_id).count()

    remaining_table_refs: dict[str, int] = {}
    insp = inspect(db.get_bind())
    for table in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns(table)}
        for col in ("portal_id", "tenant_id"):
            if col not in cols:
                continue
            try:
                count = db.execute(
                    text(f"SELECT COUNT(*) FROM {table} WHERE {col} = :portal_id"),
                    {"portal_id": portal_id},
                ).scalar()
            except Exception:
                continue
            if count:
                remaining_table_refs[f"{table}.{col}"] = int(count)

    orphans = [
        {
            "kind": item.kind,
            "database_name": item.database_name,
            "catalog_id": item.catalog_id,
            "catalog_code": item.catalog_code,
        }
        for item in detect_orphan_company_provisioning(db)
        if item.catalog_code == LEGACY_COMPANY_CODE or item.database_name.endswith("_demo_tehzak")
    ]

    protected_portals = {
        pid: {
            "exists": db.get(Portal, pid) is not None,
            "code": getattr(db.get(Portal, pid), "code", None),
        }
        for pid in sorted(PROTECTED_PORTAL_IDS)
    }

    return {
        "portal_exists": portal is not None,
        "customer_companies": companies,
        "pages": pages,
        "navigation_items": navigation,
        "tenant_modules": modules,
        "tenant_module_configurations": configs,
        "tenant_user_memberships": memberships,
        "tenant_user_profiles": profiles,
        "remaining_table_refs": remaining_table_refs,
        "orphans_related_to_legacy": orphans,
        "protected_portals": protected_portals,
        "cleanup_passed": (
            portal is None
            and companies == 0
            and pages == 0
            and navigation == 0
            and modules == 0
            and configs == 0
            and memberships == 0
            and profiles == 0
            and not remaining_table_refs
        ),
    }
