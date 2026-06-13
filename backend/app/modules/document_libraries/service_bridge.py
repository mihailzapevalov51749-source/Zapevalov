"""Secured Document Libraries service (auth + membership + navigation ownership bridge)."""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.modules.document_libraries import repository, service
from app.modules.document_libraries.models import LibraryDocument
from app.modules.document_libraries.schemas import (
    DocumentLibraryCreate,
    FolderCreate,
    LibraryDocumentCreate,
)
from app.modules.document_libraries.tenant_access import (
    assert_user_has_portal_access,
    get_document_for_library_portal,
    get_document_for_portal,
    get_library_for_portal,
    list_libraries_for_portal,
)
from app.modules.users.models import User


def _ensure_library(
    db: Session,
    current_user: User,
    portal_id: int,
    library_id: int,
):
    assert_user_has_portal_access(db, current_user, portal_id)
    library = get_library_for_portal(db, library_id, portal_id)
    if library is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Библиотека не найдена",
        )
    return library


def _ensure_document(
    db: Session,
    current_user: User,
    portal_id: int,
    document_id: int,
) -> LibraryDocument:
    assert_user_has_portal_access(db, current_user, portal_id)
    return get_document_for_portal(db, document_id, portal_id)


def create_library(
    db: Session,
    current_user: User,
    portal_id: int,
    data: DocumentLibraryCreate,
):
    assert_user_has_portal_access(db, current_user, portal_id)
    if int(data.portal_id) != int(portal_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="portal_id в теле запроса должен совпадать с tenant в URL",
        )
    return service.create_library(db, data)


def list_libraries(db: Session, current_user: User, portal_id: int):
    assert_user_has_portal_access(db, current_user, portal_id)
    return list_libraries_for_portal(db, portal_id)


def create_folder(
    db: Session,
    current_user: User,
    portal_id: int,
    library_id: int,
    data: FolderCreate,
):
    _ensure_library(db, current_user, portal_id, library_id)
    return service.create_folder(db, library_id, data)


def create_document(
    db: Session,
    current_user: User,
    portal_id: int,
    library_id: int,
    data: LibraryDocumentCreate,
):
    _ensure_library(db, current_user, portal_id, library_id)
    return service.create_document(db, library_id, data)


def upload_document(
    db: Session,
    current_user: User,
    portal_id: int,
    library_id: int,
    file: UploadFile,
    parent_id: int | None = None,
):
    _ensure_library(db, current_user, portal_id, library_id)
    return service.upload_document(db, library_id, file, parent_id)


def get_documents_by_library(
    db: Session,
    current_user: User,
    portal_id: int,
    library_id: int,
    parent_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
):
    _ensure_library(db, current_user, portal_id, library_id)
    return service.get_documents_by_library(
        db,
        library_id=library_id,
        parent_id=parent_id,
        limit=limit,
        offset=offset,
    )


def search_documents(
    db: Session,
    current_user: User,
    portal_id: int,
    library_id: int,
    query: str,
    limit: int = 200,
    offset: int = 0,
):
    _ensure_library(db, current_user, portal_id, library_id)
    return service.search_documents(
        db,
        library_id=library_id,
        query=query,
        limit=limit,
        offset=offset,
    )


def get_document_by_id(
    db: Session,
    current_user: User,
    portal_id: int,
    library_id: int,
    document_id: int,
):
    assert_user_has_portal_access(db, current_user, portal_id)
    return get_document_for_library_portal(
        db,
        document_id,
        library_id,
        portal_id,
    )


def get_document_by_id_legacy(
    db: Session,
    current_user: User,
    portal_id: int,
    document_id: int,
):
    return _ensure_document(db, current_user, portal_id, document_id)


def get_document_by_file_key(
    db: Session,
    current_user: User,
    portal_id: int,
    library_id: int,
    file_key: str,
):
    _ensure_library(db, current_user, portal_id, library_id)
    normalized_key = str(file_key or "").strip()
    if not normalized_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ключ файла не указан",
        )

    document = (
        db.query(LibraryDocument)
        .filter(
            LibraryDocument.library_id == int(library_id),
            or_(
                LibraryDocument.file_path.ilike(f"%{normalized_key}%"),
                LibraryDocument.original_filename.ilike(f"%{normalized_key}%"),
                LibraryDocument.title.ilike(f"%{normalized_key}%"),
            ),
        )
        .order_by(LibraryDocument.id.desc())
        .first()
    )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Документ не найден",
        )
    return document


def delete_document(
    db: Session,
    current_user: User,
    portal_id: int,
    document_id: int,
    mode: str = "folder_only",
):
    _ensure_document(db, current_user, portal_id, document_id)
    return service.delete_document(db, document_id, mode)


def rename_document(
    db: Session,
    current_user: User,
    portal_id: int,
    document_id: int,
    title: str,
):
    _ensure_document(db, current_user, portal_id, document_id)
    return service.rename_document(db, document_id, title)


def move_document(
    db: Session,
    current_user: User,
    portal_id: int,
    document_id: int,
    parent_id: int | None,
):
    _ensure_document(db, current_user, portal_id, document_id)
    return service.move_document(
        db,
        document_id=document_id,
        parent_id=parent_id,
    )


def resolve_document_download_path(document: LibraryDocument) -> tuple[Path, str]:
    if document.is_folder or not document.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл документа не найден",
        )

    relative_path = str(document.file_path).lstrip("/")
    full_path = service.BASE_DIR / relative_path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл документа не найден на диске",
        )

    download_name = (
        str(document.original_filename or "").strip()
        or str(document.title or "").strip()
        or full_path.name
    )
    return full_path, download_name


def download_document(
    db: Session,
    current_user: User,
    portal_id: int,
    document_id: int,
):
    document = _ensure_document(db, current_user, portal_id, document_id)
    return resolve_document_download_path(document)
