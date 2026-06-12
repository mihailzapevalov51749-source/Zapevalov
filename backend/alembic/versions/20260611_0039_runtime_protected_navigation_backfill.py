"""Backfill runtime protected navigation system_key and flags

Revision ID: 20260611_0039
Revises: 20260611_0038
Create Date: 2026-06-11

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.orm import Session

revision: str = "20260611_0039"
down_revision: Union[str, None] = "20260611_0038"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    try:
        # Register FK targets before ORM flush inside backfill.
        from app.modules.navigation.models import NavigationItem  # noqa: F401
        from app.modules.portals.models import Portal  # noqa: F401
        from app.modules.users.models import User  # noqa: F401
        from app.modules.navigation.runtime_protected_pages import (
            backfill_runtime_protected_navigation,
        )

        backfill_runtime_protected_navigation(session)
        session.commit()
    finally:
        session.close()


def downgrade() -> None:
    # Data backfill is not reversed — flags may remain on runtime navigation.
    pass
