"""add icon_type and icon_file_url to designer_object_types

Revision ID: 20250528_0008
Revises: 20250525_0007
Create Date: 2025-05-28

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250528_0008"
down_revision: Union[str, None] = "20250525_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "designer_object_types",
        sa.Column("icon_type", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "designer_object_types",
        sa.Column("icon_file_url", sa.String(length=1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("designer_object_types", "icon_file_url")
    op.drop_column("designer_object_types", "icon_type")
