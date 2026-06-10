from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.modules.platform.designer.object_types.navigation_cleanup import (
    collect_object_type_navigation_items,
)
from app.modules.platform.action_engine.action_definitions.models import DesignerActionDefinition
from app.modules.platform.action_engine.action_forms.models import (
    DesignerActionForm,
    DesignerActionFormField,
)
from app.modules.platform.action_engine.action_placements.models import DesignerActionPlacement
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.shared.object_type_id_sql import match_uuid_column
from app.modules.platform.designer.shared.soft_delete import apply_soft_delete
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.office_user_views.models import RuntimeOfficeUserTableView
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance

INTERNAL_COUNT_LABELS: tuple[tuple[str, str], ...] = (
    ("fields", "Поля"),
    ("views", "Представления"),
    ("actions", "Действия"),
    ("navigation", "Навигация"),
    ("runtime_records", "Записи"),
    ("relations", "Связи"),
)


@dataclass(frozen=True)
class ObjectTypeDeleteCount:
    category: str
    label: str
    count: int


@dataclass(frozen=True)
class ObjectTypeExternalWarning:
    category: str
    label: str
    items: list[str]


def _owned_action_ids(db: Session, tenant_id: int, object_type_id: UUID) -> list[UUID]:
    rows = (
        db.query(DesignerActionDefinition.id)
        .filter(
            DesignerActionDefinition.tenant_id == tenant_id,
            DesignerActionDefinition.object_type_id == object_type_id,
        )
        .all()
    )
    return [row[0] for row in rows]


def _relation_rows(db: Session, tenant_id: int, object_type_id: UUID) -> list[DesignerRelationDefinition]:
    return (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.deleted_at.is_(None),
            or_(
                DesignerRelationDefinition.source_object_type_id == object_type_id,
                DesignerRelationDefinition.target_object_type_id == object_type_id,
            ),
        )
        .all()
    )


def _runtime_entity_ids(db: Session, tenant_id: int, object_type_id: UUID) -> list[UUID]:
    rows = (
        db.query(RuntimeEntity.id)
        .filter(
            RuntimeEntity.tenant_id == tenant_id,
            RuntimeEntity.object_type_id == object_type_id,
            RuntimeEntity.deleted_at.is_(None),
        )
        .all()
    )
    return [row[0] for row in rows]


def count_internal_entities(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    *,
    object_type_key: str | None = None,
) -> list[ObjectTypeDeleteCount]:
    fields_count = (
        db.query(func.count(DesignerFieldDefinition.id))
        .filter(
            DesignerFieldDefinition.tenant_id == tenant_id,
            DesignerFieldDefinition.object_type_id == object_type_id,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .scalar()
    )
    views_count = (
        db.query(func.count(DesignerViewDefinition.id))
        .filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.object_type_id == object_type_id,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .scalar()
    )
    actions_count = (
        db.query(func.count(DesignerActionDefinition.id))
        .filter(
            DesignerActionDefinition.tenant_id == tenant_id,
            DesignerActionDefinition.object_type_id == object_type_id,
        )
        .scalar()
    )
    navigation_count = len(
        collect_object_type_navigation_items(
            db,
            tenant_id,
            object_type_id,
            object_type_key=str(object_type_key or ""),
            active_only=True,
        ),
    )
    runtime_count = (
        db.query(func.count(RuntimeEntity.id))
        .filter(
            RuntimeEntity.tenant_id == tenant_id,
            RuntimeEntity.object_type_id == object_type_id,
            RuntimeEntity.deleted_at.is_(None),
        )
        .scalar()
    )
    relations_count = len(_relation_rows(db, tenant_id, object_type_id))

    raw_counts = {
        "fields": int(fields_count or 0),
        "views": int(views_count or 0),
        "actions": int(actions_count or 0),
        "navigation": int(navigation_count or 0),
        "runtime_records": int(runtime_count or 0),
        "relations": relations_count,
    }

    if object_type_key:
        user_views_count = (
            db.query(func.count(RuntimeOfficeUserTableView.id))
            .filter(
                RuntimeOfficeUserTableView.tenant_id == tenant_id,
                RuntimeOfficeUserTableView.object_type_key == object_type_key,
            )
            .scalar()
        )
        if user_views_count:
            raw_counts["user_views"] = int(user_views_count)

    counts: list[ObjectTypeDeleteCount] = []
    for category, label in INTERNAL_COUNT_LABELS:
        count = raw_counts.get(category, 0)
        if count:
            counts.append(ObjectTypeDeleteCount(category=category, label=label, count=count))

    if raw_counts.get("user_views"):
        counts.append(
            ObjectTypeDeleteCount(
                category="user_views",
                label="Пользовательские настройки",
                count=raw_counts["user_views"],
            ),
        )
    return counts


def find_external_dependencies(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    *,
    object_type_name: str,
) -> list[ObjectTypeExternalWarning]:
    warnings: list[ObjectTypeExternalWarning] = []

    workspace_tab_rows = (
        db.query(DesignerWorkspaceTab, DesignerWorkspace)
        .join(DesignerWorkspace, DesignerWorkspace.id == DesignerWorkspaceTab.workspace_id)
        .filter(
            DesignerWorkspaceTab.tenant_id == tenant_id,
            DesignerWorkspaceTab.deleted_at.is_(None),
            DesignerWorkspace.deleted_at.is_(None),
            match_uuid_column(DesignerWorkspaceTab.object_type_id, object_type_id),
        )
        .order_by(DesignerWorkspace.title.asc(), DesignerWorkspaceTab.title.asc())
        .all()
    )
    if workspace_tab_rows:
        warnings.append(
            ObjectTypeExternalWarning(
                category="workspaces",
                label="Пространства",
                items=[
                    f'Пространство «{workspace.title}» → вкладка «{tab.title}»'
                    for tab, workspace in workspace_tab_rows
                ],
            ),
        )

    external_action_rows = (
        db.query(DesignerActionDefinition, DesignerObjectType)
        .join(
            DesignerObjectType,
            DesignerObjectType.id == DesignerActionDefinition.object_type_id,
        )
        .filter(
            DesignerActionDefinition.tenant_id == tenant_id,
            DesignerActionDefinition.target_object_type_id == object_type_id,
            DesignerActionDefinition.object_type_id != object_type_id,
        )
        .order_by(DesignerObjectType.name.asc(), DesignerActionDefinition.name.asc())
        .all()
    )
    if external_action_rows:
        warnings.append(
            ObjectTypeExternalWarning(
                category="external_actions",
                label="Действия других объектов",
                items=[
                    f'Объект «{owner.name}» → действие «{action.name}»'
                    for action, owner in external_action_rows
                ],
            ),
        )

    relation_keys = {relation.key for relation in _relation_rows(db, tenant_id, object_type_id)}
    if relation_keys:
        other_object_names = {
            row.id: row.name
            for row in db.query(DesignerObjectType.id, DesignerObjectType.name)
            .filter(
                DesignerObjectType.tenant_id == tenant_id,
                DesignerObjectType.id != object_type_id,
                DesignerObjectType.deleted_at.is_(None),
            )
            .all()
        }
        external_field_items: list[str] = []
        field_rows = (
            db.query(DesignerFieldDefinition)
            .filter(
                DesignerFieldDefinition.tenant_id == tenant_id,
                DesignerFieldDefinition.object_type_id != object_type_id,
                DesignerFieldDefinition.deleted_at.is_(None),
                DesignerFieldDefinition.field_type == "relation",
            )
            .all()
        )
        for field in field_rows:
            settings = field.settings_json if isinstance(field.settings_json, dict) else {}
            relation_key = str(settings.get("relation_key") or "").strip()
            if relation_key and relation_key in relation_keys:
                owner_name = other_object_names.get(field.object_type_id, "—")
                external_field_items.append(
                    f'Объект «{owner_name}» → поле «{field.name}»',
                )
        if external_field_items:
            warnings.append(
                ObjectTypeExternalWarning(
                    category="external_fields",
                    label="Поля других объектов",
                    items=sorted(external_field_items),
                ),
            )

    return warnings


def soft_delete_object_type_internals(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    entity: DesignerObjectType,
    *,
    actor_id: int | None,
) -> None:
    action_ids = _owned_action_ids(db, tenant_id, object_type_id)
    entity_ids = _runtime_entity_ids(db, tenant_id, object_type_id)
    relation_keys = {relation.key for relation in _relation_rows(db, tenant_id, object_type_id)}

    relation_instance_filters = []
    if entity_ids:
        relation_instance_filters.append(
            or_(
                RuntimeRelationInstance.source_entity_id.in_(entity_ids),
                RuntimeRelationInstance.target_entity_id.in_(entity_ids),
            ),
        )
    if relation_keys:
        relation_instance_filters.append(
            RuntimeRelationInstance.relation_key.in_(sorted(relation_keys)),
        )
    if relation_instance_filters:
        for relation_instance in (
            db.query(RuntimeRelationInstance)
            .filter(
                RuntimeRelationInstance.tenant_id == tenant_id,
                RuntimeRelationInstance.deleted_at.is_(None),
                or_(*relation_instance_filters),
            )
            .all()
        ):
            apply_soft_delete(relation_instance, deleted_by=actor_id)

    for runtime_entity in (
        db.query(RuntimeEntity)
        .filter(
            RuntimeEntity.tenant_id == tenant_id,
            RuntimeEntity.object_type_id == object_type_id,
            RuntimeEntity.deleted_at.is_(None),
        )
        .all()
    ):
        apply_soft_delete(runtime_entity, deleted_by=actor_id)

    if action_ids:
        form_ids = [
            row[0]
            for row in db.query(DesignerActionForm.id)
            .filter(
                DesignerActionForm.tenant_id == tenant_id,
                DesignerActionForm.action_definition_id.in_(action_ids),
            )
            .all()
        ]
        if form_ids:
            db.query(DesignerActionFormField).filter(
                DesignerActionFormField.tenant_id == tenant_id,
                DesignerActionFormField.action_form_id.in_(form_ids),
            ).delete(synchronize_session=False)
        db.query(DesignerActionForm).filter(
            DesignerActionForm.tenant_id == tenant_id,
            DesignerActionForm.action_definition_id.in_(action_ids),
        ).delete(synchronize_session=False)
        db.query(DesignerActionPlacement).filter(
            DesignerActionPlacement.tenant_id == tenant_id,
            DesignerActionPlacement.action_definition_id.in_(action_ids),
        ).delete(synchronize_session=False)
        db.query(DesignerActionDefinition).filter(
            DesignerActionDefinition.tenant_id == tenant_id,
            DesignerActionDefinition.id.in_(action_ids),
        ).delete(synchronize_session=False)

    for relation in _relation_rows(db, tenant_id, object_type_id):
        apply_soft_delete(relation, deleted_by=actor_id)

    for view in (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.object_type_id == object_type_id,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .all()
    ):
        apply_soft_delete(view, deleted_by=actor_id)

    for field in (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == tenant_id,
            DesignerFieldDefinition.object_type_id == object_type_id,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .all()
    ):
        apply_soft_delete(field, deleted_by=actor_id)

    for nav_item in collect_object_type_navigation_items(
        db,
        tenant_id,
        object_type_id,
        object_type_key=entity.key,
        active_only=True,
    ):
        apply_soft_delete(nav_item, deleted_by=actor_id)

    db.query(RuntimeOfficeUserTableView).filter(
        RuntimeOfficeUserTableView.tenant_id == tenant_id,
        RuntimeOfficeUserTableView.object_type_key == entity.key,
    ).delete(synchronize_session=False)


def hard_delete_object_type_internals(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    *,
    object_type_key: str,
    include_soft_deleted: bool = False,
) -> None:
    action_ids = _owned_action_ids(db, tenant_id, object_type_id)

    entity_query = db.query(RuntimeEntity.id).filter(
        RuntimeEntity.tenant_id == tenant_id,
        RuntimeEntity.object_type_id == object_type_id,
    )
    if not include_soft_deleted:
        entity_query = entity_query.filter(RuntimeEntity.deleted_at.is_(None))
    entity_ids = [row[0] for row in entity_query.all()]

    relation_query = db.query(DesignerRelationDefinition.key).filter(
        DesignerRelationDefinition.tenant_id == tenant_id,
        or_(
            DesignerRelationDefinition.source_object_type_id == object_type_id,
            DesignerRelationDefinition.target_object_type_id == object_type_id,
        ),
    )
    if not include_soft_deleted:
        relation_query = relation_query.filter(DesignerRelationDefinition.deleted_at.is_(None))
    relation_keys = {row[0] for row in relation_query.all()}

    if entity_ids or relation_keys:
        relation_instance_query = db.query(RuntimeRelationInstance).filter(
            RuntimeRelationInstance.tenant_id == tenant_id,
        )
        filters = []
        if entity_ids:
            filters.append(
                or_(
                    RuntimeRelationInstance.source_entity_id.in_(entity_ids),
                    RuntimeRelationInstance.target_entity_id.in_(entity_ids),
                ),
            )
        if relation_keys:
            filters.append(RuntimeRelationInstance.relation_key.in_(sorted(relation_keys)))
        if filters:
            relation_instance_query = relation_instance_query.filter(or_(*filters))
            relation_instance_query.delete(synchronize_session=False)

    if entity_ids:
        db.query(RuntimeEntityValue).filter(
            RuntimeEntityValue.tenant_id == tenant_id,
            RuntimeEntityValue.entity_id.in_(entity_ids),
        ).delete(synchronize_session=False)
        db.query(RuntimeEntity).filter(RuntimeEntity.id.in_(entity_ids)).delete(
            synchronize_session=False,
        )

    if action_ids:
        form_ids = [
            row[0]
            for row in db.query(DesignerActionForm.id)
            .filter(
                DesignerActionForm.tenant_id == tenant_id,
                DesignerActionForm.action_definition_id.in_(action_ids),
            )
            .all()
        ]
        if form_ids:
            db.query(DesignerActionFormField).filter(
                DesignerActionFormField.tenant_id == tenant_id,
                DesignerActionFormField.action_form_id.in_(form_ids),
            ).delete(synchronize_session=False)
        db.query(DesignerActionForm).filter(
            DesignerActionForm.tenant_id == tenant_id,
            DesignerActionForm.action_definition_id.in_(action_ids),
        ).delete(synchronize_session=False)
        db.query(DesignerActionPlacement).filter(
            DesignerActionPlacement.tenant_id == tenant_id,
            DesignerActionPlacement.action_definition_id.in_(action_ids),
        ).delete(synchronize_session=False)
        db.query(DesignerActionDefinition).filter(
            DesignerActionDefinition.tenant_id == tenant_id,
            DesignerActionDefinition.id.in_(action_ids),
        ).delete(synchronize_session=False)

    relation_delete_query = db.query(DesignerRelationDefinition).filter(
        DesignerRelationDefinition.tenant_id == tenant_id,
        or_(
            DesignerRelationDefinition.source_object_type_id == object_type_id,
            DesignerRelationDefinition.target_object_type_id == object_type_id,
        ),
    )
    if not include_soft_deleted:
        relation_delete_query = relation_delete_query.filter(
            DesignerRelationDefinition.deleted_at.is_(None),
        )
    relation_delete_query.delete(synchronize_session=False)

    view_delete_query = db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == tenant_id,
        DesignerViewDefinition.object_type_id == object_type_id,
    )
    if not include_soft_deleted:
        view_delete_query = view_delete_query.filter(DesignerViewDefinition.deleted_at.is_(None))
    view_delete_query.delete(synchronize_session=False)

    field_delete_query = db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == tenant_id,
        DesignerFieldDefinition.object_type_id == object_type_id,
    )
    if not include_soft_deleted:
        field_delete_query = field_delete_query.filter(DesignerFieldDefinition.deleted_at.is_(None))
    field_delete_query.delete(synchronize_session=False)

    nav_items = collect_object_type_navigation_items(
        db,
        tenant_id,
        object_type_id,
        object_type_key=object_type_key,
        active_only=not include_soft_deleted,
    )
    for nav_item in nav_items:
        db.delete(nav_item)

    db.query(RuntimeOfficeUserTableView).filter(
        RuntimeOfficeUserTableView.tenant_id == tenant_id,
        RuntimeOfficeUserTableView.object_type_key == object_type_key,
    ).delete(synchronize_session=False)
