"""Service layer for Architecture Navigator."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.architecture_navigator.catalog import CATALOG_COMPONENTS, CATALOG_LINKS
from app.modules.platform.architecture_navigator.constants import (
    CATEGORY_LABELS,
    CATEGORY_ORDER,
    COMPONENT_TYPE_LABELS,
    ArchitectureFindingKind,
    ArchitectureLinkType,
    ArchitectureSourceKind,
)
from app.modules.platform.architecture_navigator.models import (
    ArchitectureComponent,
    ArchitectureFinding,
    ArchitectureLink,
    ArchitectureScan,
)
from app.modules.platform.architecture_navigator.scanner import run_architecture_scan
from app.modules.platform.architecture_navigator.schemas import (
    ArchitectureComponentCard,
    ArchitectureFindingSummary,
    ArchitectureLatestScanResponse,
    ArchitecturePlaceInTree,
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


def ensure_catalog_seeded(db: Session) -> None:
    existing_keys = {
        row.component_key
        for row in db.query(ArchitectureComponent.component_key).all()
    }
    added_components = False
    for row in CATALOG_COMPONENTS:
        if row["component_key"] in existing_keys:
            continue
        db.add(
            ArchitectureComponent(
                component_key=row["component_key"],
                technical_name=row["technical_name"],
                component_type=row["component_type"],
                category_key=row["category_key"],
                title=row["title"],
                description=row.get("description"),
                purpose=row.get("purpose"),
                parent_key=row.get("parent_key"),
                sort_order=row.get("sort_order", 0),
                catalog_sources=row.get("catalog_sources", [ArchitectureSourceKind.CATALOG_SEED.value]),
            )
        )
        added_components = True

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

    if added_components or added_links:
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
    by_key = _component_map(db)

    uses = _linked_items(db, component.component_key, ArchitectureLinkType.USES.value, "out")
    used_by = _linked_items(db, component.component_key, ArchitectureLinkType.USED_BY.value, "in")
    data = _linked_items(db, component.component_key, ArchitectureLinkType.STORES_DATA.value, "out")
    decisions = _decision_items(db, component.component_key)
    restrictions = _restriction_items(db, component.component_key)

    latest_scan = db.query(ArchitectureScan).order_by(ArchitectureScan.started_at.desc()).first()
    last_scan = _scan_info_from_latest(latest_scan)

    return ArchitectureComponentCard(
        id=component.id,
        key=component.component_key,
        title=component.title,
        technical_name=component.technical_name,
        component_type=component.component_type,
        category_key=component.category_key,
        category_label=COMPONENT_TYPE_LABELS.get(
            component.component_type,
            CATEGORY_LABELS.get(component.category_key, component.category_key),
        ),
        description=component.description,
        purpose=component.purpose,
        place_in_architecture=ArchitecturePlaceInTree(
            path=_build_path(component, by_key),
            children=_children_items(component, by_key),
        ),
        uses=uses,
        used_by=used_by,
        data=data,
        decisions=decisions,
        restrictions=restrictions,
        findings=_finding_summary_for_component(db, component.component_key),
        sources=_sources_for_component(component, db),
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
        components=component_count,
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
