"""Architecture Governance service layer."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform.architecture_governance.adr_loader import get_adr_by_slug, load_adr_catalog
from app.modules.platform.architecture_governance.constitution_loader import (
    build_constitution_norm_payload,
    load_constitution_norms,
)
from app.modules.platform.architecture_governance.governance_catalog import (
    CONSTITUTION_SOURCE_DOCUMENT,
    CONSTITUTION_SOURCE_SECTION,
    DELIVERY_CONTOUR_SOURCE,
    DELIVERY_LINKS,
    DELIVERY_PHASES,
    DELIVERY_POLICIES,
    DELIVERY_ROUTE,
)
from app.modules.platform.architecture_governance.legacy_redirects import resolve_legacy_governance_redirect
from app.modules.platform.architecture_governance.schemas import (
    AdrDetailRead,
    AdrListItemRead,
    AdrListResponse,
    ConstitutionNormRead,
    ConstitutionResponse,
    DeliveryContourResponse,
    DeliveryLinkRead,
    DeliveryPhaseRead,
    GovernanceActiveReleaseSummary,
    GovernanceOverviewResponse,
    LegacyGovernanceRedirectResponse,
)
from app.modules.platform_release import service as release_service


def _adr_counts(items) -> tuple[int, int, int, int]:
    total = len(items)
    accepted = sum(1 for item in items if item.status_group == "accepted")
    in_progress = sum(1 for item in items if item.status_group == "in_progress")
    archived = sum(1 for item in items if item.status_group == "archived")
    return total, accepted, in_progress, archived


def _resolve_active_release(db: Session) -> GovernanceActiveReleaseSummary | None:
    releases = release_service.list_platform_releases(db)
    if not releases:
        return None

    published = [item for item in releases if item.status == "published"]
    pool = published or releases
    active = max(pool, key=lambda item: (item.published_at or item.created_at, item.id))

    return GovernanceActiveReleaseSummary(
        id=active.id,
        version=active.version,
        title=active.title,
        status=active.status,
    )


def get_governance_overview(db: Session) -> GovernanceOverviewResponse:
    adr_items = load_adr_catalog()
    adr_total, adr_accepted, adr_in_progress, adr_archived = _adr_counts(adr_items)
    releases = release_service.list_platform_releases(db)

    return GovernanceOverviewResponse(
        constitution_norms_count=len(load_constitution_norms()),
        adr_total=adr_total,
        adr_accepted=adr_accepted,
        adr_in_progress=adr_in_progress,
        adr_archived=adr_archived,
        delivery_route=" → ".join(DELIVERY_ROUTE),
        active_release=_resolve_active_release(db),
        releases_total_count=len(releases),
        releases_path="platform-releases",
    )


def get_constitution_projection() -> ConstitutionResponse:
    norms = [
        ConstitutionNormRead(**build_constitution_norm_payload(item))
        for item in load_constitution_norms()
    ]
    return ConstitutionResponse(
        norms_count=len(norms),
        source_document=CONSTITUTION_SOURCE_DOCUMENT,
        source_section=CONSTITUTION_SOURCE_SECTION,
        norms=norms,
    )


def list_adrs() -> AdrListResponse:
    items = load_adr_catalog()
    total, accepted, in_progress, archived = _adr_counts(items)
    return AdrListResponse(
        total=total,
        accepted=accepted,
        in_progress=in_progress,
        archived=archived,
        items=[
            AdrListItemRead(
                slug=item.slug,
                title=item.title,
                status=item.status,
                status_group=item.status_group,
                date=item.date,
                summary=item.summary,
                document_path=item.document_path,
            )
            for item in items
        ],
    )


def get_adr_detail(slug: str) -> AdrDetailRead | None:
    item = get_adr_by_slug(slug)
    if item is None:
        return None
    return AdrDetailRead(
        slug=item.slug,
        title=item.title,
        status=item.status,
        status_group=item.status_group,
        date=item.date,
        summary=item.summary,
        related_adrs=item.related_adrs,
        related_categories=item.related_categories,
        related_services=item.related_services,
        document_path=item.document_path,
        content_excerpt=item.summary,
    )


def get_delivery_contour() -> DeliveryContourResponse:
    return DeliveryContourResponse(
        source_document=DELIVERY_CONTOUR_SOURCE,
        route=list(DELIVERY_ROUTE),
        route_label=" → ".join(DELIVERY_ROUTE),
        phases=[DeliveryPhaseRead(**phase) for phase in DELIVERY_PHASES],
        policies=list(DELIVERY_POLICIES),
        links=[DeliveryLinkRead(**link) for link in DELIVERY_LINKS],
    )


def get_legacy_governance_redirect(registry_key: str) -> LegacyGovernanceRedirectResponse | None:
    target = resolve_legacy_governance_redirect(registry_key)
    if target is None:
        return None
    return LegacyGovernanceRedirectResponse(registry_key=registry_key, **target)
