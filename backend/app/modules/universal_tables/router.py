from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.universal_tables import service
from app.modules.universal_tables.schemas import (
    UniversalTableCreate,
    UniversalTableUpdate,
    UniversalTableColumnCreate,
    UniversalTableColumnUpdate,
    UniversalTableRowCreate,
    UniversalTableRowUpdate,
)

router = APIRouter(prefix="/universal-tables", tags=["universal-tables"])

BACKEND_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BACKEND_DIR / "uploads" / "table-files"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("")
def create_table(payload: UniversalTableCreate, db: Session = Depends(get_db)):
    table = service.create_table(db, payload)
    return service.serialize_table(table)


@router.get("/lookup-sources")
def get_lookup_sources(db: Session = Depends(get_db)):
    return service.get_lookup_sources(db)


@router.get("/lookup-options")
def get_lookup_options(
    source_table_id: int,
    display_column_id: int,
    db: Session = Depends(get_db),
):
    return service.get_lookup_options(
        db,
        source_table_id=source_table_id,
        display_column_id=display_column_id,
    )


@router.post("/files/upload")
async def upload_table_file(
    request: Request,
    file: UploadFile = File(...),
):
    original_name = file.filename or "file"
    suffix = Path(original_name).suffix.lower()
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


@router.get("/by-block/{block_id}")
def get_table_by_block(block_id: int, db: Session = Depends(get_db)):
    table = service.get_table_by_block(db, block_id)

    if not table:
        raise HTTPException(
            status_code=404,
            detail="Universal table for block not found",
        )

    return service.serialize_table(table)


@router.get("/{table_id}")
def get_table(table_id: int, db: Session = Depends(get_db)):
    table = service.get_table(db, table_id)

    if not table:
        raise HTTPException(status_code=404, detail="Universal table not found")

    return service.serialize_table(table)


@router.patch("/{table_id}")
def update_table(
    table_id: int,
    payload: UniversalTableUpdate,
    db: Session = Depends(get_db),
):
    table = service.update_table(db, table_id, payload)

    if not table:
        raise HTTPException(status_code=404, detail="Universal table not found")

    return service.serialize_table(table)


@router.delete("/{table_id}")
def delete_table(table_id: int, db: Session = Depends(get_db)):
    deleted = service.delete_table(db, table_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Universal table not found")

    return {"success": True}


@router.post("/{table_id}/columns")
def create_column(
    table_id: int,
    payload: UniversalTableColumnCreate,
    db: Session = Depends(get_db),
):
    column = service.create_column(db, table_id, payload)

    if not column:
        raise HTTPException(status_code=404, detail="Universal table not found")

    return service.serialize_column(column)


@router.patch("/columns/{column_id}")
def update_column(
    column_id: int,
    payload: UniversalTableColumnUpdate,
    db: Session = Depends(get_db),
):
    column = service.update_column(db, column_id, payload)

    if not column:
        raise HTTPException(status_code=404, detail="Universal table column not found")

    return service.serialize_column(column)


@router.delete("/columns/{column_id}")
def delete_column(column_id: int, db: Session = Depends(get_db)):
    deleted = service.delete_column(db, column_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Universal table column not found")

    return {"success": True}


@router.post("/{table_id}/rows")
def create_row(
    table_id: int,
    payload: UniversalTableRowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = service.create_row(
        db,
        table_id,
        payload,
        current_user_id=current_user.id,
    )

    if not row:
        raise HTTPException(status_code=404, detail="Universal table not found")

    return service.serialize_row(row)


@router.patch("/rows/{row_id}")
def update_row(
    row_id: int,
    payload: UniversalTableRowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = service.update_row(
        db,
        row_id,
        payload,
        current_user_id=current_user.id,
    )

    if not row:
        raise HTTPException(status_code=404, detail="Universal table row not found")

    return service.serialize_row(row)


@router.delete("/rows/{row_id}")
def delete_row(row_id: int, db: Session = Depends(get_db)):
    deleted = service.delete_row(db, row_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Universal table row not found")

    return {"success": True}