from collections import defaultdict
from types import SimpleNamespace
from uuid import uuid4
from uuid import UUID

from app.modules.platform.action_engine.action_placements.registry import (
    action_placement_registry,
    ensure_builtin_action_placements_registered,
)
from app.modules.platform.action_engine.action_types.registry import (
    action_type_registry,
    ensure_builtin_action_types_registered,
)
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
from app.modules.platform.shared.relation_field_contract import (
    is_relation_field_type,
    validate_relation_field_for_publish,
)

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
    ensure_builtin_action_types_registered()
    ensure_builtin_action_placements_registered()
    _bootstrap_default_table_views(catalog)

    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []

    object_types = catalog.object_types
    fields = catalog.fields
    relations = catalog.relations
    views = catalog.views
    actions = catalog.actions
    placements = catalog.placements
    action_forms = catalog.action_forms
    action_form_fields = catalog.action_form_fields

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
    relations_by_key = {relation.key: relation for relation in relations}

    for field in fields:
        if not is_relation_field_type(field.field_type):
            continue

        field_path = f"fields[{field.key}]"
        if field.object_type_id not in object_type_by_id:
            continue

        for issue in validate_relation_field_for_publish(
            field_key=field.key,
            settings_json=field.settings_json if isinstance(field.settings_json, dict) else {},
            object_type_id=field.object_type_id,
            relations_by_key=relations_by_key,
            default_value_json=field.default_value_json,
        ):
            errors.append(_error(issue.code, issue.path, issue.message))

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

    action_keys_by_object_type: dict[UUID, set[str]] = defaultdict(set)
    action_by_id = {action.id: action for action in actions}
    field_by_id = {field.id: field for field in fields}
    placement_keys_by_action: dict[UUID, set[str]] = defaultdict(set)
    forms_by_action: dict[UUID, object] = {}
    published_action_count = 0
    published_placement_count = 0

    for action in actions:
        action_path = f"actions[{action.key}]"

        if action.object_type_id not in object_type_by_id:
            errors.append(
                _error(
                    "action_orphan_object_type",
                    action_path,
                    "ActionDefinition ссылается на несуществующий active ObjectType",
                ),
            )
            continue

        if not action.key or not action.name:
            errors.append(
                _error(
                    "action_missing_identity",
                    action_path,
                    "У ActionDefinition должны быть key и name",
                ),
            )
            continue

        if action.key in action_keys_by_object_type[action.object_type_id]:
            errors.append(
                _error(
                    "action_duplicate_key",
                    action_path,
                    "ActionDefinition key должен быть уникален в рамках ObjectType",
                ),
            )
        else:
            action_keys_by_object_type[action.object_type_id].add(action.key)

        action_type = action_type_registry.get(action.action_type_key)
        if not action_type or not action_type.is_active:
            errors.append(
                _error(
                    "action_unknown_type",
                    action_path,
                    f"Неизвестный или неактивный action_type_key: {action.action_type_key}",
                ),
            )

        if action.action_type_key == "create_record":
            target_object_type_id = getattr(action, "target_object_type_id", None)
            if not target_object_type_id:
                errors.append(
                    _error(
                        "action_missing_target_object_type",
                        action_path,
                        "create_record требует target_object_type_id",
                    ),
                )
            elif target_object_type_id not in object_type_by_id:
                errors.append(
                    _error(
                        "action_unknown_target_object_type",
                        action_path,
                        "target_object_type не найден среди active ObjectType",
                    ),
                )

        if action.is_active:
            published_action_count += 1

    for placement in placements:
        placement_path = f"placements[{placement.placement_key}]"
        parent_action = action_by_id.get(placement.action_definition_id)

        if not parent_action:
            errors.append(
                _error(
                    "placement_orphan_action",
                    placement_path,
                    "ActionPlacement ссылается на несуществующий ActionDefinition",
                ),
            )
            continue

        if placement.object_type_id not in object_type_by_id:
            errors.append(
                _error(
                    "placement_orphan_object_type",
                    placement_path,
                    "ActionPlacement ссылается на несуществующий active ObjectType",
                ),
            )

        if placement.object_type_id != parent_action.object_type_id:
            errors.append(
                _error(
                    "placement_object_type_mismatch",
                    placement_path,
                    "ActionPlacement object_type_id не совпадает с ActionDefinition",
                ),
            )

        placement_catalog_item = action_placement_registry.get(placement.placement_key)
        if not placement_catalog_item or not placement_catalog_item.is_active:
            errors.append(
                _error(
                    "placement_unknown_key",
                    placement_path,
                    f"Неизвестный или неактивный placement_key: {placement.placement_key}",
                ),
            )

        placement_key_set = placement_keys_by_action[placement.action_definition_id]
        if placement.placement_key in placement_key_set:
            errors.append(
                _error(
                    "placement_duplicate_key",
                    f"actions[{parent_action.key}].placements[{placement.placement_key}]",
                    "Для ActionDefinition запрещены дублирующиеся placement_key",
                ),
            )
        else:
            placement_key_set.add(placement.placement_key)

        if placement.is_active and parent_action.is_active:
            published_placement_count += 1

    for action_form in action_forms:
        form_path = f"action_forms[{action_form.id}]"
        parent_action = action_by_id.get(action_form.action_definition_id)

        if not parent_action:
            errors.append(
                _error(
                    "action_form_orphan_action",
                    form_path,
                    "ActionForm ссылается на несуществующий ActionDefinition",
                ),
            )
            continue

        if action_form.object_type_id != parent_action.object_type_id:
            errors.append(
                _error(
                    "action_form_object_type_mismatch",
                    form_path,
                    "ActionForm object_type_id не совпадает с ActionDefinition",
                ),
            )

        if action_form.action_definition_id in forms_by_action:
            errors.append(
                _error(
                    "action_form_duplicate",
                    f"actions[{parent_action.key}].form",
                    "Для ActionDefinition допускается только одна ActionForm",
                ),
            )
        else:
            forms_by_action[action_form.action_definition_id] = action_form

        if not str(action_form.title or "").strip():
            errors.append(
                _error(
                    "action_form_missing_title",
                    form_path,
                    "У ActionForm должен быть title",
                ),
            )

    form_by_id = {row.id: row for row in action_forms}
    form_field_keys_by_form: dict[UUID, set[UUID]] = defaultdict(set)

    for form_field in action_form_fields:
        field_path = f"action_form_fields[{form_field.id}]"
        parent_form = form_by_id.get(form_field.action_form_id)

        if not parent_form:
            errors.append(
                _error(
                    "action_form_field_orphan_form",
                    field_path,
                    "ActionFormField ссылается на несуществующую ActionForm",
                ),
            )
            continue

        parent_action = action_by_id.get(parent_form.action_definition_id)
        field_definition = field_by_id.get(form_field.field_definition_id)

        if not field_definition:
            errors.append(
                _error(
                    "action_form_field_orphan_field_definition",
                    field_path,
                    "ActionFormField ссылается на несуществующий FieldDefinition",
                ),
            )
            continue

        fields_object_type_id = parent_form.object_type_id
        if parent_action and parent_action.action_type_key == "create_record":
            target_object_type_id = getattr(
                parent_action,
                "target_object_type_id",
                None,
            )
            if target_object_type_id:
                fields_object_type_id = target_object_type_id

        if field_definition.object_type_id != fields_object_type_id:
            errors.append(
                _error(
                    "action_form_field_object_type_mismatch",
                    field_path,
                    "ActionFormField field_definition_id не принадлежит ObjectType",
                ),
            )

        if form_field.field_definition_id in form_field_keys_by_form[parent_form.id]:
            errors.append(
                _error(
                    "action_form_field_duplicate",
                    f"actions[{parent_action.key if parent_action else parent_form.action_definition_id}].form.fields",
                    "Для ActionForm запрещены дублирующиеся field_definition_id",
                ),
            )
        else:
            form_field_keys_by_form[parent_form.id].add(form_field.field_definition_id)

    summary = PublishSummaryCounts(
        object_types=len(object_types),
        fields=len(fields),
        relations=len(relations),
        views=len(views),
        actions=published_action_count,
        placements=published_placement_count,
    )

    return PublishValidationReport(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        summary=summary,
    )
