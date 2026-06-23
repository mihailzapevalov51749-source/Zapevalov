from app.core.runtime_paths import UPLOADS_DIR, get_uploads_dir

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.company_runtime_middleware import CompanyRuntimeDatabaseMiddleware
from app.core.cors_config import get_cors_middleware_kwargs
from app.core.environment_guard import run_environment_guard
from app.init_db import init_db

from app.modules.portals.router import router as portals_router
from app.modules.navigation.router import router as navigation_router
from app.modules.pages.router import router as pages_router
from app.modules.sections.router import router as sections_router
from app.modules.blocks.router import router as blocks_router
from app.modules.files.router import router as files_router

from app.modules.document_libraries.router import (
    router as document_libraries_router,
)
from app.modules.document_libraries.bridge_router import (
    document_download_bridge_router,
    document_libraries_bridge_router,
)

from app.modules.auth.router import router as auth_router
from app.modules.control_plane.platform_identity.profile_router import (
    router as platform_identity_profile_router,
)
from app.modules.control_plane.platform_identity.session_bridge.router import (
    router as session_bridge_router,
)
from app.modules.users.router import router as users_router

from app.modules.comments.router import router as comments_router

from app.modules.notifications.router import (
    router as notifications_router,
)

from app.modules.checklists.router import (
    router as checklists_router,
)

from app.modules.notes.router import (
    router as notes_router,
)

from app.modules.user_activity.router import (
    router as user_activity_router,
)

from app.modules.quality_issues.router import (
    router as quality_issues_router,
)

from app.modules.platform_event_journal.router import (
    router as platform_event_journal_router,
)

from app.modules.chats.router import router as chats_router

from app.modules.calendar.router import router as calendar_router
from app.modules.tenant_users.me_router import router as tenant_me_router

from app.modules.platform.designer.router import router as platform_designer_router
from app.modules.platform.architecture_navigator.bootstrap import (
    register_architecture_navigator_routes,
)
from app.modules.platform.architecture_governance.bootstrap import (
    register_architecture_governance_routes,
)
from app.modules.platform.search.router import platform_search_router
from app.modules.platform.runtime.router import router as platform_runtime_router
from app.modules.platform.workspace_tabs.router import workspace_tabs_router
from app.modules.ai_context.router import router as ai_context_router
from app.modules.yasii.router import router as yasii_router
from app.modules.control_plane.router import router as control_plane_router
from app.modules.platform_release.router import router as platform_release_router
from app.modules.platform_release_diff.router import router as platform_release_diff_router
from app.modules.platform_module_publications.router import router as platform_module_publications_router
from app.modules.platform_release.tenant_router import router as tenant_updates_router
from app.modules.platform_version_registry.router import router as platform_version_registry_router
from app.modules.platform_migration_rollback.router import (
    router as platform_migration_rollback_router,
)
from app.modules.platform_modules.router import router as platform_modules_router
from app.modules.tenant_module_configurations.runtime.router import (
    platform_runtime_configuration_router,
)
from app.modules.platform_modules.manifest_router import manifests_router as platform_module_manifests_router
from app.modules.platform_modules.version_router import versions_router as platform_module_versions_router
from app.modules.tenant_modules.router import router as tenant_modules_router
from app.modules.platform_release_package_registry.router import (
    router as platform_release_package_registry_router,
)
from app.modules.platform_deployment_registry.router import (
    router as platform_deployment_registry_router,
)
from app.modules.platform_build_registry.router import (
    router as platform_build_registry_router,
)
from app.modules.tenant_module_update_offers.router import (
    platform_offers_router,
    tenant_offers_router,
)
from app.modules.tenant_module_update_previews.router import (
    platform_previews_router,
    tenant_previews_router,
)
from app.modules.tenant_module_configurations.router import (
    platform_configurations_router,
    tenant_configurations_router,
)
from app.modules.tenant_module_configuration_diffs.router import (
    platform_configuration_diffs_router,
    tenant_configuration_diffs_router,
)
from app.modules.tenant_module_configuration_applies.router import (
    platform_applies_router,
    tenant_applies_router,
)
from app.modules.tenant_module_configuration_rollbacks.router import (
    platform_rollbacks_router,
    tenant_rollbacks_router,
)

# Регистрация ORM в metadata (platform). Platform DDL — только через Alembic.
from app.modules.platform.designer.object_types.models import (  # noqa: F401
    DesignerObjectType,
)


UPLOADS_DIR = get_uploads_dir()

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Portal Constructor API",
    version="1.0.0",
)

# ENVIRONMENT GUARD (before any DB bootstrap side effects)
run_environment_guard()

# INIT DATABASE
init_db()

app.add_middleware(CompanyRuntimeDatabaseMiddleware)
app.add_middleware(
    CORSMiddleware,
    **get_cors_middleware_kwargs(),
)

for _uploads_subdir in ("icons", "images", "avatars"):
    _subdir_path = UPLOADS_DIR / _uploads_subdir
    _subdir_path.mkdir(parents=True, exist_ok=True)
    app.mount(
        f"/uploads/{_uploads_subdir}",
        StaticFiles(directory=str(_subdir_path)),
        name=f"uploads-{_uploads_subdir}",
    )

# AUTH
app.include_router(auth_router)
app.include_router(session_bridge_router)
app.include_router(platform_identity_profile_router)
app.include_router(users_router)

# PORTALS
app.include_router(portals_router)
app.include_router(navigation_router)
app.include_router(pages_router)
app.include_router(sections_router)
app.include_router(blocks_router)

# FILES
app.include_router(files_router)
app.include_router(document_libraries_router)
app.include_router(document_libraries_bridge_router)
app.include_router(document_download_bridge_router)

# COMMENTS
app.include_router(comments_router)

# CHATS
app.include_router(chats_router)

# CALENDAR
app.include_router(calendar_router)
app.include_router(tenant_me_router)

# NOTIFICATIONS
app.include_router(notifications_router)

# CHECKLISTS
app.include_router(checklists_router)

# NOTES
app.include_router(notes_router)

# USER ACTIVITY
app.include_router(user_activity_router)

# QUALITY ISSUES
app.include_router(quality_issues_router)

# PLATFORM EVENT JOURNAL
app.include_router(platform_event_journal_router)

# PLATFORM DESIGNER
app.include_router(platform_designer_router)
register_architecture_navigator_routes(app)
register_architecture_governance_routes(app)

# PLATFORM RUNTIME (published metadata catalog)
app.include_router(platform_runtime_router)

# GLOBAL WORKSPACE TABS (per-user pinned pages)
app.include_router(workspace_tabs_router)

# PLATFORM SEARCH (unified runtime + designer)
app.include_router(platform_search_router)

# YASII (skeleton — P1-W01)
app.include_router(yasii_router)

# AI Context Engine / ACE (skeleton — P1-W02)
app.include_router(ai_context_router)

# Control Plane — platform management (customer companies, provisioning)
app.include_router(control_plane_router)

# Platform release pipeline
app.include_router(platform_release_diff_router)
app.include_router(platform_release_router)
app.include_router(platform_release_package_registry_router)
app.include_router(platform_deployment_registry_router)
app.include_router(platform_build_registry_router)
app.include_router(platform_version_registry_router)
app.include_router(platform_migration_rollback_router)
app.include_router(platform_module_publications_router)
app.include_router(tenant_updates_router)

# Platform modules registry (read-only MVP)
app.include_router(platform_modules_router)
app.include_router(platform_runtime_configuration_router)
app.include_router(platform_module_manifests_router)
app.include_router(platform_module_versions_router)

# Tenant modules registry (read-only MVP)
app.include_router(tenant_modules_router)
app.include_router(tenant_offers_router)
app.include_router(platform_offers_router)
app.include_router(tenant_previews_router)
app.include_router(platform_previews_router)

# Tenant module configurations (read-only MVP)
app.include_router(tenant_configurations_router)
app.include_router(platform_configurations_router)

# Tenant module configuration diffs (read-only MVP)
app.include_router(tenant_configuration_diffs_router)
app.include_router(platform_configuration_diffs_router)

# Tenant module configuration applies (Apply MVP)
app.include_router(tenant_applies_router)
app.include_router(platform_applies_router)

# Tenant module configuration rollbacks (Rollback MVP)
app.include_router(tenant_rollbacks_router)
app.include_router(platform_rollbacks_router)


@app.get("/")
def read_root():
    return {
        "status": "ok",
    }