import pytest
from fastapi import HTTPException

from app.modules.platform.runtime.search import service
from app.modules.platform.runtime.search.ranking import compute_text_match_rank, normalize_search_text
from app.modules.platform.runtime.search.schemas import RuntimeSearchRequest


@pytest.mark.parametrize(
    ("title", "query", "expected_rank"),
    [
        ("Проект СДС", "проект сдс", 1),
        ("Проект СДС", "про", 2),
        ("Инвестиционный проект", "проект", 3),
        ("Карточка проекта", "екта", 3),
        ("Договор подряда", "ряд", 3),
        ("Договор подряда", "xyz", 999),
    ],
)
def test_compute_text_match_rank(title: str, query: str, expected_rank: int) -> None:
    assert compute_text_match_rank(title, query) == expected_rank


def test_normalize_search_text_is_case_insensitive() -> None:
    assert normalize_search_text("Про") == normalize_search_text("про")


def test_execute_runtime_search_rejects_empty_query() -> None:
    with pytest.raises(HTTPException) as exc_info:
        service.execute_runtime_search(
            None,
            tenant_id=1,
            payload=RuntimeSearchRequest(query="   ", scope="runtime.company"),
        )

    assert exc_info.value.status_code == 422


def test_execute_runtime_search_rejects_unsupported_scope() -> None:
    with pytest.raises(HTTPException) as exc_info:
        service.execute_runtime_search(
            None,
            tenant_id=1,
            payload=RuntimeSearchRequest(query="про", scope="runtime.object_entity"),
        )

    assert exc_info.value.status_code == 422
    assert "Неподдерживаемый scope" in str(exc_info.value.detail)


def test_execute_runtime_search_requires_object_type_params(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.load_catalog_object_types",
        lambda _db, _tenant_id: [],
    )

    with pytest.raises(HTTPException) as exc_info:
        service.execute_runtime_search(
            None,
            tenant_id=1,
            payload=RuntimeSearchRequest(query="про", scope="runtime.object_type"),
        )

    assert exc_info.value.status_code == 422


def test_execute_runtime_search_requires_library_id_for_documents() -> None:
    with pytest.raises(HTTPException) as exc_info:
        service.execute_runtime_search(
            None,
            tenant_id=1,
            payload=RuntimeSearchRequest(query="дог", scope="runtime.document_library"),
        )

    assert exc_info.value.status_code == 422


def test_execute_runtime_search_requires_folder_id_for_document_folder() -> None:
    with pytest.raises(HTTPException) as exc_info:
        service.execute_runtime_search(
            None,
            tenant_id=1,
            payload=RuntimeSearchRequest(
                query="дог",
                scope="runtime.document_folder",
                params={"libraryId": 3},
            ),
        )

    assert exc_info.value.status_code == 422


def test_search_company_includes_library_folder(monkeypatch) -> None:
    from types import SimpleNamespace

    folder = SimpleNamespace(
        id=42,
        library_id=5,
        parent_id=10,
        title="Архив проектов",
        is_folder=True,
        document_type="folder",
    )
    library = SimpleNamespace(id=5, title="Корпоративные документы")

    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.load_catalog_object_types",
        lambda _db, _tenant_id: [],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.get_tenant_library_ids",
        lambda _db, _tenant_id: [5],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.get_libraries_by_ids",
        lambda _db, _library_ids: {5: library},
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.search_libraries_by_title",
        lambda _db, **kwargs: [],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.search_documents_in_libraries",
        lambda _db, **kwargs: [(folder, 2)],
    )

    response = service.execute_runtime_search(
        None,
        tenant_id=1,
        payload=RuntimeSearchRequest(query="архив", scope="runtime.company"),
    )

    assert response.scope == "runtime.company"
    assert len(response.results) == 1
    result = response.results[0]
    assert result.type == "folder"
    assert result.title == "Архив проектов"
    assert result.source == "runtime.company"
    assert result.path == "/portal/1/library/5?folderId=42"
    assert result.meta.libraryId == 5
    assert result.meta.isFolder is True


def test_search_company_document_path_includes_open_document(monkeypatch) -> None:
    from types import SimpleNamespace

    document = SimpleNamespace(
        id=77,
        library_id=5,
        parent_id=10,
        title="Договор",
        is_folder=False,
        document_type="pdf",
    )
    library = SimpleNamespace(id=5, title="Корпоративные документы")

    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.load_catalog_object_types",
        lambda _db, _tenant_id: [],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.get_tenant_library_ids",
        lambda _db, _tenant_id: [5],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.get_libraries_by_ids",
        lambda _db, _library_ids: {5: library},
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.search_libraries_by_title",
        lambda _db, **kwargs: [],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.search_documents_in_libraries",
        lambda _db, **kwargs: [(document, 1)],
    )

    response = service.execute_runtime_search(
        None,
        tenant_id=1,
        payload=RuntimeSearchRequest(query="дог", scope="runtime.company"),
    )

    assert len(response.results) == 1
    assert response.results[0].type == "document"
    assert (
        response.results[0].path
        == "/portal/1/library/5?folderId=10&documentId=77&open=document"
    )


def test_search_company_merges_entities_and_library_documents(monkeypatch) -> None:
    from types import SimpleNamespace

    entity = SimpleNamespace(
        id="ent-1",
        object_type_key="projects",
    )
    folder = SimpleNamespace(
        id=7,
        library_id=3,
        parent_id=None,
        title="Договоры",
        is_folder=True,
        document_type="folder",
    )
    library = SimpleNamespace(id=3, title="Юридическая библиотека")
    object_type_payload = {
        "id": "ot-1",
        "key": "projects",
        "name": "Проекты",
        "fields": [{"key": "title", "is_title": True}],
    }

    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.load_catalog_object_types",
        lambda _db, _tenant_id: [object_type_payload],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.search_entities_in_object_type",
        lambda _db, **kwargs: [(entity, "Проект Альфа", 2)],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.get_tenant_library_ids",
        lambda _db, _tenant_id: [3],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.get_libraries_by_ids",
        lambda _db, _library_ids: {3: library},
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.search_libraries_by_title",
        lambda _db, **kwargs: [],
    )
    monkeypatch.setattr(
        "app.modules.platform.runtime.search.service.search_documents_in_libraries",
        lambda _db, **kwargs: [(folder, 1)],
    )

    response = service.execute_runtime_search(
        None,
        tenant_id=1,
        payload=RuntimeSearchRequest(query="про", scope="runtime.company", limit=10),
    )

    assert len(response.results) == 2
    assert response.results[0].type == "folder"
    assert response.results[0].title == "Договоры"
    assert response.results[1].type == "object_entity"
    assert response.results[1].title == "Проект Альфа"
