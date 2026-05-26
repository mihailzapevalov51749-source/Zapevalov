from dataclasses import dataclass

from sqlalchemy.orm import Session

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

    return TenantDraftCatalog(
        object_types=object_types,
        fields=fields,
        relations=relations,
        views=views,
    )
