from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, Path, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.document_libraries import schemas
from app.modules.document_libraries import service_bridge
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.users.models import User

TenantIdPath = Annotated[
    int,
    Path(..., description="Идентификатор tenant (portal).", ge=1),
]

document_libraries_bridge_router = APIRouter(
    prefix="/tenants/{tenant_id}/document-libraries",
    tags=["Document Libraries (tenant bridge)"],
)

document_download_bridge_router = APIRouter(
    prefix="/tenants/{tenant_id}",
    tags=["Document Libraries (tenant bridge)"],
)


@document_libraries_bridge_router.post(
    "",
    response_model=schemas.DocumentLibraryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_library(
    data: schemas.DocumentLibraryCreate,
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.create_library(db, current_user, tenant_id, data)


@document_libraries_bridge_router.get(
    "",
    response_model=list[schemas.DocumentLibraryResponse],
)
def list_libraries(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.list_libraries(db, current_user, tenant_id)


@document_libraries_bridge_router.post(
    "/{library_id}/folders",
    response_model=schemas.LibraryDocumentResponse,
)
def create_folder(
    library_id: int,
    data: schemas.FolderCreate,
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.create_folder(
        db,
        current_user,
        tenant_id,
        library_id,
        data,
    )


@document_libraries_bridge_router.post(
    "/{library_id}/documents",
    response_model=schemas.LibraryDocumentResponse,
)
def create_document(
    library_id: int,
    data: schemas.LibraryDocumentCreate,
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.create_document(
        db,
        current_user,
        tenant_id,
        library_id,
        data,
    )


@document_libraries_bridge_router.post(
    "/{library_id}/upload",
    response_model=schemas.LibraryDocumentResponse,
)
def upload_document(
    library_id: int,
    tenant_id: TenantIdPath,
    file: UploadFile = File(...),
    parent_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.upload_document(
        db,
        current_user,
        tenant_id,
        library_id,
        file,
        parent_id,
    )


@document_libraries_bridge_router.get(
    "/{library_id}/documents",
    response_model=schemas.PaginatedLibraryDocumentsResponse,
)
def get_documents_by_library(
    library_id: int,
    tenant_id: TenantIdPath,
    parent_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.get_documents_by_library(
        db,
        current_user,
        tenant_id,
        library_id,
        parent_id=parent_id,
        limit=limit,
        offset=offset,
    )


@document_libraries_bridge_router.get(
    "/{library_id}/documents/search",
    response_model=schemas.PaginatedLibraryDocumentsResponse,
)
def search_documents(
    library_id: int,
    tenant_id: TenantIdPath,
    query: str = Query(..., min_length=1),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.search_documents(
        db,
        current_user,
        tenant_id,
        library_id,
        query=query,
        limit=limit,
        offset=offset,
    )


@document_libraries_bridge_router.get(
    "/{library_id}/documents/by-file/{file_key:path}",
    response_model=schemas.LibraryDocumentResponse,
)
def get_document_by_file_key(
    library_id: int,
    file_key: str,
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.get_document_by_file_key(
        db,
        current_user,
        tenant_id,
        library_id,
        file_key,
    )


@document_libraries_bridge_router.get(
    "/{library_id}/documents/{document_id}",
    response_model=schemas.LibraryDocumentResponse,
)
def get_document_by_id(
    library_id: int,
    document_id: int,
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    return service_bridge.get_document_by_id(
        db,
        current_user,
        tenant_id,
        library_id,
        document_id,
    )


@document_libraries_bridge_router.delete(
    "/{library_id}/documents/{document_id}",
)
def delete_document(
    library_id: int,
    document_id: int,
    tenant_id: TenantIdPath,
    mode: str = Query("folder_only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    service_bridge.get_document_by_id(
        db,
        current_user,
        tenant_id,
        library_id,
        document_id,
    )
    return service_bridge.delete_document(
        db,
        current_user,
        tenant_id,
        document_id,
        mode,
    )


@document_libraries_bridge_router.patch(
    "/{library_id}/documents/{document_id}",
    response_model=schemas.LibraryDocumentResponse,
)
def rename_document(
    library_id: int,
    document_id: int,
    data: schemas.RenameDocumentRequest,
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    service_bridge.get_document_by_id(
        db,
        current_user,
        tenant_id,
        library_id,
        document_id,
    )
    return service_bridge.rename_document(
        db,
        current_user,
        tenant_id,
        document_id,
        data.title,
    )


@document_libraries_bridge_router.patch(
    "/{library_id}/documents/{document_id}/move",
    response_model=schemas.LibraryDocumentResponse,
)
def move_document(
    library_id: int,
    document_id: int,
    data: schemas.MoveDocumentRequest,
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    service_bridge.get_document_by_id(
        db,
        current_user,
        tenant_id,
        library_id,
        document_id,
    )
    return service_bridge.move_document(
        db,
        current_user,
        tenant_id,
        document_id,
        data.parent_id,
    )


@document_download_bridge_router.get("/documents/{document_id}/download")
def download_document(
    document_id: int,
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _membership: int = Depends(require_tenant_membership),
):
    file_path, download_name = service_bridge.download_document(
        db,
        current_user,
        tenant_id,
        document_id,
    )
    return FileResponse(
        file_path,
        filename=download_name,
        media_type="application/octet-stream",
    )
