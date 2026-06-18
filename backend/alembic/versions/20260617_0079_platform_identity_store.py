"""Add Platform Identity Store tables (ADR-010).

Revision ID: 20260617_0079
Revises: 20260617_0078
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260617_0079"
down_revision: Union[str, None] = "20260617_0078"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS platform_identities (
            platform_identity_id UUID PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            status VARCHAR(32) NOT NULL,
            full_name VARCHAR(255) NULL,
            phone VARCHAR(50) NULL,
            avatar_url VARCHAR(500) NULL,
            avatar_settings JSONB NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_platform_identities_email UNIQUE (email)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_platform_identities_status
        ON platform_identities (status)
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS platform_role_bindings (
            id SERIAL PRIMARY KEY,
            platform_identity_id UUID NOT NULL
                REFERENCES platform_identities(platform_identity_id) ON DELETE CASCADE,
            platform_role VARCHAR(64) NOT NULL,
            status VARCHAR(32) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_platform_role_bindings_identity_role
                UNIQUE (platform_identity_id, platform_role)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_platform_role_bindings_platform_identity_id
        ON platform_role_bindings (platform_identity_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_platform_role_bindings_platform_role
        ON platform_role_bindings (platform_role)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_platform_role_bindings_status
        ON platform_role_bindings (status)
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_role_bindings_single_active_owner
        ON platform_role_bindings (platform_role)
        WHERE platform_role = 'platform_owner' AND status = 'active'
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS platform_credentials (
            credential_id UUID PRIMARY KEY,
            platform_identity_id UUID NOT NULL
                REFERENCES platform_identities(platform_identity_id) ON DELETE CASCADE,
            credential_kind VARCHAR(32) NOT NULL,
            provider_key VARCHAR(64) NOT NULL,
            issuer_key VARCHAR(255) NULL,
            external_subject_id TEXT NULL,
            password_hash VARCHAR(255) NULL,
            status VARCHAR(32) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_used_at TIMESTAMPTZ NULL
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_platform_credentials_platform_identity_id
        ON platform_credentials (platform_identity_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_platform_credentials_credential_kind
        ON platform_credentials (credential_kind)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_platform_credentials_provider_key
        ON platform_credentials (provider_key)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_platform_credentials_status
        ON platform_credentials (status)
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_credentials_single_active_password
        ON platform_credentials (platform_identity_id)
        WHERE credential_kind = 'password' AND status = 'active'
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_credentials_federated_subject
        ON platform_credentials (provider_key, issuer_key, external_subject_id)
        WHERE credential_kind = 'federated' AND external_subject_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS platform_credentials")
    op.execute("DROP TABLE IF EXISTS platform_role_bindings")
    op.execute("DROP TABLE IF EXISTS platform_identities")
