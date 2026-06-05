from datetime import datetime, timezone


def apply_soft_delete(entity, *, deleted_by: int | None = None) -> None:
    entity.deleted_at = datetime.now(timezone.utc)
    if hasattr(entity, "deleted_by"):
        entity.deleted_by = deleted_by


def restore_soft_deleted(entity) -> None:
    entity.deleted_at = None
    if hasattr(entity, "deleted_by"):
        entity.deleted_by = None


def is_soft_deleted(entity) -> bool:
    return getattr(entity, "deleted_at", None) is not None
