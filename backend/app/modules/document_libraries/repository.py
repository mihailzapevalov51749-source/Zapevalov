from sqlalchemy.orm import Session

from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument


def create_library(db: Session, title: str, description: str | None):
    library = DocumentLibrary(
        title=title,
        description=description,
    )
    db.add(library)
    db.commit()
    db.refresh(library)
    return library


def get_libraries(db: Session):
    return db.query(DocumentLibrary).order_by(DocumentLibrary.id.desc()).all()


def get_library_by_id(db: Session, library_id: int):
    return (
        db.query(DocumentLibrary)
        .filter(DocumentLibrary.id == library_id)
        .first()
    )


# 🔴 ОБНОВЛЕНО: добавили created_by
def create_document(
    db: Session,
    library_id: int,
    title: str,
    document_type: str,
    file_path: str | None,
    original_filename: str | None = None,
    parent_id: int | None = None,
    is_folder: bool = False,
    created_by: str | None = None,
):
    document = LibraryDocument(
        library_id=library_id,
        parent_id=parent_id,
        title=title,
        document_type=document_type,
        file_path=file_path,
        original_filename=original_filename,
        is_folder=is_folder,
        created_by=created_by,  # 🔴 добавлено
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


def create_folder(
    db: Session,
    library_id: int,
    title: str,
    parent_id: int | None = None,
):
    folder = LibraryDocument(
        library_id=library_id,
        parent_id=parent_id,
        title=title,
        document_type="folder",
        file_path=None,
        original_filename=None,
        is_folder=True,
        created_by="Михаил",  # 🔴 можно сразу ставить автора
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return folder


# 🔴 НОВОЕ: база для пагинации
def get_documents_query(
    db: Session,
    library_id: int,
    parent_id: int | None = None,
):
    query = db.query(LibraryDocument).filter(
        LibraryDocument.library_id == library_id
    )

    if parent_id is None:
        query = query.filter(LibraryDocument.parent_id.is_(None))
    else:
        query = query.filter(LibraryDocument.parent_id == parent_id)

    return query


# (оставляем для совместимости, но теперь не используется сервисом)
def get_documents_by_library(
    db: Session,
    library_id: int,
    parent_id: int | None = None,
):
    return (
        get_documents_query(db, library_id, parent_id)
        .order_by(LibraryDocument.is_folder.desc(), LibraryDocument.id.desc())
        .all()
    )


def get_children(db: Session, parent_id: int):
    return (
        db.query(LibraryDocument)
        .filter(LibraryDocument.parent_id == parent_id)
        .order_by(LibraryDocument.is_folder.desc(), LibraryDocument.id.desc())
        .all()
    )


def get_document_by_id(db: Session, document_id: int):
    return (
        db.query(LibraryDocument)
        .filter(LibraryDocument.id == document_id)
        .first()
    )


def delete_document(db: Session, document_id: int):
    document = get_document_by_id(db, document_id)

    if not document:
        return None

    db.delete(document)
    db.commit()

    return document


def update_document_title(db: Session, document_id: int, title: str):
    document = get_document_by_id(db, document_id)

    if not document:
        return None

    document.title = title
    db.commit()
    db.refresh(document)

    return document