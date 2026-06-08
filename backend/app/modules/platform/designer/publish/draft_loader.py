from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.modules.platform.action_engine.action_definitions.models import (
    DesignerActionDefinition,
)
from app.modules.platform.action_engine.action_placements.models import (
    DesignerActionPlacement,
)
from app.modules.platform.action_engine.action_forms.models import (
    DesignerActionForm,
    DesignerActionFormField,
)
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.shared.enums import ObjectTypeStatus


@dataclass
class TenantDraftCatalog:
    object_types: list[DesignerObjectType]
    fields: list[DesignerFieldDefinition]
    relations: list[DesignerRelationDefinition]
    views: list[DesignerViewDefinition]
    actions: list[DesignerActionDefinition] = field(default_factory=list)
    placements: list[DesignerActionPlacement] = field(default_factory=list)
    action_forms: list[DesignerActionForm] = field(default_factory=list)
    action_form_fields: list[DesignerActionFormField] = field(default_factory=list)


def load_tenant_draft_catalog(db: Session, tenant_id: int) -> TenantDraftCatalog:
    object_types = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
            DesignerObjectType.status == ObjectTypeStatus.ACTIVE.value,
        )
        .all()
    )

    object_type_ids = [row.id for row in object_types]

    fields: list[DesignerFieldDefinition] = []
    if object_type_ids:
        fields = (
            db.query(DesignerFieldDefinition)
            .filter(
                DesignerFieldDefinition.tenant_id == tenant_id,
                DesignerFieldDefinition.deleted_at.is_(None),
                DesignerFieldDefinition.object_type_id.in_(object_type_ids),
            )
            .all()
        )

    relations = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.deleted_at.is_(None),
            DesignerRelationDefinition.is_active.is_(True),
        )
        .all()
    )

    views: list[DesignerViewDefinition] = []
    if object_type_ids:
        views = (
            db.query(DesignerViewDefinition)
            .filter(
                DesignerViewDefinition.tenant_id == tenant_id,
                DesignerViewDefinition.deleted_at.is_(None),
                DesignerViewDefinition.is_active.is_(True),
                DesignerViewDefinition.object_type_id.in_(object_type_ids),
            )
            .all()
        )

    actions: list[DesignerActionDefinition] = []
    placements: list[DesignerActionPlacement] = []
    action_forms: list[DesignerActionForm] = []
    action_form_fields: list[DesignerActionFormField] = []
    if object_type_ids:
        actions = (
            db.query(DesignerActionDefinition)
            .filter(
                DesignerActionDefinition.tenant_id == tenant_id,
                DesignerActionDefinition.object_type_id.in_(object_type_ids),
            )
            .all()
        )
        placements = (
            db.query(DesignerActionPlacement)
            .filter(
                DesignerActionPlacement.tenant_id == tenant_id,
                DesignerActionPlacement.object_type_id.in_(object_type_ids),
            )
            .all()
        )
        action_forms = (
            db.query(DesignerActionForm)
            .filter(
                DesignerActionForm.tenant_id == tenant_id,
                DesignerActionForm.object_type_id.in_(object_type_ids),
            )
            .all()
        )
        action_form_ids = [row.id for row in action_forms]
        if action_form_ids:
            action_form_fields = (
                db.query(DesignerActionFormField)
                .filter(
                    DesignerActionFormField.tenant_id == tenant_id,
                    DesignerActionFormField.action_form_id.in_(action_form_ids),
                )
                .all()
            )

    return TenantDraftCatalog(
        object_types=object_types,
        fields=fields,
        relations=relations,
        views=views,
        actions=actions,
        placements=placements,
        action_forms=action_forms,
        action_form_fields=action_form_fields,
    )
