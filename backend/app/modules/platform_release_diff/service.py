"""DEV vs TEMPLATE platform release diff (WI-RELEASE-DIFF-001)."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.runtime_paths import try_dev_monorepo_root
from app.modules.platform.architecture_navigator.architecture_file_owner import (
    registry_for_component,
    resolve_file_owner,
)
from app.modules.platform.architecture_navigator.catalog import CATALOG_COMPONENTS
from app.modules.platform_publish_orchestrator.template_runtime_activation import (
    resolve_active_template_release_id,
)
from app.modules.platform_release_diff.constants import (
    INCLUDED_ARCHITECTURAL_ELEMENTS_KEY,
    RELEASE_DIFF_MANIFEST_KEY,
)
from app.modules.platform_release_diff.file_inventory import (
    compare_file_maps,
    iter_backend_app_files,
    iter_frontend_src_files,
    iter_git_frontend_src_files,
)
from app.modules.platform_release_diff.schemas import (
    ReleaseDiffCompareOut,
    ReleaseDiffElementOut,
    ReleaseDiffFileOut,
)
from app.modules.platform_release_provenance.runtime_artifacts import (
    get_suite_root,
    load_physical_manifest,
    resolve_release_dir,
)
from app.modules.platform_deployment_registry.constants import (
    PlatformDeploymentStatus,
    PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release_package_registry.models import PlatformReleasePackage


_COMPONENT_TITLES: dict[str, str] = {
    str(row.get("component_key")): str(row.get("title") or row.get("technical_name") or row.get("component_key"))
    for row in CATALOG_COMPONENTS
    if row.get("component_key")
}


@dataclass(frozen=True)
class CompareRoots:
    dev_backend_app: Path
    dev_frontend_src: Path
    template_backend_app: Path
    template_frontend_src: Path | None
    template_release_id: str | None
    template_git_commit: str | None
    template_platform_version: str | None
    frontend_baseline: str
    repo_root: Path


def _component_title(component_key: str) -> str:
    return _COMPONENT_TITLES.get(component_key, component_key)


def _resolve_latest_template_package(db: Session | None) -> PlatformReleasePackage | None:
    if db is None:
        return None
    try:
        deployment = (
            db.query(PlatformDeployment)
            .filter(
                PlatformDeployment.target_environment_type
                == PlatformDeploymentTargetEnvironmentType.TEMPLATE.value,
                PlatformDeployment.status == PlatformDeploymentStatus.SUCCEEDED.value,
            )
            .order_by(PlatformDeployment.id.desc())
            .first()
        )
    except Exception:
        return None
    if deployment is None or deployment.release_package_id is None:
        return None
    return (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.id == deployment.release_package_id)
        .one_or_none()
    )


def resolve_compare_roots(
    db: Session | None = None,
    *,
    dev_backend_app: Path | None = None,
    dev_frontend_src: Path | None = None,
    template_backend_app: Path | None = None,
    template_frontend_src: Path | None = None,
) -> CompareRoots:
    """Resolve DEV monorepo and active TEMPLATE runtime code roots."""
    if dev_backend_app is not None and dev_frontend_src is not None:
        repo_root = dev_backend_app.parent.parent
        return CompareRoots(
            dev_backend_app=dev_backend_app,
            dev_frontend_src=dev_frontend_src,
            template_backend_app=template_backend_app or dev_backend_app,
            template_frontend_src=template_frontend_src,
            template_release_id=None,
            template_git_commit=None,
            template_platform_version=None,
            frontend_baseline="injected",
            repo_root=repo_root,
        )

    repo_root = try_dev_monorepo_root()
    if repo_root is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Сравнение доступно только в DEV-контуре с monorepo layout",
        )

    resolved_dev_backend = repo_root / "backend" / "app"
    resolved_dev_frontend = repo_root / "frontend" / "src"
    if not resolved_dev_backend.is_dir() or not resolved_dev_frontend.is_dir():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DEV backend/app или frontend/src не найдены",
        )

    suite_root = get_suite_root()
    release_id = resolve_active_template_release_id(suite_root)
    template_git_commit: str | None = None
    template_platform_version: str | None = None
    frontend_baseline = "runtime"

    try:
        release_dir = resolve_release_dir(
            suite_root=suite_root,
            runtime_slot_key="template",
            release_id=release_id,
            use_current=release_id is None,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"TEMPLATE runtime недоступен: {exc}",
        ) from exc

    resolved_template_backend = release_dir / "backend" / "app"
    if not resolved_template_backend.is_dir():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TEMPLATE backend/app не найден в активном runtime release",
        )

    resolved_template_frontend = release_dir / "frontend" / "src"
    if not resolved_template_frontend.is_dir():
        resolved_template_frontend = None

    manifest_path = release_dir / "manifest.json"
    if manifest_path.is_file():
        manifest = load_physical_manifest(manifest_path)
        template_git_commit = str(manifest.get("git_commit") or "").strip().lower() or None
        if resolved_template_frontend is None and template_git_commit:
            frontend_baseline = "git_commit"

    latest_package = _resolve_latest_template_package(db)
    if latest_package is not None:
        template_platform_version = latest_package.platform_version

    return CompareRoots(
        dev_backend_app=resolved_dev_backend,
        dev_frontend_src=resolved_dev_frontend,
        template_backend_app=resolved_template_backend,
        template_frontend_src=resolved_template_frontend,
        template_release_id=release_id,
        template_git_commit=template_git_commit,
        template_platform_version=template_platform_version,
        frontend_baseline=frontend_baseline,
        repo_root=repo_root,
    )


def _classify_file(path: str, side: str) -> ReleaseDiffFileOut:
    if side == "backend":
        canonical = f"backend/app/{path}"
    else:
        canonical = f"frontend/src/{path}"
    owner = resolve_file_owner(canonical)
    return ReleaseDiffFileOut(
        path=canonical,
        change_type="",
        side=side,
        primary_owner=owner.primary_owner,
        registry=owner.registry,
        related_elements=owner.related_elements,
    )


def compare_dev_template(
    db: Session | None = None,
    *,
    dev_backend_app: Path | None = None,
    dev_frontend_src: Path | None = None,
    template_backend_app: Path | None = None,
    template_frontend_src: Path | None = None,
) -> ReleaseDiffCompareOut:
    """Compare DEV monorepo code vs active TEMPLATE runtime release."""
    roots = resolve_compare_roots(
        db,
        dev_backend_app=dev_backend_app,
        dev_frontend_src=dev_frontend_src,
        template_backend_app=template_backend_app,
        template_frontend_src=template_frontend_src,
    )

    dev_backend_map = iter_backend_app_files(roots.dev_backend_app)
    template_backend_map = iter_backend_app_files(roots.template_backend_app)
    backend_changes = compare_file_maps(dev_backend_map, template_backend_map)

    dev_frontend_map = iter_frontend_src_files(roots.dev_frontend_src)
    if roots.template_frontend_src is not None:
        template_frontend_map = iter_frontend_src_files(roots.template_frontend_src)
        frontend_baseline = "runtime_src"
    elif roots.template_git_commit:
        template_frontend_map = iter_git_frontend_src_files(
            roots.repo_root,
            roots.template_git_commit,
        )
        frontend_baseline = "git_commit"
    else:
        template_frontend_map = {}
        frontend_baseline = "unavailable"
    frontend_changes = compare_file_maps(dev_frontend_map, template_frontend_map)

    changed_files: list[ReleaseDiffFileOut] = []
    unchanged_count = 0

    for rel, change_type in backend_changes:
        item = _classify_file(rel, "backend")
        item.change_type = change_type
        changed_files.append(item)

    all_backend = set(dev_backend_map) | set(template_backend_map)
    unchanged_count += len(all_backend) - len(backend_changes)

    for rel, change_type in frontend_changes:
        item = _classify_file(rel, "frontend")
        item.change_type = change_type
        changed_files.append(item)

    all_frontend = set(dev_frontend_map) | set(template_frontend_map)
    unchanged_count += len(all_frontend) - len(frontend_changes)

    grouped: dict[str, list[ReleaseDiffFileOut]] = defaultdict(list)
    for item in changed_files:
        grouped[item.primary_owner].append(item)

    elements: list[ReleaseDiffElementOut] = []
    for component_key in sorted(grouped):
        files = sorted(grouped[component_key], key=lambda row: row.path)
        elements.append(
            ReleaseDiffElementOut(
                component_key=component_key,
                title=_component_title(component_key),
                registry=registry_for_component(component_key),
                files_count=len(files),
                files=files,
            )
        )

    changed_count = len(changed_files)
    has_changes = changed_count > 0
    message = None
    if not has_changes:
        message = "DEV и TEMPLATE совпадают. Нет изменений для публикации."

    return ReleaseDiffCompareOut(
        changed_files=changed_count,
        changed_elements=len(elements),
        unchanged_files=unchanged_count,
        has_changes=has_changes,
        dev_matches_template=not has_changes,
        template_release_id=roots.template_release_id,
        template_platform_version=roots.template_platform_version,
        template_git_commit=roots.template_git_commit,
        frontend_baseline=frontend_baseline,
        elements=elements,
        files=changed_files,
        message=message,
    )


def validate_architectural_element_selection(
    diff: ReleaseDiffCompareOut,
    selected_keys: list[str],
) -> None:
    if not diff.has_changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=diff.message or "DEV и TEMPLATE совпадают. Создание релиза запрещено.",
        )
    if not selected_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Выберите архитектурные элементы после сравнения DEV и TEMPLATE",
        )
    allowed = {element.component_key for element in diff.elements}
    unknown = sorted(set(selected_keys) - allowed)
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Элементы не найдены в результате сравнения: {', '.join(unknown)}",
        )


def attach_release_diff_to_manifest(
    manifest: dict[str, Any],
    *,
    diff: ReleaseDiffCompareOut,
    selected_architectural_elements: list[str],
) -> dict[str, Any]:
    manifest = dict(manifest)
    manifest[INCLUDED_ARCHITECTURAL_ELEMENTS_KEY] = sorted(set(selected_architectural_elements))
    manifest[RELEASE_DIFF_MANIFEST_KEY] = {
        "changed_files": diff.changed_files,
        "changed_elements": diff.changed_elements,
        "template_release_id": diff.template_release_id,
        "template_platform_version": diff.template_platform_version,
        "selected_architectural_elements": sorted(set(selected_architectural_elements)),
        "frontend_baseline": diff.frontend_baseline,
    }
    return manifest
