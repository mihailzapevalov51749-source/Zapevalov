"""Tests for orphan document attachment tenant isolation on GET /files/documents/{file_name}."""

from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.blocks.models import Block
from app.modules.pages.models import Page
from app.modules.sections.models import Section
from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.comments.models import Comment, CommentAttachment
from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument
from app.modules.files.router import DOCUMENTS_DIR
from app.modules.navigation.models import NavigationItem
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.shared.enums import FieldType
from app.modules.portals.models import Portal
from app.modules.users.models import Role, User


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _ensure_portals(db: Session, portal_a: int, portal_b: int) -> None:
    for portal_id, label in ((portal_a, "A"), (portal_b, "B")):
        existing = db.query(Portal).filter(Portal.id == portal_id).first()
        if existing is None:
            db.add(
                Portal(
                    id=portal_id,
                    name=f"OrphanDoc ISO {label} {_suffix()}",
                    code=f"orphan_doc_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"orphan_doc_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"orphan_doc_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"OrphanDoc User {portal_id}",
        hashed_password="hash",
        is_active=True,
        tenant_id=portal_id,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _write_document_file(file_name: str, content: bytes = b"secret-bytes") -> Path:
    DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
    path = DOCUMENTS_DIR / file_name
    path.write_bytes(content)
    return path


def test_orphan_document_denied_for_other_tenant_user(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9521
    portal_b = 9522
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    db.commit()

    stored_name = f"{uuid.uuid4().hex}.txt"
    _write_document_file(stored_name)

    response = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_b),
    )

    assert response.status_code == 403, response.text


def test_runtime_entity_attachment_allowed_for_same_tenant_user(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9523
    portal_b = 9524
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    db.flush()

    stored_name = f"{uuid.uuid4().hex}.pdf"
    _write_document_file(stored_name, b"tenant-a-file")

    record_number = int(uuid.uuid4().int % 900_000_000) + 100_000

    entity = RuntimeEntity(
        tenant_id=portal_a,
        object_type_key=f"test_object_{_suffix()}",
        catalog_version=1,
        record_number=record_number,
    )
    db.add(entity)
    db.flush()

    db.add(
        RuntimeEntityValue(
            tenant_id=portal_a,
            entity_id=entity.id,
            field_key="attachments",
            field_type=FieldType.FILE.value,
            value_json=[
                {
                    "file_id": stored_name,
                    "file_name": "report.pdf",
                    "file_url": f"/files/documents/{stored_name}",
                }
            ],
        )
    )
    db.commit()

    allowed = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_a),
    )
    denied = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_b),
    )

    assert allowed.status_code == 200, allowed.text
    assert denied.status_code == 403, denied.text


def test_library_document_still_respects_tenant_isolation(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9525
    portal_b = 9526
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    db.flush()

    stored_name = f"{uuid.uuid4()}_{_suffix()}.docx"
    _write_document_file(stored_name, b"library-doc")

    library = DocumentLibrary(title=f"Lib {_suffix()}", description="iso")
    db.add(library)
    db.flush()

    page = Page(
        portal_id=portal_a,
        title=f"Docs {_suffix()}",
        description="",
        status="published",
        is_home=False,
        is_visible=True,
        sort_order=0,
    )
    db.add(page)
    db.flush()

    db.add(
        NavigationItem(
            portal_id=portal_a,
            parent_id=None,
            type="document_library",
            title="Docs",
            page_id=page.id,
            library_id=library.id,
            url=None,
            sort_order=0,
            is_visible=True,
        )
    )
    db.add(
        LibraryDocument(
            library_id=library.id,
            title="Secret",
            document_type="docx",
            file_path=f"/uploads/documents/{stored_name}",
            original_filename="Secret.docx",
            is_folder=False,
            created_by="test",
        )
    )
    db.commit()

    allowed = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_a),
    )
    denied = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_b),
    )

    assert allowed.status_code == 200, allowed.text
    assert denied.status_code == 403, denied.text


def test_comment_attachment_respects_runtime_entity_tenant(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9527
    portal_b = 9528
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    db.flush()

    stored_name = f"{uuid.uuid4().hex}.txt"
    _write_document_file(stored_name, b"comment-file")

    record_number = int(uuid.uuid4().int % 900_000_000) + 100_000

    entity = RuntimeEntity(
        tenant_id=portal_a,
        object_type_key=f"test_object_{_suffix()}",
        catalog_version=1,
        record_number=record_number,
    )
    db.add(entity)
    db.flush()

    comment = Comment(
        entity_type="runtime_entity",
        entity_id=str(entity.id),
        body="with attachment",
        author_user_id=user_a.id,
    )
    db.add(comment)
    db.flush()

    db.add(
        CommentAttachment(
            comment_id=comment.id,
            file_url=f"/files/documents/{stored_name}",
            file_name="note.txt",
            uploaded_by_user_id=user_a.id,
        )
    )
    db.commit()

    allowed = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_a),
    )
    denied = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_b),
    )

    assert allowed.status_code == 200, allowed.text
    assert denied.status_code == 403, denied.text


def test_block_content_file_respects_portal(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9529
    portal_b = 9530
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    db.flush()

    stored_name = f"{uuid.uuid4().hex}.pdf"
    _write_document_file(stored_name, b"block-doc")

    page = Page(
        portal_id=portal_a,
        title=f"Page {_suffix()}",
        description="",
        status="published",
        is_home=False,
        is_visible=True,
        sort_order=0,
    )
    db.add(page)
    db.flush()

    section = Section(page_id=page.id, title="Main", sort_order=1)
    db.add(section)
    db.flush()

    db.add(
        Block(
            section_id=section.id,
            type="documents",
            title="Doc block",
            sort_order=1,
            content={
                "file_name": "Brief.pdf",
                "file_url": f"/files/documents/{stored_name}",
            },
        )
    )
    db.commit()

    allowed = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_a),
    )
    denied = client.get(
        f"/files/documents/{stored_name}",
        headers=_auth_headers(user_b),
    )

    assert allowed.status_code == 200, allowed.text
    assert denied.status_code == 403, denied.text
