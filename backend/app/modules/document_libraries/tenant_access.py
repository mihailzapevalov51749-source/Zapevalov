"""Tenant isolation bridge for Document Libraries (navigation-owned until ADR-008)."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument
from app.modules.navigation.models import NavigationItem
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User

LIBRARY_PORTAL_FORBIDDEN_DETAIL = "Библиотека недоступна в текущем tenant"
DOCUMENT_PORTAL_FORBIDDEN_DETAIL = "Документ недоступен в текущем tenant"
DOCUMENT_LIBRARY_FORBIDDEN_DETAIL = "Документ не принадлежит указанной библиотеке"
PORTAL_ACCESS_FORBIDDEN_DETAIL = "Нет доступа к компании"


def assert_user_has_portal_access(
    db: Session,
    current_user: User,
    portal_id: int,
) -> None:
    normalized_portal_id = int(portal_id)
    if normalized_portal_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Некорректный tenant (portal)",
        )

    if user_has_tenant_access(db, current_user, normalized_portal_id):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=PORTAL_ACCESS_FORBIDDEN_DETAIL,
    )


def portal_ids_for_library(db: Session, library_id: int) -> list[int]:
    rows = (
        db.query(NavigationItem.portal_id)
        .filter(
            NavigationItem.library_id == int(library_id),
            NavigationItem.portal_id.isnot(None),
        )
        .distinct()
        .all()
    )

    portal_ids: list[int] = []
    for (portal_id,) in rows:
        if portal_id is None:
            continue
        try:
            normalized = int(portal_id)
        except (TypeError, ValueError):
            continue
        if normalized > 0 and normalized not in portal_ids:
            portal_ids.append(normalized)
    return portal_ids


def library_belongs_to_portal(db: Session, library_id: int, portal_id: int) -> bool:
    return int(portal_id) in portal_ids_for_library(db, library_id)


def get_library_for_portal(
    db: Session,
    library_id: int,
    portal_id: int,
) -> DocumentLibrary | None:
    library = (
        db.query(DocumentLibrary)
        .filter(DocumentLibrary.id == int(library_id))
        .first()
    )
    if library is None:
        return None

    if not library_belongs_to_portal(db, library_id, portal_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=LIBRARY_PORTAL_FORBIDDEN_DETAIL,
        )

    return library


def list_library_ids_for_portal(db: Session, portal_id: int) -> list[int]:
    rows = (
        db.query(NavigationItem.library_id)
        .filter(
            NavigationItem.portal_id == int(portal_id),
            NavigationItem.library_id.isnot(None),
        )
        .distinct()
        .all()
    )

    library_ids: list[int] = []
    for (library_id,) in rows:
        if library_id is None:
            continue
        try:
            normalized = int(library_id)
        except (TypeError, ValueError):
            continue
        if normalized > 0 and normalized not in library_ids:
            library_ids.append(normalized)
    return library_ids


def list_libraries_for_portal(db: Session, portal_id: int) -> list[DocumentLibrary]:
    library_ids = list_library_ids_for_portal(db, portal_id)
    if not library_ids:
        return []

    return (
        db.query(DocumentLibrary)
        .filter(DocumentLibrary.id.in_(library_ids))
        .order_by(DocumentLibrary.id.desc())
        .all()
    )


def get_document_for_library_portal(
    db: Session,
    document_id: int,
    library_id: int,
    portal_id: int,
) -> LibraryDocument:
    get_library_for_portal(db, library_id, portal_id)

    document = (
        db.query(LibraryDocument)
        .filter(LibraryDocument.id == int(document_id))
        .first()
    )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Документ не найден",
        )

    if int(document.library_id) != int(library_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=DOCUMENT_LIBRARY_FORBIDDEN_DETAIL,
        )

    return document


def get_document_for_portal(
    db: Session,
    document_id: int,
    portal_id: int,
) -> LibraryDocument:
    document = (
        db.query(LibraryDocument)
        .filter(LibraryDocument.id == int(document_id))
        .first()
    )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Документ не найден",
        )

    if not library_belongs_to_portal(db, document.library_id, portal_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=DOCUMENT_PORTAL_FORBIDDEN_DETAIL,
        )

    return document


def find_library_document_by_storage_name(
    db: Session,
    file_name: str,
) -> LibraryDocument | None:
    normalized_name = str(file_name or "").strip()
    if not normalized_name:
        return None

    return (
        db.query(LibraryDocument)
        .filter(
            LibraryDocument.file_path.isnot(None),
            LibraryDocument.file_path.ilike(f"%/{normalized_name}"),
        )
        .order_by(LibraryDocument.id.desc())
        .first()
    )
