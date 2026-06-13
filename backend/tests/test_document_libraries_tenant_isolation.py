"""HTTP integration tests for Document Libraries tenant isolation hotfix."""

from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
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
                    name=f"DocLib ISO {label} {_suffix()}",
                    code=f"doclib_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"doclib_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"doclib_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"DocLib User {portal_id}",
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


def _resolve_platform_owner(db: Session) -> User | None:
    row = db.query(PlatformSettings).filter_by(id=PLATFORM_SETTINGS_SINGLETON_ID).first()
    if row is None or row.platform_owner_user_id is None:
        return None
    return db.query(User).filter(User.id == row.platform_owner_user_id).first()


def _seed_library_for_portal(
    db: Session,
    *,
    portal_id: int,
    title: str,
) -> tuple[DocumentLibrary, LibraryDocument]:
    library = DocumentLibrary(title=title, description="iso test")
    db.add(library)
    db.flush()

    page = Page(
        portal_id=portal_id,
        title=title,
        description="",
        status="published",
        is_home=False,
        is_visible=True,
        sort_order=0,
    )
    db.add(page)
    db.flush()

    nav = NavigationItem(
        portal_id=portal_id,
        parent_id=None,
        type="document_library",
        title=title,
        page_id=page.id,
        library_id=library.id,
        url=None,
        sort_order=0,
        is_visible=True,
    )
    db.add(nav)
    db.flush()

    document = LibraryDocument(
        library_id=library.id,
        title="Secret.docx",
        document_type="docx",
        file_path="/uploads/documents/iso-test-file.docx",
        original_filename="Secret.docx",
        is_folder=False,
        created_by="test",
    )
    db.add(document)
    db.flush()
    return library, document


def test_document_libraries_list_requires_auth(client: TestClient, db: Session) -> None:
    portal_a = 9501
    _ensure_portals(db, portal_a, 9502)
    db.commit()

    response = client.get(f"/tenants/{portal_a}/document-libraries")
    assert response.status_code == 401, response.text


def test_document_libraries_list_own_tenant(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9503
    portal_b = 9504
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    library, _document = _seed_library_for_portal(
        db,
        portal_id=portal_a,
        title=f"Library A {_suffix()}",
    )
    db.commit()

    response = client.get(
        f"/tenants/{portal_a}/document-libraries",
        headers=_auth_headers(user),
    )

    assert response.status_code == 200, response.text
    library_ids = {item["id"] for item in response.json()}
    assert library.id in library_ids


def test_document_libraries_list_foreign_tenant_forbidden(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9505
    portal_b = 9506
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        f"/tenants/{portal_b}/document-libraries",
        headers=_auth_headers(user),
    )

    assert response.status_code == 403, response.text


def test_document_libraries_foreign_library_documents_forbidden(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9507
    portal_b = 9508
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    library_b, _document = _seed_library_for_portal(
        db,
        portal_id=portal_b,
        title=f"Library B {_suffix()}",
    )
    db.commit()

    response = client.get(
        f"/tenants/{portal_a}/document-libraries/{library_b.id}/documents",
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403, response.text


def test_document_libraries_upload_foreign_library_forbidden(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9509
    portal_b = 9510
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    library_b, _document = _seed_library_for_portal(
        db,
        portal_id=portal_b,
        title=f"Library B upload {_suffix()}",
    )
    db.commit()

    response = client.post(
        f"/tenants/{portal_a}/document-libraries/{library_b.id}/upload",
        headers=_auth_headers(user_a),
        files={"file": ("evil.txt", b"secret", "text/plain")},
    )

    assert response.status_code == 403, response.text


def test_document_libraries_foreign_document_by_id_forbidden(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9511
    portal_b = 9512
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    _library_a, _ = _seed_library_for_portal(
        db,
        portal_id=portal_a,
        title=f"Library A doc {_suffix()}",
    )
    _library_b, document_b = _seed_library_for_portal(
        db,
        portal_id=portal_b,
        title=f"Library B doc {_suffix()}",
    )
    db.commit()

    response = client.get(
        f"/tenants/{portal_a}/document-libraries/{_library_b.id}/documents/{document_b.id}",
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403, response.text


def test_document_libraries_download_foreign_document_forbidden(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9513
    portal_b = 9514
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    _library_b, document_b = _seed_library_for_portal(
        db,
        portal_id=portal_b,
        title=f"Library B download {_suffix()}",
    )
    db.commit()

    response = client.get(
        f"/tenants/{portal_a}/documents/{document_b.id}/download",
        headers=_auth_headers(user_a),
    )

    assert response.status_code == 403, response.text


def test_document_libraries_platform_owner_can_access_foreign_tenant(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9515
    portal_b = 9516
    _ensure_portals(db, portal_a, portal_b)
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("Platform owner is not configured in test database")

    library_b, _document = _seed_library_for_portal(
        db,
        portal_id=portal_b,
        title=f"Library B owner {_suffix()}",
    )
    db.commit()

    response = client.get(
        f"/tenants/{portal_b}/document-libraries/{library_b.id}/documents",
        headers=_auth_headers(owner),
    )

    assert response.status_code == 200, response.text


def test_legacy_document_libraries_list_requires_portal_id(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9517
    _ensure_portals(db, portal_a, 9518)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.get(
        "/document-libraries/",
        headers=_auth_headers(user),
    )

    assert response.status_code == 422, response.text


def test_public_uploads_documents_path_blocked(
    client: TestClient,
    db: Session,
) -> None:
    response = client.get("/uploads/documents/any-file.txt")
    assert response.status_code in (401, 403, 404), response.text


def test_files_documents_requires_auth(client: TestClient) -> None:
    response = client.get("/files/documents/any-file.txt")
    assert response.status_code == 401, response.text
