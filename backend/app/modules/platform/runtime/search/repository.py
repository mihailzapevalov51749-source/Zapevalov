from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument
from app.modules.navigation.models import NavigationItem
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.search.ranking import compute_text_match_rank, json_value_to_search_text


def get_tenant_library_ids(db: Session, tenant_id: int) -> list[int]:
    rows = (
        db.query(NavigationItem.library_id)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.library_id.isnot(None),
            NavigationItem.is_visible.is_(True),
        )
        .distinct()
        .all()
    )

    library_ids: set[int] = set()
    for (library_id,) in rows:
        if library_id is None:
            continue
        try:
            library_ids.add(int(library_id))
        except (TypeError, ValueError):
            continue

    return sorted(library_ids)


def get_libraries_by_ids(db: Session, library_ids: list[int]) -> dict[int, DocumentLibrary]:
    if not library_ids:
        return {}

    rows = (
        db.query(DocumentLibrary)
        .filter(DocumentLibrary.id.in_(library_ids))
        .all()
    )
    return {row.id: row for row in rows}


def _title_text_expression():
    return func.coalesce(RuntimeEntityValue.value_json.op("#>>")("{}"), "")


def search_entities_in_object_type(
    db: Session,
    *,
    tenant_id: int,
    object_type_key: str,
    title_field: str,
    query: str,
    limit: int,
) -> list[tuple[RuntimeEntity, str, int]]:
    if not title_field:
        return []

    pattern = f"%{query.strip()}%"
    title_text = _title_text_expression()

    rows = (
        db.query(RuntimeEntity, title_text.label("title_text"))
        .join(
            RuntimeEntityValue,
            and_(
                RuntimeEntityValue.entity_id == RuntimeEntity.id,
                RuntimeEntityValue.tenant_id == tenant_id,
                RuntimeEntityValue.field_key == title_field,
            ),
        )
        .filter(
            RuntimeEntity.tenant_id == tenant_id,
            RuntimeEntity.object_type_key == object_type_key,
            RuntimeEntity.deleted_at.is_(None),
            func.lower(title_text).like(func.lower(pattern)),
        )
        .limit(max(limit * 5, limit))
        .all()
    )

    ranked: list[tuple[RuntimeEntity, str, int]] = []
    for entity, raw_title in rows:
        title = json_value_to_search_text(raw_title)
        rank = compute_text_match_rank(title, query)
        if rank == 999:
            continue
        ranked.append((entity, title, rank))

    ranked.sort(key=lambda item: (item[2], item[1].casefold(), str(item[0].id)))
    return ranked[:limit]


def collect_descendant_folder_ids(
    db: Session,
    *,
    library_id: int,
    folder_id: int,
) -> set[int]:
    ids = {folder_id}
    frontier = [folder_id]

    while frontier:
        child_rows = (
            db.query(LibraryDocument.id)
            .filter(
                LibraryDocument.library_id == library_id,
                LibraryDocument.parent_id.in_(frontier),
                LibraryDocument.is_folder.is_(True),
            )
            .all()
        )

        next_frontier: list[int] = []
        for (child_id,) in child_rows:
            if child_id not in ids:
                ids.add(child_id)
                next_frontier.append(child_id)

        frontier = next_frontier

    return ids


def search_library_documents(
    db: Session,
    *,
    library_id: int,
    query: str,
    limit: int,
    folder_id: int | None = None,
    recursive: bool = False,
) -> list[tuple[LibraryDocument, int]]:
    pattern = f"%{query.strip()}%"

    base_query = db.query(LibraryDocument).filter(
        LibraryDocument.library_id == library_id,
        or_(
            LibraryDocument.title.ilike(pattern),
            LibraryDocument.document_type.ilike(pattern),
            LibraryDocument.original_filename.ilike(pattern),
            LibraryDocument.created_by.ilike(pattern),
        ),
    )

    if folder_id is not None:
        if recursive:
            descendant_ids = collect_descendant_folder_ids(
                db,
                library_id=library_id,
                folder_id=folder_id,
            )
            base_query = base_query.filter(
                or_(
                    LibraryDocument.id.in_(descendant_ids),
                    LibraryDocument.parent_id.in_(descendant_ids),
                )
            )
        else:
            base_query = base_query.filter(LibraryDocument.parent_id == folder_id)

    documents = (
        base_query.order_by(
            LibraryDocument.is_folder.desc(),
            LibraryDocument.updated_at.desc(),
            LibraryDocument.id.desc(),
        )
        .limit(max(limit * 5, limit))
        .all()
    )

    ranked: list[tuple[LibraryDocument, int]] = []
    for document in documents:
        rank = compute_text_match_rank(document.title, query)
        if rank == 999:
            continue
        ranked.append((document, rank))

    ranked.sort(
        key=lambda item: (
            item[1],
            (item[0].title or "").casefold(),
            item[0].id,
        )
    )
    return ranked[:limit]


def _rank_library_documents(documents: list[LibraryDocument], query: str) -> list[tuple[LibraryDocument, int]]:
    ranked: list[tuple[LibraryDocument, int]] = []
    for document in documents:
        rank = compute_text_match_rank(document.title, query)
        if rank == 999:
            continue
        ranked.append((document, rank))

    ranked.sort(
        key=lambda item: (
            item[1],
            (item[0].title or "").casefold(),
            item[0].id,
        )
    )
    return ranked


def search_documents_in_libraries(
    db: Session,
    *,
    library_ids: list[int],
    query: str,
    limit: int,
) -> list[tuple[LibraryDocument, int]]:
    if not library_ids:
        return []

    pattern = f"%{query.strip()}%"

    documents = (
        db.query(LibraryDocument)
        .filter(
            LibraryDocument.library_id.in_(library_ids),
            or_(
                LibraryDocument.title.ilike(pattern),
                LibraryDocument.document_type.ilike(pattern),
                LibraryDocument.original_filename.ilike(pattern),
                LibraryDocument.created_by.ilike(pattern),
            ),
        )
        .order_by(
            LibraryDocument.is_folder.desc(),
            LibraryDocument.updated_at.desc(),
            LibraryDocument.id.desc(),
        )
        .limit(max(limit * 5, limit))
        .all()
    )

    return _rank_library_documents(documents, query)[:limit]


def search_libraries_by_title(
    db: Session,
    *,
    library_ids: list[int],
    query: str,
    limit: int,
) -> list[tuple[DocumentLibrary, int]]:
    if not library_ids:
        return []

    pattern = f"%{query.strip()}%"
    libraries = (
        db.query(DocumentLibrary)
        .filter(
            DocumentLibrary.id.in_(library_ids),
            DocumentLibrary.title.ilike(pattern),
        )
        .order_by(DocumentLibrary.updated_at.desc(), DocumentLibrary.id.desc())
        .limit(max(limit * 5, limit))
        .all()
    )

    ranked: list[tuple[DocumentLibrary, int]] = []
    for library in libraries:
        rank = compute_text_match_rank(library.title, query)
        if rank == 999:
            continue
        ranked.append((library, rank))

    ranked.sort(
        key=lambda item: (
            item[1],
            (item[0].title or "").casefold(),
            item[0].id,
        )
    )
    return ranked[:limit]
