"""Platform auth resolver — dual read for Platform Owner (WI-05)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.constants import (
    CREDENTIAL_KIND_PASSWORD,
    CREDENTIAL_PROVIDER_LOCAL,
    CREDENTIAL_STATUS_ACTIVE,
    PLATFORM_IDENTITY_STATUS_ACTIVE,
    PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    PLATFORM_ROLE_OWNER,
)
from app.modules.control_plane.platform_identity.models import (
    PlatformCredential,
    PlatformIdentity,
    PlatformRoleBinding,
)
from app.modules.control_plane.platform_identity.repository import normalize_email
from app.modules.control_plane.platform_identity.service import (
    get_platform_identity_by_email,
    list_platform_credentials,
    list_platform_role_bindings,
)
from app.modules.users.models import User

PlatformAuthSource = Literal["store", "legacy", "none"]


@dataclass(frozen=True)
class PlatformOwnerStoreMatch:
    """Platform Owner resolved from Platform Identity Store (platform_owner only)."""

    platform_identity_id: str
    email: str
    display_name: str | None
    platform_role: str
    credential_id: str | None
    legacy_user_id: int


@dataclass(frozen=True)
class PlatformAuthContext:
    """Resolved platform auth context for an authenticated user."""

    source: PlatformAuthSource
    is_platform_owner: bool
    store_match: PlatformOwnerStoreMatch | None
    legacy_user_id: int | None
    identity: PlatformIdentity | None = None
    owner_binding: PlatformRoleBinding | None = None
    credential: PlatformCredential | None = None

    def to_audit_dict(self) -> dict:
        return {
            "source": self.source,
            "is_platform_owner": self.is_platform_owner,
            "legacy_user_id": self.legacy_user_id,
            "store_match": (
                {
                    "platform_identity_id": self.store_match.platform_identity_id,
                    "email": self.store_match.email,
                    "platform_role": self.store_match.platform_role,
                    "credential_id": self.store_match.credential_id,
                    "legacy_user_id": self.store_match.legacy_user_id,
                }
                if self.store_match is not None
                else None
            ),
        }


def resolve_platform_owner_store_match(
    db: Session,
    user: User,
) -> PlatformOwnerStoreMatch | None:
    """Resolve Platform Owner via Store (platform_owner binding only)."""
    if user is None or getattr(user, "tenant_id", None) is not None:
        return None

    identity = get_platform_identity_by_email(db, normalize_email(user.email))
    if identity is None or identity.status != PLATFORM_IDENTITY_STATUS_ACTIVE:
        return None

    bindings = list_platform_role_bindings(db, identity.platform_identity_id)
    owner_binding = next(
        (
            binding
            for binding in bindings
            if binding.platform_role == PLATFORM_ROLE_OWNER
            and binding.status == PLATFORM_ROLE_BINDING_STATUS_ACTIVE
        ),
        None,
    )
    if owner_binding is None:
        return None

    credentials = list_platform_credentials(db, identity.platform_identity_id)
    password_cred = next(
        (
            cred
            for cred in credentials
            if cred.credential_kind == CREDENTIAL_KIND_PASSWORD
            and cred.provider_key == CREDENTIAL_PROVIDER_LOCAL
            and cred.status == CREDENTIAL_STATUS_ACTIVE
        ),
        None,
    )

    return PlatformOwnerStoreMatch(
        platform_identity_id=str(identity.platform_identity_id),
        email=identity.email,
        display_name=identity.full_name,
        platform_role=PLATFORM_ROLE_OWNER,
        credential_id=str(password_cred.credential_id) if password_cred else None,
        legacy_user_id=user.id,
    )


def resolve_platform_owner_store_entities(
    db: Session,
    user: User,
) -> tuple[PlatformIdentity, PlatformRoleBinding, PlatformCredential | None] | None:
    """Return Store entities for Platform Owner path."""
    if user is None or getattr(user, "tenant_id", None) is not None:
        return None

    identity = get_platform_identity_by_email(db, normalize_email(user.email))
    if identity is None or identity.status != PLATFORM_IDENTITY_STATUS_ACTIVE:
        return None

    bindings = list_platform_role_bindings(db, identity.platform_identity_id)
    owner_binding = next(
        (
            binding
            for binding in bindings
            if binding.platform_role == PLATFORM_ROLE_OWNER
            and binding.status == PLATFORM_ROLE_BINDING_STATUS_ACTIVE
        ),
        None,
    )
    if owner_binding is None:
        return None

    credentials = list_platform_credentials(db, identity.platform_identity_id)
    password_cred = next(
        (
            cred
            for cred in credentials
            if cred.credential_kind == CREDENTIAL_KIND_PASSWORD
            and cred.provider_key == CREDENTIAL_PROVIDER_LOCAL
            and cred.status == CREDENTIAL_STATUS_ACTIVE
        ),
        None,
    )
    return identity, owner_binding, password_cred


def is_platform_owner_via_store(db: Session, user: User | None) -> bool:
    if user is None:
        return False
    return resolve_platform_owner_store_match(db, user) is not None


def is_platform_owner_legacy(db: Session, user: User | None) -> bool:
    if user is None:
        return False

    from app.modules.users.bootstrap_owner_service import get_real_platform_owner_user

    owner = get_real_platform_owner_user(db)
    return owner is not None and owner.id == user.id


def is_platform_owner_dual_read(db: Session, user: User | None) -> bool:
    """Platform Owner check: Store first, legacy fallback."""
    if user is None:
        return False
    if is_platform_owner_via_store(db, user):
        return True
    return is_platform_owner_legacy(db, user)


def resolve_platform_auth_context(db: Session, user: User) -> PlatformAuthContext:
    """Full platform auth resolution for login and principal paths."""
    store_match = resolve_platform_owner_store_match(db, user)
    store_entities = resolve_platform_owner_store_entities(db, user)
    legacy_owner = is_platform_owner_legacy(db, user)

    if store_match is not None and store_entities is not None:
        identity, owner_binding, credential = store_entities
        return PlatformAuthContext(
            source="store",
            is_platform_owner=True,
            store_match=store_match,
            legacy_user_id=user.id,
            identity=identity,
            owner_binding=owner_binding,
            credential=credential,
        )

    if legacy_owner:
        return PlatformAuthContext(
            source="legacy",
            is_platform_owner=True,
            store_match=None,
            legacy_user_id=user.id,
        )

    return PlatformAuthContext(
        source="none",
        is_platform_owner=False,
        store_match=None,
        legacy_user_id=None,
    )


def link_platform_owner_after_login(db: Session, user: User) -> PlatformAuthContext:
    """Post-login Platform Owner identity resolution (no JWT mutation)."""
    return resolve_platform_auth_context(db, user)
