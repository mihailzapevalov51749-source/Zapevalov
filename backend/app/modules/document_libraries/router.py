from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.document_libraries import schemas
from app.modules.document_libraries import service_bridge
from app.modules.users.models import User


router = APIRouter(
    prefix="/document-libraries",
    tags=["Document Libraries"],
)


def _require_portal_id(portal_id: int | None = Query(None, alias="portal_id")) -> int:
    normalized = int(portal_id) if portal_id is not None else 0
    if normalized <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="portal_id обязателен для legacy Document Libraries API",
        )
    return normalized


@router.post("/", response_model=schemas.DocumentLibraryResponse)
def create_library(
    data: schemas.DocumentLibraryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.create_library(
        db,
        current_user,
        data.portal_id,
        data,
    )


@router.get("/", response_model=list[schemas.DocumentLibraryResponse])
def get_libraries(
    portal_id: int = Depends(_require_portal_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.list_libraries(db, current_user, portal_id)


@router.post(
    "/{library_id}/folders",
    response_model=schemas.LibraryDocumentResponse,
)
def create_folder(
    library_id: int,
    data: schemas.FolderCreate,
    portal_id: int = Depends(_require_portal_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.create_folder(
        db,
        current_user,
        portal_id,
        library_id,
        data,
    )


@router.post(
    "/{library_id}/documents",
    response_model=schemas.LibraryDocumentResponse,
)
def create_document(
    library_id: int,
    data: schemas.LibraryDocumentCreate,
    portal_id: int = Depends(_require_portal_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.create_document(
        db,
        current_user,
        portal_id,
        library_id,
        data,
    )


@router.post(
    "/{library_id}/upload",
    response_model=schemas.LibraryDocumentResponse,
)
def upload_document(
    library_id: int,
    portal_id: int = Depends(_require_portal_id),
    file: UploadFile = File(...),
    parent_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.upload_document(
        db,
        current_user,
        portal_id,
        library_id,
        file,
        parent_id,
    )


@router.get(
    "/{library_id}/documents",
    response_model=schemas.PaginatedLibraryDocumentsResponse,
)
def get_documents_by_library(
    library_id: int,
    portal_id: int = Depends(_require_portal_id),
    parent_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.get_documents_by_library(
        db,
        current_user,
        portal_id,
        library_id,
        parent_id=parent_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{library_id}/documents/search",
    response_model=schemas.PaginatedLibraryDocumentsResponse,
)
def search_documents(
    library_id: int,
    portal_id: int = Depends(_require_portal_id),
    query: str = Query(..., min_length=1),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.search_documents(
        db,
        current_user,
        portal_id,
        library_id,
        query=query,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/documents/by-file/{file_key:path}",
    response_model=schemas.LibraryDocumentResponse,
)
def get_document_by_file_key(
    file_key: str,
    portal_id: int = Depends(_require_portal_id),
    library_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.get_document_by_file_key(
        db,
        current_user,
        portal_id,
        library_id,
        file_key,
    )


@router.get(
    "/documents/{document_id}",
    response_model=schemas.LibraryDocumentResponse,
)
def get_document_by_id(
    document_id: int,
    portal_id: int = Depends(_require_portal_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.get_document_by_id_legacy(
        db,
        current_user,
        portal_id,
        document_id,
    )


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    portal_id: int = Depends(_require_portal_id),
    mode: str = Query("folder_only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.delete_document(
        db,
        current_user,
        portal_id,
        document_id,
        mode,
    )


@router.patch(
    "/documents/{document_id}",
    response_model=schemas.LibraryDocumentResponse,
)
def rename_document(
    document_id: int,
    data: schemas.RenameDocumentRequest,
    portal_id: int = Depends(_require_portal_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.rename_document(
        db,
        current_user,
        portal_id,
        document_id,
        data.title,
    )


@router.patch(
    "/documents/{document_id}/move",
    response_model=schemas.LibraryDocumentResponse,
)
def move_document(
    document_id: int,
    data: schemas.MoveDocumentRequest,
    portal_id: int = Depends(_require_portal_id),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service_bridge.move_document(
        db,
        current_user,
        portal_id,
        document_id,
        data.parent_id,
    )
