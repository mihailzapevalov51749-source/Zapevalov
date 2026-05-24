from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(prefix="/files", tags=["Files"])

# backend/app/modules/files/router.py
# parents:
# 0 = backend/app/modules/files
# 1 = backend/app/modules
# 2 = backend/app
# 3 = backend
BACKEND_DIR = Path(__file__).resolve().parents[3]
UPLOADS_DIR = BACKEND_DIR / "uploads"

ICONS_DIR = UPLOADS_DIR / "icons"
IMAGES_DIR = UPLOADS_DIR / "images"
AVATARS_DIR = UPLOADS_DIR / "avatars"
DOCUMENTS_DIR = UPLOADS_DIR / "documents"

ICONS_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg", ".gif", ".webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".txt"}
ALLOWED_FILE_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=DOCUMENTS_DIR,
        allowed_extensions=ALLOWED_FILE_EXTENSIONS,
        url_prefix="/files/documents",
        error_text="Недопустимый формат файла",
    )


@router.post("/upload-icon")
async def upload_icon(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=ICONS_DIR,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        url_prefix="/files/icons",
        error_text="Недопустимый формат иконки",
    )


@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=IMAGES_DIR,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        url_prefix="/files/images",
        error_text="Недопустимый формат изображения",
    )


@router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=AVATARS_DIR,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        url_prefix="/files/avatars",
        error_text="Недопустимый формат аватара",
    )


@router.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    return await save_file(
        file=file,
        target_dir=DOCUMENTS_DIR,
        allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS,
        url_prefix="/files/documents",
        error_text="Недопустимый формат документа",
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
    original_file_name = file.filename or "file"
    suffix = Path(original_file_name).suffix.lower()

    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"{error_text}. Разрешены: {', '.join(sorted(allowed_extensions))}",
        )

    content = await file.read()

    file_uid = uuid4().hex
    stored_file_name = f"{file_uid}{suffix}"
    file_path = target_dir / stored_file_name

    file_path.write_bytes(content)

    file_url = f"{url_prefix}/{stored_file_name}"

    return {
        "id": stored_file_name,
        "file_id": stored_file_name,
        "fileId": stored_file_name,
        "file_uid": file_uid,
        "fileUid": file_uid,
        "file_url": file_url,
        "fileUrl": file_url,
        "file_name": original_file_name,
        "fileName": original_file_name,
        "stored_file_name": stored_file_name,
        "storedFileName": stored_file_name,
        "file_type": file.content_type,
        "fileType": file.content_type,
        "file_size": len(content),
        "fileSize": len(content),
    }


def get_file(directory: Path, file_name: str):
    safe_directory = directory.resolve()
    file_path = (safe_directory / file_name).resolve()

    if safe_directory not in file_path.parents and file_path != safe_directory:
        raise HTTPException(status_code=400, detail="Некорректный путь к файлу")

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")

    return FileResponse(file_path)