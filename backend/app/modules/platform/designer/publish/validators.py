from collections import defaultdict
from types import SimpleNamespace
from uuid import uuid4
from uuid import UUID

from app.modules.platform.designer.publish.draft_loader import TenantDraftCatalog
from app.modules.platform.designer.publish.object_view_contract import (
    validate_object_view_for_publish,
)
from app.modules.platform.designer.publish.schemas import (
    PublishSummaryCounts,
    PublishValidationReport,
    ValidationIssue,
)
from app.modules.platform.shared.enums import FieldType, RelationType, ViewType

TEXT_LIKE_FIELD_TYPES = {"text", "textarea"}


def _error(code: str, path: str, message: str) -> ValidationIssue:
    return ValidationIssue(code=code, path=path, message=message)


def _warning(code: str, path: str, message: str) -> ValidationIssue:
    return ValidationIssue(code=code, path=path, message=message)


def _collect_layout_field_keys(layout_json: dict) -> list[str]:
    keys: list[str] = []
    for field_name in ("visible_fields", "field_order"):
        value = layout_json.get(field_name)
        if isinstance(value, list):
            keys.extend(str(item) for item in value if item is not None)
    return keys


def _build_default_projection(fields: list[object]) -> dict:
    sorted_fields = sorted(
        fields,
        key=lambda row: (row.sort_order, row.key),
    )
    visible_fields = [field.key for field in sorted_fields]
    field_order = list(visible_fields)

    title_field = None
    for field in sorted_fields:
        if str(field.field_type or "").lower() in TEXT_LIKE_FIELD_TYPES:
            title_field = field.key
            break

    return {
        "visible_fields": visible_fields,
        "field_order": field_order,
        "title_field": title_field,
        "default_sort": {
            "field": None,
            "order": "desc",
        },
    }


def _bootstrap_default_table_views(catalog: TenantDraftCatalog) -> None:
    fields_by_object_type: dict[UUID, list] = defaultdict(list)
    views_by_object_type: dict[UUID, list] = defaultdict(list)

    for field in catalog.fields:
        fields_by_object_type[field.object_type_id].append(field)

    for view in catalog.views:
        views_by_object_type[view.object_type_id].append(view)

    for object_type in catalog.object_types:
        object_views = views_by_object_type.get(object_type.id, [])
        object_fields = fields_by_object_type.get(object_type.id, [])

        if not object_views:
            catalog.views.append(
                SimpleNamespace(
                    id=uuid4(),
                    tenant_id=object_type.tenant_id,
                    object_type_id=object_type.id,
                    key="default_table",
                    name="Таблица",
                    description="Системное табличное представление по умолчанию",
                    view_type=ViewType.TABLE.value,
                    is_default=True,
                    is_system=True,
                    is_active=True,
                    sort_order=0,
                    settings_json={
                        "projection": _build_default_projection(object_fields),
                    },
                    layout_json={},
                    filters_json={},
                    visibility_json={},
                )
            )
            continue

        default_system_table_view = next(
            (
                view
                for view in object_views
                if view.is_system and view.view_type == ViewType.TABLE.value and view.is_default
            ),
            None,
        )
        if not default_system_table_view:
            continue

        settings = (
            default_system_table_view.settings_json
            if isinstance(default_system_table_view.settings_json, dict)
            else {}
        )
        projection = settings.get("projection") if isinstance(settings, dict) else None

        projection_is_empty = (
            not isinstance(projection, dict)
            or (
                not (projection.get("visible_fields") or [])
                and not (projection.get("field_order") or [])
            )
        )
        if not projection_is_empty:
            continue

        next_settings = dict(settings)
        next_settings["projection"] = _build_default_projection(object_fields)
        default_system_table_view.settings_json = next_settings


def validate_tenant_draft_catalog(catalog: TenantDraftCatalog) -> PublishValidationReport:
    _bootstrap_default_table_views(catalog)

    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []

    object_types = catalog.object_types
    fields = catalog.fields
    relations = catalog.relations
    views = catalog.views

    object_type_by_id: dict[UUID, object] = {row.id: row for row in object_types}
    fields_by_object_type: dict[UUID, list] = defaultdict(list)
    views_by_object_type: dict[UUID, list] = defaultdict(list)

    for field in fields:
        fields_by_object_type[field.object_type_id].append(field)

    for view in views:
        views_by_object_type[view.object_type_id].append(view)

    if not object_types:
        errors.append(
            _error(
                "no_active_object_types",
                "object_types",
                "Должен быть минимум один active ObjectType",
            ),
        )

    for object_type in object_types:
        ot_path = f"object_types[{object_type.key}]"

        if not object_type.key or not object_type.name:
            errors.append(
                _error(
                    "object_type_missing_identity",
                    ot_path,
                    "У ObjectType должны быть key и name",
                ),
            )

        object_views = views_by_object_type.get(object_type.id, [])
        default_views = [view for view in object_views if view.is_default]

        if not object_views:
            errors.append(
                _error(
                    "object_type_missing_view",
                    ot_path,
                    "У каждого active ObjectType должен быть минимум один active ViewDefinition",
                ),
            )
        else:
            if not default_views:
                errors.append(
                    _error(
                        "object_type_missing_default_view",
                        ot_path,
                        "Если есть views, одна view должна быть default",
                    ),
                )
            if len(default_views) > 1:
                errors.append(
                    _error(
                        "object_type_multiple_default_views",
                        ot_path,
                        "У ObjectType может быть только одна default ViewDefinition",
                    ),
                )

    for field in fields:
        field_path = f"fields[{field.key}]"

        if field.object_type_id not in object_type_by_id:
            errors.append(
                _error(
                    "field_orphan_object_type",
                    field_path,
                    "FieldDefinition ссылается на несуществующий active ObjectType",
                ),
            )
            continue

        if not field.key or not field.name:
            errors.append(
                _error(
                    "field_missing_identity",
                    field_path,
                    "У FieldDefinition должны быть key и name",
                ),
            )

        try:
            FieldType(field.field_type)
        except ValueError:
            errors.append(
                _error(
                    "field_invalid_type",
                    field_path,
                    f"Недопустимый field_type: {field.field_type}",
                ),
            )

    object_type_keys = {row.key: row.id for row in object_types}

    for relation in relations:
        rel_path = f"relations[{relation.key}]"

        source = object_type_by_id.get(relation.source_object_type_id)
        target = object_type_by_id.get(relation.target_object_type_id)

        if not source:
            errors.append(
                _error(
                    "relation_invalid_source",
                    rel_path,
                    "source_object_type не найден среди active ObjectType",
                ),
            )
        if not target:
            errors.append(
                _error(
                    "relation_invalid_target",
                    rel_path,
                    "target_object_type не найден среди active ObjectType",
                ),
            )

        if source and target and source.id == target.id:
            errors.append(
                _error(
                    "relation_self_reference",
                    rel_path,
                    "source_object_type_id и target_object_type_id не могут совпадать",
                ),
            )

        try:
            RelationType(relation.relation_type)
        except ValueError:
            errors.append(
                _error(
                    "relation_invalid_type",
                    rel_path,
                    f"Недопустимый relation_type: {relation.relation_type}",
                ),
            )

        if relation.bidirectional and not (relation.reverse_name and relation.reverse_name.strip()):
            errors.append(
                _error(
                    "relation_missing_reverse_name",
                    rel_path,
                    "reverse_name обязателен, если bidirectional = true",
                ),
            )

        if relation.relation_type == RelationType.MANY_TO_MANY.value and relation.cascade_delete:
            errors.append(
                _error(
                    "relation_invalid_cascade_delete",
                    rel_path,
                    "cascade_delete нельзя включать для many_to_many",
                ),
            )

        if relation.cascade_delete and source and target and (source.is_system or target.is_system):
            errors.append(
                _error(
                    "relation_invalid_cascade_delete",
                    rel_path,
                    "cascade_delete нельзя включать для system ObjectType",
                ),
            )

    for view in views:
        view_path = f"views[{view.key}]"

        if view.object_type_id not in object_type_by_id:
            errors.append(
                _error(
                    "view_orphan_object_type",
                    view_path,
                    "ViewDefinition ссылается на несуществующий active ObjectType",
                ),
            )
            continue

        try:
            ViewType(view.view_type)
        except ValueError:
            errors.append(
                _error(
                    "view_invalid_type",
                    view_path,
                    f"Недопустимый view_type: {view.view_type}",
                ),
            )

        object_fields = fields_by_object_type.get(view.object_type_id, [])
        field_keys = {field.key for field in object_fields}

        layout_json = view.layout_json or {}
        for layout_key in _collect_layout_field_keys(layout_json):
            if layout_key not in field_keys:
                errors.append(
                    _error(
                        "view_unknown_field_key",
                        f"{view_path}.layout_json",
                        f"Поле '{layout_key}' не найдено среди FieldDefinition ObjectType",
                    ),
                )

        settings_json = view.settings_json if isinstance(view.settings_json, dict) else {}
        for code, message in validate_object_view_for_publish(
            view_key=str(view.key or ""),
            view_type=str(view.view_type or ""),
            settings_json=settings_json,
            field_keys=field_keys,
        ):
            errors.append(_error(code, f"{view_path}.settings_json", message))

        projection = settings_json.get("projection") if isinstance(settings_json, dict) else None
        object_view = settings_json.get("objectView") if isinstance(settings_json, dict) else None
        if isinstance(object_view, dict) and not isinstance(projection, dict):
            warnings.append(
                _warning(
                    "view_missing_projection_compatibility",
                    f"{view_path}.settings_json",
                    "objectView без projection: при publish будет создана compatibility projection",
                ),
            )

    summary = PublishSummaryCounts(
        object_types=len(object_types),
        fields=len(fields),
        relations=len(relations),
        views=len(views),
    )

    return PublishValidationReport(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        summary=summary,
    )
