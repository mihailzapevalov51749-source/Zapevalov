from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/files", tags=["Files"])

BASE_DIR = Path(__file__).resolve().parents[4]
UPLOADS_DIR = BASE_DIR / "uploads"

ICONS_DIR = UPLOADS_DIR / "icons"
IMAGES_DIR = UPLOADS_DIR / "images"
AVATARS_DIR = UPLOADS_DIR / "avatars"
DOCUMENTS_DIR = UPLOADS_DIR / "documents"

ICONS_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg", ".gif", ".webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".xlsx"}


@router.post("/upload-icon")
async def upload_icon(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=ICONS_DIR,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        url_prefix="/files/icons",
        error_text="Недопустимый формат иконки"
    )


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=IMAGES_DIR,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        url_prefix="/files/images",
        error_text="Недопустимый формат изображения"
    )


@router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=AVATARS_DIR,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        url_prefix="/files/avatars",
        error_text="Недопустимый формат аватара"
    )


@router.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=DOCUMENTS_DIR,
        allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS,
        url_prefix="/files/documents",
        error_text="Недопустимый формат документа"
    )


@router.get("/icons/{file_name}")
def get_icon(file_name: str):
    return get_file(ICONS_DIR, file_name)


@router.get("/images/{file_name}")
def get_image(file_name: str):
    return get_file(IMAGES_DIR, file_name)


@router.get("/avatars/{file_name}")
def get_avatar(file_name: str):
    return get_file(AVATARS_DIR, file_name)


@router.get("/documents/{file_name}")
def get_document(file_name: str):
    return get_file(DOCUMENTS_DIR, file_name)


async def save_file(
    file: UploadFile,
    target_dir: Path,
    allowed_extensions: set[str],
    url_prefix: str,
    error_text: str,
):
    suffix = Path(file.filename).suffix.lower()

    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"{error_text}. Разрешены: {', '.join(sorted(allowed_extensions))}"
        )

    file_name = f"{uuid4().hex}{suffix}"
    file_path = target_dir / file_name

    content = await file.read()
    file_path.write_bytes(content)

    return {
        "file_url": f"{url_prefix}/{file_name}",
        "file_name": file.filename,
        "stored_file_name": file_name,
    }


def get_file(directory: Path, file_name: str):
    file_path = directory / file_name

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")

    return FileResponse(file_path)