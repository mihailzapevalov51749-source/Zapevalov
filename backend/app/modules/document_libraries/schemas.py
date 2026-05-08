from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DocumentLibraryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    portal_id: int
    parent_id: Optional[int] = None


class DocumentLibraryResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LibraryDocumentCreate(BaseModel):
    title: str
    document_type: str
    parent_id: Optional[int] = None


class FolderCreate(BaseModel):
    title: str
    parent_id: Optional[int] = None


class LibraryDocumentResponse(BaseModel):
    id: int
    library_id: int
    parent_id: Optional[int] = None
    title: str
    document_type: str
    file_path: Optional[str] = None
    original_filename: Optional[str]
    is_folder: bool

    # 🔴 НОВОЕ
    created_by: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# 🔴 НОВОЕ — пагинация
class PaginatedLibraryDocumentsResponse(BaseModel):
    items: List[LibraryDocumentResponse]
    total: int
    limit: int
    offset: int


class RenameDocumentRequest(BaseModel):
    title: str

class MoveDocumentRequest(BaseModel):
    parent_id: Optional[int] = None