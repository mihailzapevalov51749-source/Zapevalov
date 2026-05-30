from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.search.schemas import (
    RuntimeSearchRequest,
    RuntimeSearchResultItem,
    RuntimeSearchResultMeta,
)
from app.modules.platform.runtime.search.service import execute_runtime_search
from app.modules.platform.search.repository import (
    search_designer_fields,
    search_designer_object_types,
    search_designer_relations,
    search_designer_views,
)

SUPPORTED_DESIGNER_SCOPES = frozenset(
    {
        "designer.workspace",
        "designer.object_type",
        "designer.fields",
        "designer.views",
        "designer.relations",
    }
)

DESIGNER_KIND_LABELS = {
    "designer.object_type": "Тип объекта",
    "designer.field": "Поле",
    "designer.view": "Представление",
    "designer.relation": "Связь",
}

RUNTIME_KIND_LABELS = {
    "object_entity": "Объект",
    "library": "Библиотека",
    "folder": "Папка",
    "document": "Документ",
}


def _validation_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=message,
    )


def _parse_object_type_id(params: dict) -> UUID | None:
    raw = params.get("objectTypeId") or params.get("object_type_id")
    if raw is None:
        return None

    try:
        return UUID(str(raw))
    except (TypeError, ValueError) as exc:
        raise _validation_error("params.objectTypeId должен быть UUID") from exc


def _object_type_path(tenant_id: int, object_type_id: UUID, tab: str = "general") -> str:
    return f"/designer/tenant/{tenant_id}/object-types/{object_type_id}/{tab}"


def _relations_path(tenant_id: int, object_type_id: UUID | None = None) -> str:
    if object_type_id is not None:
        return _object_type_path(tenant_id, object_type_id, "relations")
    return f"/designer/tenant/{tenant_id}/relations"


def _designer_subtitle(result_type: str, detail: str | None = None) -> str:
    kind = DESIGNER_KIND_LABELS.get(result_type, "Студия")
    if detail:
        return f"Студия · {kind} · {detail}"
    return f"Студия · {kind}"


def _build_object_type_result(
    *,
    tenant_id: int,
    object_type,
    rank: int,
    scope: str,
) -> RuntimeSearchResultItem:
    object_type_id = str(object_type.id)
    return RuntimeSearchResultItem(
        id=object_type_id,
        type="designer.object_type",
        title=str(object_type.name or ""),
        subtitle=_designer_subtitle("designer.object_type"),
        path=_object_type_path(tenant_id, object_type.id, "general"),
        rank=rank,
        source=scope,
        meta=RuntimeSearchResultMeta(
            objectTypeId=object_type_id,
            objectTypeKey=str(object_type.key or ""),
        ),
    )


def _build_field_result(
    *,
    tenant_id: int,
    field,
    object_type,
    rank: int,
    scope: str,
) -> RuntimeSearchResultItem:
    object_type_id = str(field.object_type_id)
    object_type_name = str(object_type.name) if object_type else None
    return RuntimeSearchResultItem(
        id=str(field.id),
        type="designer.field",
        title=str(field.name or ""),
        subtitle=_designer_subtitle("designer.field", object_type_name),
        path=_object_type_path(tenant_id, field.object_type_id, "fields"),
        rank=rank,
        source=scope,
        meta=RuntimeSearchResultMeta(
            objectTypeId=object_type_id,
            objectTypeKey=str(object_type.key) if object_type and object_type.key else None,
        ),
    )


def _build_view_result(
    *,
    tenant_id: int,
    view,
    object_type,
    rank: int,
    scope: str,
) -> RuntimeSearchResultItem:
    object_type_id = str(view.object_type_id)
    object_type_name = str(object_type.name) if object_type else None
    return RuntimeSearchResultItem(
        id=str(view.id),
        type="designer.view",
        title=str(view.name or ""),
        subtitle=_designer_subtitle("designer.view", object_type_name),
        path=_object_type_path(tenant_id, view.object_type_id, "views"),
        rank=rank,
        source=scope,
        meta=RuntimeSearchResultMeta(
            objectTypeId=object_type_id,
            objectTypeKey=str(object_type.key) if object_type and object_type.key else None,
        ),
    )


def _build_relation_result(
    *,
    tenant_id: int,
    relation,
    rank: int,
    scope: str,
    object_type_id: UUID | None,
) -> RuntimeSearchResultItem:
    return RuntimeSearchResultItem(
        id=str(relation.id),
        type="designer.relation",
        title=str(relation.name or ""),
        subtitle=_designer_subtitle("designer.relation"),
        path=_relations_path(tenant_id, object_type_id),
        rank=rank,
        source=scope,
        meta=RuntimeSearchResultMeta(
            objectTypeId=str(object_type_id) if object_type_id else None,
        ),
    )


def _resolve_designer_scope(scope: str) -> str:
    normalized = scope.strip()
    if normalized in SUPPORTED_DESIGNER_SCOPES:
        return normalized
    return "designer.workspace"


def execute_designer_search(
    db: Session,
    *,
    tenant_id: int,
    query: str,
    scope: str,
    params: dict,
    limit: int,
) -> list[RuntimeSearchResultItem]:
    effective_scope = _resolve_designer_scope(scope)
    object_type_id = _parse_object_type_id(params)
    per_source_limit = max(limit, 5)
    merged: list[RuntimeSearchResultItem] = []

    include_object_types = effective_scope in {
        "designer.workspace",
        "designer.object_type",
    }
    include_fields = effective_scope in {
        "designer.workspace",
        "designer.object_type",
        "designer.fields",
    }
    include_views = effective_scope in {
        "designer.workspace",
        "designer.object_type",
        "designer.views",
    }
    include_relations = effective_scope in {
        "designer.workspace",
        "designer.object_type",
        "designer.relations",
    }

    if include_object_types:
        for object_type, rank in search_designer_object_types(
            db,
            tenant_id=tenant_id,
            query=query,
            limit=per_source_limit,
            object_type_id=object_type_id if effective_scope == "designer.object_type" else None,
        ):
            merged.append(
                _build_object_type_result(
                    tenant_id=tenant_id,
                    object_type=object_type,
                    rank=rank,
                    scope=effective_scope,
                )
            )

    if include_fields:
        for field, object_type, rank in search_designer_fields(
            db,
            tenant_id=tenant_id,
            query=query,
            limit=per_source_limit,
            object_type_id=object_type_id,
        ):
            merged.append(
                _build_field_result(
                    tenant_id=tenant_id,
                    field=field,
                    object_type=object_type,
                    rank=rank,
                    scope=effective_scope,
                )
            )

    if include_views:
        for view, object_type, rank in search_designer_views(
            db,
            tenant_id=tenant_id,
            query=query,
            limit=per_source_limit,
            object_type_id=object_type_id,
        ):
            merged.append(
                _build_view_result(
                    tenant_id=tenant_id,
                    view=view,
                    object_type=object_type,
                    rank=rank,
                    scope=effective_scope,
                )
            )

    if include_relations:
        for relation, rank in search_designer_relations(
            db,
            tenant_id=tenant_id,
            query=query,
            limit=per_source_limit,
            object_type_id=object_type_id,
        ):
            merged.append(
                _build_relation_result(
                    tenant_id=tenant_id,
                    relation=relation,
                    rank=rank,
                    scope=effective_scope,
                    object_type_id=object_type_id,
                )
            )

    merged.sort(key=lambda item: (item.rank, item.title.casefold(), item.id))
    return merged[:limit]


def decorate_runtime_results(results: list[RuntimeSearchResultItem]) -> list[RuntimeSearchResultItem]:
    decorated: list[RuntimeSearchResultItem] = []

    for item in results:
        kind = RUNTIME_KIND_LABELS.get(item.type, "Офис")
        subtitle = str(item.subtitle or "").strip()
        if subtitle and not subtitle.startswith("Офис ·"):
            next_subtitle = f"Офис · {subtitle}"
        elif subtitle:
            next_subtitle = subtitle
        else:
            next_subtitle = f"Офис · {kind}"

        decorated.append(
            item.model_copy(
                update={
                    "subtitle": next_subtitle,
                }
            )
        )

    return decorated


def resolve_runtime_scope(scope: str) -> str:
    normalized = scope.strip()
    if normalized.startswith("runtime."):
        return normalized
    return "runtime.company"


def execute_platform_search(
    db: Session,
    *,
    tenant_id: int,
    user,
    payload,
) -> dict:
    from app.modules.platform.search.permissions import (
        resolve_allowed_search_domains,
        resolve_effective_search_domains,
        SEARCH_DOMAIN_DESIGNER,
        SEARCH_DOMAIN_RUNTIME,
    )
    from app.modules.platform.search.schemas import PlatformSearchResponse

    query = payload.query.strip()
    if not query:
        raise _validation_error("query не может быть пустым")

    allowed_domains = resolve_allowed_search_domains(user)
    effective_domains = resolve_effective_search_domains(
        user,
        requested_domains=payload.requestedDomains,
        current_mode=payload.currentMode,
    )

    limit = payload.limit
    params = payload.params.model_dump(exclude_none=True)
    merged: list[RuntimeSearchResultItem] = []

    if SEARCH_DOMAIN_RUNTIME in effective_domains:
        runtime_scope = resolve_runtime_scope(payload.scope)
        runtime_response = execute_runtime_search(
            db,
            tenant_id=tenant_id,
            payload=RuntimeSearchRequest(
                query=query,
                scope=runtime_scope,
                params=payload.params,
                limit=limit,
            ),
        )
        merged.extend(decorate_runtime_results(runtime_response.results))

    if SEARCH_DOMAIN_DESIGNER in effective_domains:
        designer_scope = (
            payload.scope
            if str(payload.scope).startswith("designer.")
            else "designer.workspace"
        )
        merged.extend(
            execute_designer_search(
                db,
                tenant_id=tenant_id,
                query=query,
                scope=designer_scope,
                params=params,
                limit=limit,
            )
        )

    merged.sort(key=lambda item: (item.rank, item.title.casefold(), item.id))
    merged = merged[:limit]

    return PlatformSearchResponse(
        query=query,
        scope=payload.scope,
        currentMode=payload.currentMode,
        results=merged,
        meta={
            "allowedDomains": allowed_domains,
            "effectiveDomains": effective_domains,
            "crossModeEnabled": len(allowed_domains) > 1,
        },
    )
