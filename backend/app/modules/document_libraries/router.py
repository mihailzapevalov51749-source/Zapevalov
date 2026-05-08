from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.document_libraries import service, schemas


router = APIRouter(
    prefix="/document-libraries",
    tags=["Document Libraries"],
)


@router.post("/", response_model=schemas.DocumentLibraryResponse)
def create_library(
    data: schemas.DocumentLibraryCreate,
    db: Session = Depends(get_db),
):
    return service.create_library(db, data)


@router.get("/", response_model=list[schemas.DocumentLibraryResponse])
def get_libraries(
    db: Session = Depends(get_db),
):
    return service.get_libraries(db)


@router.post(
    "/{library_id}/folders",
    response_model=schemas.LibraryDocumentResponse,
)
def create_folder(
    library_id: int,
    data: schemas.FolderCreate,
    db: Session = Depends(get_db),
):
    return service.create_folder(db, library_id, data)


@router.post(
    "/{library_id}/documents",
    response_model=schemas.LibraryDocumentResponse,
)
def create_document(
    library_id: int,
    data: schemas.LibraryDocumentCreate,
    db: Session = Depends(get_db),
):
    return service.create_document(db, library_id, data)


@router.post(
    "/{library_id}/upload",
    response_model=schemas.LibraryDocumentResponse,
)
def upload_document(
    library_id: int,
    file: UploadFile = File(...),
    parent_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    return service.upload_document(db, library_id, file, parent_id)


# 📄 Обычная загрузка (текущая папка)
@router.get(
    "/{library_id}/documents",
    response_model=schemas.PaginatedLibraryDocumentsResponse,
)
def get_documents_by_library(
    library_id: int,
    parent_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return service.get_documents_by_library(
        db,
        library_id=library_id,
        parent_id=parent_id,
        limit=limit,
        offset=offset,
    )


# 🔍 Глобальный поиск по всей библиотеке
@router.get(
    "/{library_id}/documents/search",
    response_model=schemas.PaginatedLibraryDocumentsResponse,
)
def search_documents(
    library_id: int,
    query: str = Query(..., min_length=1),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    return service.search_documents(
        db,
        library_id=library_id,
        query=query,
        limit=limit,
        offset=offset,
    )


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    mode: str = Query("folder_only"),
    db: Session = Depends(get_db),
):
    return service.delete_document(db, document_id, mode)


@router.patch(
    "/documents/{document_id}",
    response_model=schemas.LibraryDocumentResponse,
)
def rename_document(
    document_id: int,
    data: schemas.RenameDocumentRequest,
    db: Session = Depends(get_db),
):
    return service.rename_document(db, document_id, data.title)


@router.patch(
    "/documents/{document_id}/move",
    response_model=schemas.LibraryDocumentResponse,
)
def move_document(
    document_id: int,
    data: schemas.MoveDocumentRequest,
    db: Session = Depends(get_db),
):
    return service.move_document(
        db,
        document_id=document_id,
        parent_id=data.parent_id,
    )