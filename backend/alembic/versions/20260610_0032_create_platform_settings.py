"""create platform_settings table

Revision ID: 20260610_0032
Revises: 20260610_0031
Create Date: 2026-06-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0032"
down_revision: Union[str, None] = "20260610_0031"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS platform_settings (
                id INTEGER PRIMARY KEY,
                platform_name VARCHAR(255) NOT NULL,
                platform_short_name VARCHAR(64) NOT NULL,
                description TEXT,
                timezone VARCHAR(128) NOT NULL,
                date_format VARCHAR(32) NOT NULL,
                time_format VARCHAR(16) NOT NULL,
                week_start_day VARCHAR(32) NOT NULL,
                default_language VARCHAR(16) NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
            )
            """
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO platform_settings (
                id,
                platform_name,
                platform_short_name,
                description,
                timezone,
                date_format,
                time_format,
                week_start_day,
                default_language,
                created_at,
                updated_at
            )
            SELECT
                1,
                'ЯсноПро',
                'ЯсноПро',
                'Платформа для управления корпоративными процессами и рабочими пространствами.',
                '(UTC+03:00) Москва',
                'DD.MM.YYYY',
                '24h',
                'Понедельник',
                'ru',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            WHERE NOT EXISTS (
                SELECT 1 FROM platform_settings WHERE id = 1
            )
            """
        )
    )


def downgrade() -> None:
    op.drop_table("platform_settings")
