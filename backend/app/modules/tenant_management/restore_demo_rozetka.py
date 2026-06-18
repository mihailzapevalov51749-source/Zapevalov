"""Restore canonical demo CLIENT tenant ООО Розетка."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap import clone_tenant_structure
from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID
from app.modules.tenant_environment.constants import (
    DEFAULT_TEMPLATE_VERSION,
    TenantEnvironmentRole,
    TenantStatus,
    TenantType,
)
from app.modules.tenant_management.constants import (
    DEMO_CLIENT_PORTAL_ID,
    DEMO_CLIENT_TENANT_KEY,
)


@dataclass(frozen=True)
class DataImpactAudit:
    tables_affected: list[str]
    rows_before: dict[str, int]
    rows_after: dict[str, int]
    rows_to_create: dict[str, int]
    rows_to_update: dict[str, int]
    rows_to_delete: dict[str, int]
    protected_rows_touched: list[int]
    destructive_operation: str

    def render(self) -> str:
        lines = [
            "Data Impact Audit",
            f"Tables affected: {', '.join(self.tables_affected)}",
            f"Rows before: {self.rows_before}",
            f"Rows after: {self.rows_after}",
            f"Rows to create: {self.rows_to_create}",
            f"Rows to update: {self.rows_to_update}",
            f"Rows to delete: {self.rows_to_delete}",
            f"Protected rows touched: {self.protected_rows_touched}",
            f"Destructive operation: {self.destructive_operation}",
        ]
        return "\n".join(lines)


@dataclass(frozen=True)
class RestoreDemoRozetkaPlan:
    action: str
    existing_portal_id: int | None
    target_portal_id: int
    bootstrap_from_template: bool
    backup_hint: str
    audit: DataImpactAudit


@dataclass(frozen=True)
class RestoreDemoRozetkaResult:
    portal_id: int
    created: bool
    bootstrapped: bool
    audit: DataImpactAudit


def _find_existing_demo_client(db: Session) -> Portal | None:
    by_key = (
        db.query(Portal)
        .filter(Portal.code == DEMO_CLIENT_TENANT_KEY)
        .order_by(Portal.id.asc())
        .first()
    )
    if by_key is not None:
        return by_key

    return (
        db.query(Portal)
        .filter(Portal.environment_role == TenantEnvironmentRole.DEMO_CLIENT.value)
        .order_by(Portal.id.asc())
        .first()
    )


def _count_portals(db: Session) -> int:
    return db.query(Portal).count()


def _inspect_backup_hint() -> str:
    repo_root = Path(__file__).resolve().parents[4]
    candidates = sorted((repo_root / "backups").glob("*.dump"))
    if not candidates:
        return "No .dump backups found under backups/"

    latest = candidates[-1]
    try:
        raw = latest.read_bytes()
    except OSError as exc:
        return f"Backup unreadable: {latest.name} ({exc})"

    markers = (
        b"ooo_rozetka",
        "ООО Розетка".encode("utf-8"),
        b"\t21\t",
    )
    found = [marker.decode("utf-8", errors="ignore") for marker in markers if marker in raw]
    if found:
        return (
            f"Backup {latest.name} contains Rozetka markers {found}. "
            "Selective restore from dump not implemented; will create fresh portal row "
            "and bootstrap structure from Platform Template."
        )
    return (
        f"Backup {latest.name} has no Rozetka markers. "
        "Will create fresh protected demo CLIENT and bootstrap from Platform Template."
    )


def plan_restore_demo_rozetka(db: Session) -> RestoreDemoRozetkaPlan:
    existing = _find_existing_demo_client(db)
    occupied_id = db.query(Portal).filter(Portal.id == DEMO_CLIENT_PORTAL_ID).first()
    target_id = int(existing.id) if existing is not None else DEMO_CLIENT_PORTAL_ID

    if existing is not None:
        action = "update_existing"
    elif occupied_id is not None:
        action = "create_with_new_id"
        target_id = int(occupied_id.id)
    else:
        action = "create_id_21"

    rows_before = {"portals": _count_portals(db)}
    rows_to_create = {"portals": 0 if existing is not None else 1}
    rows_to_update = {"portals": 1 if existing is not None else 0}

    audit = DataImpactAudit(
        tables_affected=["portals"],
        rows_before=rows_before,
        rows_after={
            "portals": rows_before["portals"] + rows_to_create["portals"],
        },
        rows_to_create=rows_to_create,
        rows_to_update=rows_to_update,
        rows_to_delete={"portals": 0},
        protected_rows_touched=[target_id] if existing is not None else [],
        destructive_operation="none",
    )

    return RestoreDemoRozetkaPlan(
        action=action,
        existing_portal_id=int(existing.id) if existing is not None else None,
        target_portal_id=target_id,
        bootstrap_from_template=existing is None or action == "create_id_21",
        backup_hint=_inspect_backup_hint(),
        audit=audit,
    )


def restore_demo_rozetka(
    db: Session,
    *,
    dry_run: bool = True,
    confirm: bool = False,
) -> RestoreDemoRozetkaResult | RestoreDemoRozetkaPlan:
    plan = plan_restore_demo_rozetka(db)

    if dry_run:
        return plan

    if not confirm:
        raise RuntimeError("restore_demo_rozetka requires confirm=True after dry-run")

    existing = _find_existing_demo_client(db)
    template = db.query(Portal).filter(Portal.id == PLATFORM_TEMPLATE_TENANT_ID).one_or_none()
    if template is None:
        raise RuntimeError(f"Platform Template tenant id={PLATFORM_TEMPLATE_TENANT_ID} is required")

    created = False
    bootstrapped = False

    if existing is None:
        occupied = db.query(Portal).filter(Portal.id == DEMO_CLIENT_PORTAL_ID).first()
        portal_id = DEMO_CLIENT_PORTAL_ID if occupied is None else None

        portal = Portal(
            id=portal_id,
            name="ООО Розетка",
            short_name="Розетка",
            code=DEMO_CLIENT_TENANT_KEY,
            description="Демонстрационная клиентская компания",
            tenant_type=TenantType.CLIENT.value,
            template_version=str(template.template_version or DEFAULT_TEMPLATE_VERSION),
            tenant_status=TenantStatus.ACTIVE.value,
            source_tenant_id=PLATFORM_TEMPLATE_TENANT_ID,
            is_active=True,
            is_protected=True,
            environment_role=TenantEnvironmentRole.DEMO_CLIENT.value,
        )
        db.add(portal)
        db.flush()
        created = True
        bootstrapped = True
        clone_tenant_structure(db, PLATFORM_TEMPLATE_TENANT_ID, portal.id)
    else:
        portal = existing
        portal.name = "ООО Розетка"
        portal.short_name = "Розетка"
        portal.code = DEMO_CLIENT_TENANT_KEY
        portal.tenant_type = TenantType.CLIENT.value
        portal.tenant_status = TenantStatus.ACTIVE.value
        portal.is_active = True
        portal.is_protected = True
        portal.environment_role = TenantEnvironmentRole.DEMO_CLIENT.value
        db.add(portal)
        db.flush()

    db.commit()
    db.refresh(portal)

    audit = DataImpactAudit(
        tables_affected=["portals"],
        rows_before=plan.audit.rows_before,
        rows_after={"portals": _count_portals(db)},
        rows_to_create={"portals": 1 if created else 0},
        rows_to_update={"portals": 0 if created else 1},
        rows_to_delete={"portals": 0},
        protected_rows_touched=[int(portal.id)],
        destructive_operation="none",
    )

    return RestoreDemoRozetkaResult(
        portal_id=int(portal.id),
        created=created,
        bootstrapped=bootstrapped,
        audit=audit,
    )
