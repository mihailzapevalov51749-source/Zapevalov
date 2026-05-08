from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.modules.portals.router import router as portals_router
from app.modules.navigation.router import router as navigation_router
from app.modules.pages.router import router as pages_router
from app.modules.sections.router import router as sections_router
from app.modules.blocks.router import router as blocks_router
from app.modules.files.router import router as files_router
from app.modules.document_libraries.router import router as document_libraries_router
from app.modules.tables.router import router as tables_router
from app.modules.universal_tables.router import router as universal_tables_router
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Portal Constructor API",
    version="1.0.0",
)

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

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(portals_router)
app.include_router(navigation_router)
app.include_router(pages_router)
app.include_router(sections_router)
app.include_router(blocks_router)
app.include_router(files_router)
app.include_router(document_libraries_router)
app.include_router(tables_router)
app.include_router(universal_tables_router)


@app.get("/")
def read_root():
    return {"status": "ok"}