from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.document_libraries.repository import get_library_by_id
from app.modules.platform.runtime.search.catalog_helpers import (
    load_catalog_object_types,
    resolve_object_type_from_params,
    resolve_title_field,
)
from app.modules.platform.runtime.search.repository import (
    get_libraries_by_ids,
    get_tenant_library_ids,
    search_documents_in_libraries,
    search_entities_in_object_type,
    search_libraries_by_title,
    search_library_documents,
)
from app.modules.platform.runtime.search.schemas import (
    DEFAULT_SEARCH_LIMIT,
    RuntimeSearchRequest,
    RuntimeSearchResponse,
    RuntimeSearchResultItem,
    RuntimeSearchResultMeta,
)

SUPPORTED_SCOPES = frozenset(
    {
        "runtime.company",
        "runtime.object_type",
        "runtime.document_library",
        "runtime.document_folder",
    }
)


def _validation_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=message,
    )


def _entity_path(tenant_id: int, object_type_key: str) -> str:
    return f"/portal/{tenant_id}/object-types/{object_type_key}"


def _library_path(tenant_id: int, library_id: int) -> str:
    return f"/portal/{tenant_id}/library/{library_id}"


def _library_item_path(tenant_id: int, document) -> str:
    base = _library_path(tenant_id, document.library_id)
    if document.is_folder:
        return f"{base}?folderId={document.id}"

    params: list[str] = []
    if document.parent_id is not None:
        params.append(f"folderId={document.parent_id}")
    params.append(f"documentId={document.id}")
    params.append("open=document")
    return f"{base}?{'&'.join(params)}"


def _build_entity_result(
    *,
    tenant_id: int,
    entity,
    title: str,
    rank: int,
    object_type_payload: dict,
    scope: str,
) -> RuntimeSearchResultItem:
    object_type_key = str(object_type_payload.get("key") or entity.object_type_key)
    object_type_name = str(object_type_payload.get("name") or object_type_key)
    object_type_id = object_type_payload.get("id")

    return RuntimeSearchResultItem(
        id=str(entity.id),
        type="object_entity",
        title=title,
        subtitle=object_type_name,
        path=_entity_path(tenant_id, object_type_key),
        rank=rank,
        source=scope,
        meta=RuntimeSearchResultMeta(
            objectTypeId=str(object_type_id) if object_type_id else None,
            objectTypeKey=object_type_key,
            entityId=str(entity.id),
        ),
    )


def _build_library_result(
    *,
    tenant_id: int,
    library,
    rank: int,
    scope: str,
) -> RuntimeSearchResultItem:
    return RuntimeSearchResultItem(
        id=str(library.id),
        type="library",
        title=str(library.title or ""),
        subtitle="Библиотека документов",
        path=_library_path(tenant_id, library.id),
        rank=rank,
        source=scope,
        meta=RuntimeSearchResultMeta(
            libraryId=library.id,
        ),
    )


def _build_document_result(
    *,
    tenant_id: int,
    document,
    rank: int,
    scope: str,
    library_title: str | None = None,
    use_folder_path: bool = False,
) -> RuntimeSearchResultItem:
    is_folder = bool(document.is_folder)
    library_label = str(library_title or "").strip()
    kind_label = "Папка" if is_folder else str(document.document_type or "Документ")

    if library_label:
        subtitle = f"{library_label} · {kind_label}"
    else:
        subtitle = kind_label

    path = (
        _library_item_path(tenant_id, document)
        if use_folder_path
        else _library_path(tenant_id, document.library_id)
    )

    return RuntimeSearchResultItem(
        id=str(document.id),
        type="folder" if is_folder else "document",
        title=str(document.title or ""),
        subtitle=subtitle,
        path=path,
        rank=rank,
        source=scope,
        meta=RuntimeSearchResultMeta(
            libraryId=document.library_id,
            folderId=document.parent_id,
            documentId=document.id,
            isFolder=is_folder,
        ),
    )


def _search_object_type_entities(
    db: Session,
    *,
    tenant_id: int,
    object_type_payload: dict,
    query: str,
    limit: int,
    scope: str,
) -> list[RuntimeSearchResultItem]:
    object_type_key = str(object_type_payload.get("key") or "").strip()
    if not object_type_key:
        return []

    title_field = resolve_title_field(object_type_payload)
    if not title_field:
        return []

    rows = search_entities_in_object_type(
        db,
        tenant_id=tenant_id,
        object_type_key=object_type_key,
        title_field=title_field,
        query=query,
        limit=limit,
    )

    return [
        _build_entity_result(
            tenant_id=tenant_id,
            entity=entity,
            title=title,
            rank=rank,
            object_type_payload=object_type_payload,
            scope=scope,
        )
        for entity, title, rank in rows
    ]


def _search_company_library_content(
    db: Session,
    *,
    tenant_id: int,
    query: str,
    limit: int,
) -> list[RuntimeSearchResultItem]:
    library_ids = get_tenant_library_ids(db, tenant_id)
    if not library_ids:
        return []

    libraries = get_libraries_by_ids(db, library_ids)
    per_source_limit = max(limit, 5)
    merged: list[RuntimeSearchResultItem] = []

    for library, rank in search_libraries_by_title(
        db,
        library_ids=library_ids,
        query=query,
        limit=per_source_limit,
    ):
        merged.append(
            _build_library_result(
                tenant_id=tenant_id,
                library=library,
                rank=rank,
                scope="runtime.company",
            )
        )

    for document, rank in search_documents_in_libraries(
        db,
        library_ids=library_ids,
        query=query,
        limit=per_source_limit,
    ):
        library = libraries.get(document.library_id)
        merged.append(
            _build_document_result(
                tenant_id=tenant_id,
                document=document,
                rank=rank,
                scope="runtime.company",
                library_title=str(library.title) if library else None,
                use_folder_path=True,
            )
        )

    return merged


def _search_company(
    db: Session,
    *,
    tenant_id: int,
    query: str,
    limit: int,
) -> list[RuntimeSearchResultItem]:
    per_type_limit = max(limit, 5)
    merged: list[RuntimeSearchResultItem] = []

    object_types = load_catalog_object_types(db, tenant_id)
    for object_type_payload in object_types:
        merged.extend(
            _search_object_type_entities(
                db,
                tenant_id=tenant_id,
                object_type_payload=object_type_payload,
                query=query,
                limit=per_type_limit,
                scope="runtime.company",
            )
        )

    merged.extend(
        _search_company_library_content(
            db,
            tenant_id=tenant_id,
            query=query,
            limit=limit,
        )
    )

    merged.sort(key=lambda item: (item.rank, item.title.casefold(), item.id))
    return merged[:limit]


def _search_object_type_scope(
    db: Session,
    *,
    tenant_id: int,
    params: dict,
    query: str,
    limit: int,
) -> list[RuntimeSearchResultItem]:
    object_types = load_catalog_object_types(db, tenant_id)
    object_type_payload = resolve_object_type_from_params(object_types, params)

    if not object_type_payload:
        raise _validation_error(
            "Для scope runtime.object_type требуется params.objectTypeId или params.objectTypeKey",
        )

    return _search_object_type_entities(
        db,
        tenant_id=tenant_id,
        object_type_payload=object_type_payload,
        query=query,
        limit=limit,
        scope="runtime.object_type",
    )


def _resolve_library_id(params: dict) -> int:
    library_id = params.get("libraryId") or params.get("library_id")
    if library_id is None:
        raise _validation_error("Для document scope требуется params.libraryId")

    try:
        return int(library_id)
    except (TypeError, ValueError) as exc:
        raise _validation_error("params.libraryId должен быть числом") from exc


def _search_documents(
    db: Session,
    *,
    tenant_id: int,
    params: dict,
    query: str,
    limit: int,
    scope: str,
    folder_id: int | None,
    recursive: bool,
) -> list[RuntimeSearchResultItem]:
    library_id = _resolve_library_id(params)
    library = get_library_by_id(db, library_id)
    if not library:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Библиотека не найдена")

    if scope == "runtime.document_folder":
        if folder_id is None:
            raw_folder_id = params.get("folderId") or params.get("folder_id")
            if raw_folder_id is None:
                raise _validation_error("Для scope runtime.document_folder требуется params.folderId")
            try:
                folder_id = int(raw_folder_id)
            except (TypeError, ValueError) as exc:
                raise _validation_error("params.folderId должен быть числом") from exc

    rows = search_library_documents(
        db,
        library_id=library_id,
        query=query,
        limit=limit,
        folder_id=folder_id,
        recursive=recursive,
    )

    return [
        _build_document_result(
            tenant_id=tenant_id,
            document=document,
            rank=rank,
            scope=scope,
        )
        for document, rank in rows
    ]


def execute_runtime_search(
    db: Session,
    *,
    tenant_id: int,
    payload: RuntimeSearchRequest,
) -> RuntimeSearchResponse:
    query = payload.query.strip()
    if not query:
        raise _validation_error("query не может быть пустым")

    scope = payload.scope.strip()
    if scope not in SUPPORTED_SCOPES:
        raise _validation_error(f"Неподдерживаемый scope: {scope}")

    limit = payload.limit or DEFAULT_SEARCH_LIMIT
    params = payload.params.model_dump(exclude_none=True)

    if scope == "runtime.company":
        results = _search_company(db, tenant_id=tenant_id, query=query, limit=limit)
        return RuntimeSearchResponse(query=query, scope=scope, results=results)

    if scope == "runtime.object_type":
        results = _search_object_type_scope(
            db,
            tenant_id=tenant_id,
            params=params,
            query=query,
            limit=limit,
        )
        return RuntimeSearchResponse(query=query, scope=scope, results=results)

    if scope == "runtime.document_library":
        results = _search_documents(
            db,
            tenant_id=tenant_id,
            params=params,
            query=query,
            limit=limit,
            scope=scope,
            folder_id=None,
            recursive=False,
        )
        return RuntimeSearchResponse(query=query, scope=scope, results=results)

    results = _search_documents(
        db,
        tenant_id=tenant_id,
        params=params,
        query=query,
        limit=limit,
        scope=scope,
        folder_id=None,
        recursive=True,
    )
    return RuntimeSearchResponse(
        query=query,
        scope=scope,
        results=results,
        meta={"folderSearchRecursive": True},
    )
