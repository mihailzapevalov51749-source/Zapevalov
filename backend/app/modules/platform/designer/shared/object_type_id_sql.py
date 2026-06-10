from __future__ import annotations

from uuid import UUID

from sqlalchemy import String, cast


def match_uuid_column(column, object_type_id: UUID):
    """Compare UUID id to a column that may be stored as VARCHAR or UUID."""
    return cast(column, String) == str(object_type_id)
