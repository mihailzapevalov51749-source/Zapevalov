from sqlalchemy.orm import Session

from app.modules.platform.designer.publish.models import DesignerMetadataSnapshot


def get_latest_snapshot(
    db: Session,
    tenant_id: int,
) -> DesignerMetadataSnapshot | None:
    return (
        db.query(DesignerMetadataSnapshot)
        .filter(DesignerMetadataSnapshot.tenant_id == tenant_id)
        .order_by(DesignerMetadataSnapshot.catalog_version.desc())
        .first()
    )
