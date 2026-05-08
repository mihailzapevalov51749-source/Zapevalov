from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.tables import service, schemas


router = APIRouter(
    prefix="/tables",
    tags=["Tables"],
)


UPLOAD_DIR = Path("uploads/table-files")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post(
    "/files/upload",
)
async def upload_table_file(
    request: Request,
    file: UploadFile = File(...),
):
    original_name = file.filename or "file"
    suffix = Path(original_name).suffix
    stored_name = f"{uuid4().hex}{suffix}"
    file_path = UPLOAD_DIR / stored_name

    content = await file.read()
    file_path.write_bytes(content)

    base_url = str(request.base_url).rstrip("/")

    return {
        "id": stored_name,
        "name": original_name,
        "size": len(content),
        "type": file.content_type,
        "url": f"{base_url}/uploads/table-files/{stored_name}",
        "storedName": stored_name,
        "local": False,
    }


@router.post(
    "/block/{block_id}",
    response_model=schemas.TableResponse,
)
def create_table_for_block(
    block_id: int,
    db: Session = Depends(get_db),
):
    return service.create_table_for_block(db, block_id)


@router.get(
    "/block/{block_id}",
    response_model=schemas.TableResponse,
)
def get_table_by_block(
    block_id: int,
    db: Session = Depends(get_db),
):
    table = service.get_table_by_block(db, block_id)

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    return table


@router.get(
    "/lookup-sources",
    response_model=list[schemas.LookupSourceResponse],
)
def get_lookup_sources(
    db: Session = Depends(get_db),
):
    return service.get_lookup_sources(db)


@router.get(
    "/lookup-options",
    response_model=list[schemas.LookupOptionResponse],
)
def get_lookup_options(
    source_table_id: int,
    display_column_id: int,
    db: Session = Depends(get_db),
):
    return service.get_lookup_options(
        db=db,
        source_table_id=source_table_id,
        display_column_id=display_column_id,
    )


@router.get(
    "/{table_id}",
    response_model=schemas.TableResponse,
)
def get_table(
    table_id: int,
    db: Session = Depends(get_db),
):
    table = service.get_table(db, table_id)

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    return table


@router.patch(
    "/{table_id}",
    response_model=schemas.TableResponse,
)
def update_table(
    table_id: int,
    data: schemas.TableUpdate,
    db: Session = Depends(get_db),
):
    table = service.update_table(db, table_id, data)

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    return table


@router.post(
    "/{table_id}/columns",
    response_model=schemas.TableColumnResponse,
)
def create_column(
    table_id: int,
    data: schemas.TableColumnCreate,
    db: Session = Depends(get_db),
):
    return service.create_column(db, table_id, data)


@router.patch(
    "/columns/{column_id}",
    response_model=schemas.TableColumnResponse,
)
def update_column(
    column_id: int,
    data: schemas.TableColumnUpdate,
    db: Session = Depends(get_db),
):
    column = service.update_column(db, column_id, data)

    if not column:
        raise HTTPException(status_code=404, detail="Column not found")

    return column


@router.delete(
    "/columns/{column_id}",
)
def delete_column(
    column_id: int,
    db: Session = Depends(get_db),
):
    success = service.delete_column(db, column_id)

    if not success:
        raise HTTPException(status_code=404, detail="Column not found")

    return {"success": True}


@router.post(
    "/{table_id}/rows",
    response_model=schemas.TableRowResponse,
)
def create_row(
    table_id: int,
    data: schemas.TableRowCreate | None = None,
    db: Session = Depends(get_db),
):
    return service.create_row(db, table_id, data)


@router.patch(
    "/rows/{row_id}",
    response_model=schemas.TableRowResponse,
)
def update_row(
    row_id: int,
    data: schemas.TableRowUpdate,
    db: Session = Depends(get_db),
):
    row = service.update_row(db, row_id, data)

    if not row:
        raise HTTPException(status_code=404, detail="Row not found")

    return row


@router.delete(
    "/rows/{row_id}",
)
def delete_row(
    row_id: int,
    db: Session = Depends(get_db),
):
    success = service.delete_row(db, row_id)

    if not success:
        raise HTTPException(status_code=404, detail="Row not found")

    return {"success": True}