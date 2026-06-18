"""Business logic for platform release pipeline."""

from __future__ import annotations

import re
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_constants import (
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import (
    record_platform_event,
    record_tenant_event,
)
from app.modules.platform_event_journal.cursor_dev_journal import record_cursor_dev_event
from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id
from app.modules.platform_event_journal.tenant_audit_constants import (
    TenantEventCategory,
    TenantEventCode,
)
from app.modules.platform_build_registry import service as build_registry_service
from app.modules.platform_deployment_registry import service as deployment_registry_service
from app.modules.platform_deployment_registry.constants import (
    PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_modules.version_schemas import PlatformReleaseModuleOut
from app.modules.platform_release import crud
from app.modules.platform_release.constants import (
    DEFAULT_INITIAL_VERSION,
    EXCLUDED_OFFER_TENANT_TYPES,
    PlatformReleaseStatus,
    TenantUpdateOfferStatus,
)
from app.modules.platform_release.dependencies import assert_reviewer_action
from app.modules.platform_release.models import TenantUpdateOffer
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_release_package_registry import adapters as package_adapters
from app.modules.platform_release_package_registry import service as package_registry_service
from app.modules.platform_release_package_registry.governance import (
    default_governance,
    get_review_status,
    set_governance,
)
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_release.schemas import (
    ApplyUpdateResult,
    OfferToTenantsResult,
    PlatformReleaseCreate,
    PlatformReleaseListItem,
    PlatformReleaseOut,
    PlatformReleaseUpdate,
    PublishToTemplateResult,
    ReleaseChangeOut,
    ReviewCommentPayload,
    ReviewCommentRequiredPayload,
    TenantUpdateOfferOut,
    TenantVersionOut,
)
from app.modules.platform_version_registry.models import PlatformEnvironmentVersion
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_environment.resolver import resolve_template_tenant_id
from app.modules.users.models import User


def _bump_patch_version(version: str) -> str:
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)$", str(version or "").strip())
    if not match:
        return DEFAULT_INITIAL_VERSION
    major, minor, patch = match.groups()
    return f"{major}.{minor}.{int(patch) + 1}"


def _resolve_next_release_version(db: Session) -> str:
    latest = (
        db.query(PlatformReleasePackage)
        .order_by(PlatformReleasePackage.id.desc())
        .first()
    )
    if latest is not None:
        return _bump_patch_version(latest.platform_version)
    template_id = resolve_template_tenant_id(db)
    if template_id is not None:
        portal = db.query(Portal).filter(Portal.id == template_id).one_or_none()
        if portal and portal.template_version:
            return _bump_patch_version(portal.template_version)
    return DEFAULT_INITIAL_VERSION



def _load_build_for_package(db: Session, package: PlatformReleasePackage) -> PlatformCodeBuild | None:
    if package.build_id is None:
        return None
    return (
        db.query(PlatformCodeBuild)
        .filter(PlatformCodeBuild.id == package.build_id)
        .one_or_none()
    )



def _try_get_package_by_id(db: Session, package_id: int) -> PlatformReleasePackage | None:
    return (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.id == package_id)
        .one_or_none()
    )


def _get_package_or_404(db: Session, package_id: int) -> PlatformReleasePackage:
    package = _try_get_package_by_id(db, package_id)
    if package is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found",
        )
    return package


def _package_title(package: PlatformReleasePackage) -> str:
    manifest = (
        package.package_manifest_json
        if isinstance(package.package_manifest_json, dict)
        else {}
    )
    title = str(manifest.get("title") or "").strip()
    if title:
        return title
    return f"Релиз {package.platform_version}"


def _serialize_package_release_out(db: Session, package) -> PlatformReleaseOut:
    build = _load_build_for_package(db, package)
    latest_template_deployment = _get_latest_template_deployment_for_package(db, package.id)
    return package_adapters.package_to_platform_release_out(
        package,
        build=build,
        latest_template_deployment=latest_template_deployment,
        offers_exist=_package_offers_exist(db, package.id),
    )


def _serialize_package_list_item(db: Session, package) -> PlatformReleaseListItem:
    build = _load_build_for_package(db, package)
    latest_template_deployment = _get_latest_template_deployment_for_package(db, package.id)
    return package_adapters.package_to_platform_release_list_item(
        package,
        build=build,
        latest_template_deployment=latest_template_deployment,
        offers_exist=_package_offers_exist(db, package.id),
    )


def _get_latest_template_deployment_for_package(
    db: Session,
    package_id: int,
) -> PlatformDeployment | None:
    return (
        db.query(PlatformDeployment)
        .filter(PlatformDeployment.release_package_id == package_id)
        .filter(
            PlatformDeployment.target_environment_type
            == PlatformDeploymentTargetEnvironmentType.TEMPLATE.value
        )
        .order_by(PlatformDeployment.id.desc())
        .first()
    )


def _package_offers_exist(db: Session, package_id: int) -> bool:
    return (
        db.query(TenantUpdateOffer)
        .filter(TenantUpdateOffer.release_id == package_id)
        .count()
        > 0
    )



def _serialize_offer(db: Session, offer: TenantUpdateOffer) -> TenantUpdateOfferOut:
    package = _get_package_or_404(db, offer.release_id)
    manifest = (
        package.package_manifest_json
        if isinstance(package.package_manifest_json, dict)
        else {}
    )
    changes: list[ReleaseChangeOut] = []
    raw_changes = manifest.get("changes")
    if isinstance(raw_changes, list):
        for index, item in enumerate(raw_changes):
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            changes.append(
                ReleaseChangeOut(
                    id=index + 1,
                    release_id=package.id,
                    change_type=str(item.get("change_type") or "other").strip().lower(),
                    entity_type=item.get("entity_type"),
                    entity_id=item.get("entity_id"),
                    system_key=item.get("system_key"),
                    title=title,
                    description=item.get("description"),
                    risk_level=str(item.get("risk_level") or "low").strip().lower(),
                    created_at=package.created_at,
                )
            )
    description = package.release_notes or manifest.get("description")
    return TenantUpdateOfferOut(
        id=offer.id,
        tenant_id=offer.tenant_id,
        release_id=offer.release_id,
        from_version=offer.from_version,
        to_version=offer.to_version,
        status=offer.status,
        created_at=offer.created_at,
        applied_at=offer.applied_at,
        release_title=_package_title(package),
        release_description=str(description).strip() if description is not None else None,
        changes=changes,
    )


def _resolve_tenant_current_version(db: Session, tenant_id: int) -> str:
    current_environment = (
        db.query(PlatformEnvironmentVersion)
        .filter(PlatformEnvironmentVersion.tenant_id == tenant_id)
        .one_or_none()
    )
    if current_environment is not None and current_environment.platform_version:
        return current_environment.platform_version
    row = crud.get_tenant_version(db, tenant_id)
    if row is not None:
        return row.current_version
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal and portal.template_version:
        return portal.template_version
    return DEFAULT_INITIAL_VERSION



def _build_module_bom_from_changes(changes: list[ReleaseChangeOut | object]) -> dict[str, object]:
    modules: list[dict[str, str | None]] = []
    for index, change in enumerate(changes):
        module_key = getattr(change, "system_key", None) or f"legacy.change.{index + 1}"
        modules.append(
            {
                "module_key": str(module_key),
                "from_version": "n/a",
                "to_version": "n/a",
                "change_summary": getattr(change, "description", None),
            }
        )
    return {"modules": modules}


def _build_package_manifest(payload: PlatformReleaseCreate, *, source_tenant_id: int) -> dict[str, object]:
    return {
        "title": payload.title,
        "description": payload.description,
        "changes": [
            {
                "change_type": item.change_type,
                "title": item.title,
                "description": item.description,
                "risk_level": item.risk_level,
                "entity_type": item.entity_type,
                "entity_id": item.entity_id,
                "system_key": item.system_key,
            }
            for item in payload.changes
        ],
        "source_tenant_id": source_tenant_id,
        "created_via": "platform_releases_api_adapter",
        "governance": default_governance(),
    }


def _build_build_manifest(
    payload: PlatformReleaseCreate,
    *,
    source_tenant_id: int,
    version: str,
) -> dict[str, object]:
    return {
        "source_tenant_id": source_tenant_id,
        "title": payload.title,
        "description": payload.description,
        "changes": [
            {
                "change_type": item.change_type,
                "title": item.title,
                "description": item.description,
                "risk_level": item.risk_level,
                "entity_type": item.entity_type,
                "entity_id": item.entity_id,
                "system_key": item.system_key,
            }
            for item in payload.changes
        ],
        "created_via": "platform_releases_api_adapter",
        "schema_revision": f"api-adapter-{version}",
    }


def _next_artifact_key(prefix: str) -> str:
    now = datetime.utcnow()
    date_part = now.strftime("%Y%m%d")
    serial = uuid4().int % 10000
    return f"{prefix}-{date_part}-{serial:04d}"


def _assert_package_release_editable(package: PlatformReleasePackage) -> None:
    if package.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Релиз-пакет в статусе {package.status} нельзя редактировать",
        )
    governance_status = get_review_status(package)
    if governance_status not in {
        PlatformReleaseStatus.DRAFT.value,
        PlatformReleaseStatus.CHANGES_REQUESTED.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Релиз в статусе {governance_status} нельзя редактировать",
        )


def list_platform_releases(db: Session) -> list[PlatformReleaseListItem]:
    packages = package_registry_service.list_release_packages(db)
    return [_serialize_package_list_item(db, package) for package in packages]


def list_platform_review_queue(db: Session) -> list[PlatformReleaseListItem]:
    packages = package_registry_service.list_review_queue_packages(db)
    return [_serialize_package_list_item(db, package) for package in packages]


def count_platform_review_queue(db: Session) -> int:
    return package_registry_service.count_review_queue_packages(db)


def get_platform_release(db: Session, release_id: int) -> PlatformReleaseOut:
    package = package_registry_service.get_release_package(db, release_id)
    return _serialize_package_release_out(db, package)


def create_platform_release(
    db: Session,
    *,
    payload: PlatformReleaseCreate,
    actor: User,
) -> PlatformReleaseOut:
    dev_tenant_id = resolve_dev_tenant_portal_id(db)
    if dev_tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DEV tenant не найден",
        )

    version = _resolve_next_release_version(db)
    build_key = _next_artifact_key("BLD")
    package_key = _next_artifact_key("PKG")
    commit_sha_placeholder = "0" * 40

    build = build_registry_service.create_build(
        db,
        build_key=build_key,
        commit_sha=commit_sha_placeholder,
        schema_revision=f"api-adapter-{version}",
        build_manifest_json=_build_build_manifest(
            payload,
            source_tenant_id=dev_tenant_id,
            version=version,
        ),
        actor=actor,
    )
    build_registry_service.start_build(db, build_id=build.id)
    build = build_registry_service.mark_succeeded(db, build_id=build.id)

    package = package_registry_service.create_release_package(
        db,
        package_key=package_key,
        build_id=build.id,
        platform_version=version,
        package_manifest_json=_build_package_manifest(payload, source_tenant_id=dev_tenant_id),
        module_bom_json=_build_module_bom_from_changes(payload.changes),
        actor=actor,
    )
    package.release_notes = payload.description

    record_cursor_dev_event(
        db,
        slug=f"platform-release-created-{package.id}",
        title=f"Создан релиз платформы {package.platform_version}",
        description=(
            f"Релиз «{payload.title}» подготовлен в DEV через package adapter. "
            f"Изменений: {len(payload.changes)}."
        ),
        event_type="development",
        commit=False,
    )
    db.commit()
    db.refresh(package)
    return _serialize_package_release_out(db, package)


def update_platform_release(
    db: Session,
    *,
    release_id: int,
    payload: PlatformReleaseUpdate,
    actor: User,
) -> PlatformReleaseOut:
    package = package_registry_service.get_release_package(db, release_id)
    _assert_package_release_editable(package)

    manifest = dict(package.package_manifest_json or {})
    if payload.title is not None:
        manifest["title"] = payload.title
    if payload.description is not None:
        manifest["description"] = payload.description
        package.release_notes = payload.description
    if payload.changes is not None:
        manifest["changes"] = [
            {
                "change_type": item.change_type,
                "title": item.title,
                "description": item.description,
                "risk_level": item.risk_level,
                "entity_type": item.entity_type,
                "entity_id": item.entity_id,
                "system_key": item.system_key,
            }
            for item in payload.changes
        ]
        package.module_bom_json = _build_module_bom_from_changes(payload.changes)

    package.package_manifest_json = manifest
    db.commit()
    db.refresh(package)
    return _serialize_package_release_out(db, package)


def list_release_modules_from_package(db: Session, release_id: int) -> list[PlatformReleaseModuleOut]:
    package = package_registry_service.get_release_package(db, release_id)
    module_bom = package.module_bom_json if isinstance(package.module_bom_json, dict) else {}
    modules_raw = module_bom.get("modules")
    if not isinstance(modules_raw, list):
        return []
    result: list[PlatformReleaseModuleOut] = []
    for index, item in enumerate(modules_raw):
        if not isinstance(item, dict):
            continue
        module_key = str(item.get("module_key") or "").strip()
        if not module_key:
            continue
        result.append(
            PlatformReleaseModuleOut(
                id=index + 1,
                release_id=package.id,
                module_key=module_key,
                module_title=item.get("module_title"),
                from_version=str(item.get("from_version") or "n/a"),
                to_version=str(item.get("to_version") or "n/a"),
                change_summary=item.get("change_summary"),
            )
        )
    return result


def submit_release_for_review(
    db: Session,
    *,
    release_id: int,
    actor: User,
) -> PlatformReleaseOut:
    package = _get_package_or_404(db, release_id)
    was_resubmit = get_review_status(package) == PlatformReleaseStatus.CHANGES_REQUESTED.value
    updated = package_registry_service.submit_for_review(
        db,
        package_id=release_id,
        actor=actor,
    )
    result = _serialize_package_release_out(db, updated)
    if was_resubmit:
        record_cursor_dev_event(
            db,
            slug=f"platform-release-resubmitted-{updated.id}",
            title=f"Релиз {result.version} повторно отправлен на проверку",
            description=f"Релиз «{result.title}» повторно отправлен в Platform review.",
            event_type="development",
            commit=False,
        )
    else:
        record_cursor_dev_event(
            db,
            slug=f"platform-release-submitted-{updated.id}",
            title=f"Релиз {result.version} отправлен на проверку Platform",
            description=(
                f"Релиз «{result.title}» отправлен на проверку. "
                f"Изменений: {len(result.changes)}."
            ),
            event_type="development",
            commit=False,
        )
    db.commit()
    db.refresh(updated)
    return _serialize_package_release_out(db, updated)


def start_release_review(
    db: Session,
    *,
    release_id: int,
    actor: User,
) -> PlatformReleaseOut:
    assert_reviewer_action(actor)
    _get_package_or_404(db, release_id)
    updated = package_registry_service.start_review(
        db,
        package_id=release_id,
        actor=actor,
    )
    result = _serialize_package_release_out(db, updated)
    record_platform_event(
        db,
        event_code=PlatformEventCode.RELEASE_REVIEW_STARTED.value,
        event_category=PlatformEventCategory.TEMPLATE.value,
        title=f"Начата проверка релиза {result.version}",
        description=f"Релиз «{result.title}» взят в проверку Platform.",
        actor_user=actor,
        target_type="platform_release_package",
        target_id=updated.id,
        target_name=result.title,
        slug=f"platform-release-review-started-{updated.id}",
        commit=False,
    )
    db.commit()
    db.refresh(updated)
    return _serialize_package_release_out(db, updated)


def request_release_changes(
    db: Session,
    *,
    release_id: int,
    payload: ReviewCommentRequiredPayload,
    actor: User,
) -> PlatformReleaseOut:
    assert_reviewer_action(actor)
    _get_package_or_404(db, release_id)
    updated = package_registry_service.request_changes(
        db,
        package_id=release_id,
        comment=payload.comment,
        actor=actor,
    )
    result = _serialize_package_release_out(db, updated)
    comment = str(payload.comment or "").strip()
    record_platform_event(
        db,
        event_code=PlatformEventCode.RELEASE_CHANGES_REQUESTED.value,
        event_category=PlatformEventCategory.TEMPLATE.value,
        title=f"Релиз {result.version} возвращён на доработку",
        description=comment,
        actor_user=actor,
        target_type="platform_release_package",
        target_id=updated.id,
        target_name=result.title,
        metadata={"comment": comment},
        slug=f"platform-release-changes-requested-platform-{updated.id}",
        commit=False,
    )
    record_cursor_dev_event(
        db,
        slug=f"platform-release-changes-requested-dev-{updated.id}",
        title=f"Релиз {result.version}: требуются доработки",
        description=comment,
        event_type="fix",
        commit=False,
    )
    db.commit()
    db.refresh(updated)
    return _serialize_package_release_out(db, updated)


def approve_release(
    db: Session,
    *,
    release_id: int,
    payload: ReviewCommentPayload | None,
    actor: User,
) -> PlatformReleaseOut:
    assert_reviewer_action(actor)
    _get_package_or_404(db, release_id)
    comment = payload.comment.strip() if payload and payload.comment else None
    updated = package_registry_service.approve_package(
        db,
        package_id=release_id,
        actor=actor,
        comment=comment,
    )
    if updated.status == "draft":
        updated = package_registry_service.mark_ready(db, package_id=updated.id)
    result = _serialize_package_release_out(db, updated)
    record_platform_event(
        db,
        event_code=PlatformEventCode.RELEASE_APPROVED.value,
        event_category=PlatformEventCategory.TEMPLATE.value,
        title=f"Релиз {result.version} принят Platform",
        description=comment or f"Релиз «{result.title}» одобрен для публикации в эталон.",
        actor_user=actor,
        target_type="platform_release_package",
        target_id=updated.id,
        target_name=result.title,
        metadata={"comment": comment} if comment else None,
        slug=f"platform-release-approved-{updated.id}",
        commit=False,
    )
    db.commit()
    db.refresh(updated)
    return _serialize_package_release_out(db, updated)


def publish_release_to_template(
    db: Session,
    *,
    release_id: int,
    actor: User,
) -> PublishToTemplateResult:
    assert_reviewer_action(actor)
    package = package_registry_service.get_release_package(db, release_id)
    governance_status = get_review_status(package)
    if governance_status != PlatformReleaseStatus.APPROVED_BY_PLATFORM.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Release must be approved by platform before publishing to template.",
        )

    template_tenant_id = resolve_template_tenant_id(db)
    if template_tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Эталонный tenant (TEMPLATE) не найден",
        )
    package = package_registry_service.get_release_package(db, release_id)
    if package.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Release package must be ready before publishing to template.",
        )
    package = package_registry_service.publish_package(db, package_id=package.id)
    deployment = deployment_registry_service.create_deployment(
        db,
        deployment_key=_next_artifact_key("DPL"),
        release_package_id=package.id,
        target_environment_type=PlatformDeploymentTargetEnvironmentType.TEMPLATE.value,
        target_tenant_id=template_tenant_id,
        deployment_manifest_json={
            "created_via": "platform_releases_api_adapter",
            "schema_revision": (
                package.package_manifest_json.get("schema_revision")
                if isinstance(package.package_manifest_json, dict)
                else None
            ),
        },
        actor=None,
    )
    deployment = deployment_registry_service.start_deployment(db, deployment_id=deployment.id)
    deployment = deployment_registry_service.mark_succeeded(db, deployment_id=deployment.id)
    set_governance(
        package,
        {
            "review_status": PlatformReleaseStatus.PUBLISHED_TO_TEMPLATE.value,
            "offered_at": None,
            "offered_by": None,
        },
    )
    db.commit()
    db.refresh(package)
    release_out = _serialize_package_release_out(db, package)

    record_platform_event(
        db,
        event_code=PlatformEventCode.TEMPLATE_PUBLISHED.value,
        event_category=PlatformEventCategory.TEMPLATE.value,
        title=f"Релиз {release_out.version} опубликован в эталон",
        description=(
            f"Релиз «{release_out.title}» опубликован в platform_template "
            f"(tenant_id={template_tenant_id}) через deployment {deployment.deployment_key}. "
            "Клиентские tenants не обновлены."
        ),
        actor_user=actor,
        target_type="platform_release_package",
        target_id=package.id,
        target_name=release_out.title,
        company_id=template_tenant_id,
        metadata={
            "release_version": release_out.version,
            "template_tenant_id": template_tenant_id,
            "changes_count": len(release_out.changes),
            "deployment_id": deployment.id,
            "deployment_key": deployment.deployment_key,
        },
        slug=f"platform-release-published-template-{package.id}",
        commit=False,
    )

    db.commit()
    db.refresh(package)

    return PublishToTemplateResult(
        release=_serialize_package_release_out(db, package),
        template_tenant_id=template_tenant_id,
        template_version=release_out.version,
    )


def _list_offer_candidate_tenants(db: Session) -> list[Portal]:
    return (
        db.query(Portal)
        .filter(Portal.tenant_type == TenantType.CLIENT.value)
        .filter(Portal.tenant_status == TenantStatus.ACTIVE.value)
        .order_by(Portal.id.asc())
        .all()
    )


def offer_release_to_tenants(
    db: Session,
    *,
    release_id: int,
    actor: User,
) -> OfferToTenantsResult:
    assert_reviewer_action(actor)
    package = _get_package_or_404(db, release_id)
    if package.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Предложения доступны только для опубликованного package",
        )

    created_ids: list[int] = []
    offers_created = 0
    for portal in _list_offer_candidate_tenants(db):
        tenant_type = str(portal.tenant_type or "").upper()
        if tenant_type in EXCLUDED_OFFER_TENANT_TYPES:
            continue
        if crud.get_existing_offer_for_release(
            db,
            tenant_id=portal.id,
            release_id=package.id,
        ) is not None:
            continue
        from_version = _resolve_tenant_current_version(db, portal.id)
        crud.create_tenant_update_offer(
            db,
            tenant_id=portal.id,
            release_id=package.id,
            from_version=from_version,
            to_version=package.platform_version,
        )
        created_ids.append(portal.id)
        offers_created += 1

    set_governance(
        package,
        {
            "review_status": PlatformReleaseStatus.OFFERED_TO_TENANTS.value,
            "offered_at": datetime.utcnow().isoformat(),
            "offered_by": actor.id,
        },
    )
    record_platform_event(
        db,
        event_code=PlatformEventCode.TEMPLATE_UPDATE_SENT.value,
        event_category=PlatformEventCategory.TEMPLATE.value,
        title=f"Релиз {package.platform_version} предложен клиентским компаниям",
        description=(
            f"Создано предложений обновления: {offers_created}. "
            "DEV и platform_template исключены."
        ),
        actor_user=actor,
        target_type="platform_release_package",
        target_id=package.id,
        target_name=_package_title(package),
        metadata={
            "release_version": package.platform_version,
            "offers_created": offers_created,
            "tenant_ids": created_ids,
        },
        slug=f"platform-release-offered-tenants-{package.id}",
        commit=False,
    )
    db.commit()
    db.refresh(package)
    return OfferToTenantsResult(
        release=_serialize_package_release_out(db, package),
        offers_created=offers_created,
        tenant_ids=created_ids,
    )


def list_tenant_updates(
    db: Session,
    tenant_id: int,
    *,
    status: str | None = None,
) -> list[TenantUpdateOfferOut]:
    offers = crud.list_tenant_update_offers(db, tenant_id, status=status)
    return [_serialize_offer(db, item) for item in offers]


def apply_tenant_update(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
    actor: User,
) -> ApplyUpdateResult:
    offer = crud.get_tenant_update_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Предложение обновления не найдено",
        )

    if offer.status != TenantUpdateOfferStatus.AVAILABLE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Предложение уже обработано (status={offer.status})",
        )

    package = _get_package_or_404(db, offer.release_id)
    if package.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Применение доступно только для опубликованного package",
        )
    previous_version = _resolve_tenant_current_version(db, tenant_id)
    deployment = deployment_registry_service.create_deployment(
        db,
        deployment_key=_next_artifact_key("DPL"),
        release_package_id=package.id,
        target_environment_type=PlatformDeploymentTargetEnvironmentType.CLIENT.value,
        target_tenant_id=tenant_id,
        previous_platform_version=previous_version,
        deployment_manifest_json={"created_via": "tenant_update_apply"},
        actor=None,
    )
    deployment_registry_service.start_deployment(db, deployment_id=deployment.id)
    deployment = deployment_registry_service.mark_succeeded(db, deployment_id=deployment.id)
    now = deployment.finished_at or datetime.utcnow()
    offer.status = TenantUpdateOfferStatus.APPLIED.value
    offer.applied_at = now
    tenant_version_out = TenantVersionOut(
        tenant_id=tenant_id,
        current_version=deployment.target_platform_version,
        updated_at=now,
    )

    record_tenant_event(
        db,
        tenant_id=tenant_id,
        event_code=TenantEventCode.PLATFORM_UPDATE_APPLIED.value,
        event_category=TenantEventCategory.SYSTEM.value,
        title=f"Применено обновление платформы {offer.to_version}",
        description=(
            f"Обновление с {offer.from_version} до {offer.to_version} применено вручную. "
            f"Релиз: «{_package_title(package)}». "
            "Конфигурационные изменения не применялись автоматически."
        ),
        actor_user=actor,
        target_type="tenant_update_offer",
        target_id=offer.id,
        target_name=offer.to_version,
        metadata={
            "release_id": offer.release_id,
            "from_version": offer.from_version,
            "to_version": offer.to_version,
        },
        slug=f"tenant-update-applied-{tenant_id}-{offer.id}",
        commit=False,
    )

    db.commit()
    db.refresh(offer)

    return ApplyUpdateResult(
        offer=_serialize_offer(db, offer),
        tenant_version=tenant_version_out,
    )


def skip_tenant_update(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
    actor: User,
) -> TenantUpdateOfferOut:
    offer = crud.get_tenant_update_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Предложение обновления не найдено",
        )

    if offer.status != TenantUpdateOfferStatus.AVAILABLE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Предложение уже обработано (status={offer.status})",
        )

    offer.status = TenantUpdateOfferStatus.SKIPPED.value

    record_tenant_event(
        db,
        tenant_id=tenant_id,
        event_code=TenantEventCode.PLATFORM_UPDATE_SKIPPED.value,
        event_category=TenantEventCategory.SYSTEM.value,
        title=f"Обновление платформы {offer.to_version} отложено",
        description=(
            f"Пользователь отложил обновление с {offer.from_version} "
            f"до {offer.to_version}."
        ),
        actor_user=actor,
        target_type="tenant_update_offer",
        target_id=offer.id,
        target_name=offer.to_version,
        slug=f"tenant-update-skipped-{tenant_id}-{offer.id}",
        commit=False,
    )

    db.commit()
    db.refresh(offer)
    return _serialize_offer(db, offer)
