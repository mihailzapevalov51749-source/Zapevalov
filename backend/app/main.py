from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

from app.modules.universal_tables.router import (
    router as universal_tables_router,
)

from app.modules.universal_views.router import (
    router as universal_views_router,
)

from app.modules.auth.router import router as auth_router
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

from app.modules.quality_issues.router import (
    router as quality_issues_router,
)

from app.modules.platform_dashboard.router import (
    router as platform_dashboard_router,
)

from app.modules.chats.router import router as chats_router

from app.modules.platform.designer.router import router as platform_designer_router
from app.modules.platform.search.router import platform_search_router
from app.modules.platform.runtime.router import router as platform_runtime_router

# Регистрация ORM в metadata (legacy + platform). Platform DDL — только через Alembic.
from app.modules.universal_views import models as universal_views_models  # noqa: F401
from app.modules.platform.designer.object_types.models import (  # noqa: F401
    DesignerObjectType,
)


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Portal Constructor API",
    version="1.0.0",
)

# INIT DATABASE
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads",
)

# AUTH
app.include_router(auth_router)
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

app.include_router(universal_tables_router)
app.include_router(universal_views_router)

# COMMENTS
app.include_router(comments_router)

# CHATS
app.include_router(chats_router)

# NOTIFICATIONS
app.include_router(notifications_router)

# CHECKLISTS
app.include_router(checklists_router)

# NOTES
app.include_router(notes_router)

# QUALITY ISSUES
app.include_router(quality_issues_router)

# PLATFORM DASHBOARD
app.include_router(platform_dashboard_router)

# PLATFORM DESIGNER
app.include_router(platform_designer_router)

# PLATFORM RUNTIME (published metadata catalog)
app.include_router(platform_runtime_router)

# PLATFORM SEARCH (unified runtime + designer)
app.include_router(platform_search_router)


@app.get("/")
def read_root():
    return {
        "status": "ok",
    }