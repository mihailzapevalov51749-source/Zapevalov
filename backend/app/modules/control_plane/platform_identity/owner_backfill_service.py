"""Backfill Platform Owner into Platform Identity Store (data-only, no runtime switch)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.constants import (
    CREDENTIAL_KIND_PASSWORD,
    CREDENTIAL_PROVIDER_LOCAL,
    CREDENTIAL_STATUS_ACTIVE,
    CREDENTIAL_STATUS_DISABLED,
    PLATFORM_IDENTITY_STATUS_ACTIVE,
    PLATFORM_IDENTITY_STATUS_ARCHIVED,
    PLATFORM_IDENTITY_STATUS_SUSPENDED,
    PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    PLATFORM_ROLE_OWNER,
)
from app.modules.control_plane.platform_identity.legacy_owner_audit import (
    LegacyPlatformOwnerAudit,
    resolve_legacy_platform_owner_audit,
)
from app.modules.control_plane.platform_identity.models import (
    PlatformCredential,
    PlatformIdentity,
    PlatformRoleBinding,
)
from app.modules.control_plane.platform_identity.repository import (
    PlatformCredentialRepository,
    PlatformIdentityRepository,
    PlatformRoleBindingRepository,
    normalize_email,
)
from app.modules.control_plane.platform_identity.service import (
    create_platform_credential,
    create_platform_identity,
    create_platform_role_binding,
    get_platform_identity_by_email,
    list_platform_credentials,
)
from app.modules.users.models import User

_identity_repo = PlatformIdentityRepository()
_role_binding_repo = PlatformRoleBindingRepository()
_credential_repo = PlatformCredentialRepository()


class PlatformOwnerBackfillError(RuntimeError):
    """Backfill cannot proceed safely."""


@dataclass(frozen=True)
class PlatformOwnerMappingAudit:
    legacy_user_id: int
    platform_identity_id: uuid.UUID
    email: str
    role_binding_id: int | None
    credential_id: uuid.UUID | None


@dataclass(frozen=True)
class PlatformOwnerBackfillResult:
    created_identity: bool
    created_role_binding: bool
    created_credential: bool
    skipped: bool
    legacy: LegacyPlatformOwnerAudit
    identity: PlatformIdentity
    role_binding: PlatformRoleBinding
    credential: PlatformCredential
    mapping: PlatformOwnerMappingAudit

    def to_audit_dict(self) -> dict:
        return {
            "legacy_user_id": self.mapping.legacy_user_id,
            "platform_identity_id": str(self.mapping.platform_identity_id),
            "email": self.mapping.email,
            "role_binding_id": self.mapping.role_binding_id,
            "credential_id": (
                str(self.mapping.credential_id) if self.mapping.credential_id else None
            ),
            "created_identity": self.created_identity,
            "created_role_binding": self.created_role_binding,
            "created_credential": self.created_credential,
            "skipped": self.skipped,
        }


def map_user_to_identity_status(user: User | LegacyPlatformOwnerAudit) -> str:
    account_status = str(getattr(user, "account_status", "active") or "active")
    is_active = bool(getattr(user, "is_active", True))
    login_disabled = bool(getattr(user, "login_disabled", False))

    if account_status == "archived":
        return PLATFORM_IDENTITY_STATUS_ARCHIVED
    if is_active and not login_disabled and account_status == "active":
        return PLATFORM_IDENTITY_STATUS_ACTIVE
    return PLATFORM_IDENTITY_STATUS_SUSPENDED


def map_user_to_credential_status(user: User | LegacyPlatformOwnerAudit) -> str:
    identity_status = map_user_to_identity_status(user)
    if identity_status == PLATFORM_IDENTITY_STATUS_ACTIVE:
        return CREDENTIAL_STATUS_ACTIVE
    return CREDENTIAL_STATUS_DISABLED


def build_platform_owner_mapping_audit(db: Session) -> PlatformOwnerMappingAudit | None:
    """Derive legacy → store mapping from current database state."""
    legacy = resolve_legacy_platform_owner_audit(db)
    if legacy is None:
        return None

    owner_binding = _role_binding_repo.get_active_owner_binding(db)
    if owner_binding is None:
        return None

    identity = _identity_repo.get_by_id(db, owner_binding.platform_identity_id)
    if identity is None:
        return None

    credentials = _credential_repo.list_for_identity(db, identity.platform_identity_id)
    password_cred = next(
        (
            c
            for c in credentials
            if c.credential_kind == CREDENTIAL_KIND_PASSWORD
            and c.provider_key == CREDENTIAL_PROVIDER_LOCAL
            and c.status == CREDENTIAL_STATUS_ACTIVE
        ),
        credentials[0] if credentials else None,
    )

    return PlatformOwnerMappingAudit(
        legacy_user_id=legacy.user_id,
        platform_identity_id=identity.platform_identity_id,
        email=identity.email,
        role_binding_id=owner_binding.id,
        credential_id=password_cred.credential_id if password_cred else None,
    )


def _load_legacy_user(db: Session, legacy: LegacyPlatformOwnerAudit) -> User:
    user = db.get(User, legacy.user_id)
    if user is None:
        raise PlatformOwnerBackfillError(
            f"Legacy Platform Owner user id={legacy.user_id} not found in users"
        )
    if not user.hashed_password:
        raise PlatformOwnerBackfillError(
            f"Legacy Platform Owner user id={legacy.user_id} has no hashed_password"
        )
    if user.tenant_id is not None:
        raise PlatformOwnerBackfillError(
            f"Legacy Platform Owner user id={legacy.user_id} is tenant-scoped "
            f"(tenant_id={user.tenant_id})"
        )
    return user


def _verify_existing_owner_binding(
    db: Session,
    *,
    legacy: LegacyPlatformOwnerAudit,
    identity: PlatformIdentity,
    owner_binding: PlatformRoleBinding,
) -> None:
    if normalize_email(identity.email) != normalize_email(legacy.email):
        raise PlatformOwnerBackfillError(
            "Active platform_owner binding exists for a different email: "
            f"store={identity.email!r} legacy={legacy.email!r}"
        )


def backfill_platform_owner_identity(
    db: Session,
    *,
    commit: bool = False,
) -> PlatformOwnerBackfillResult:
    """Create Platform Owner rows in Platform Identity Store from legacy SoT.

    Idempotent: if store already contains matching owner for legacy email,
    returns existing mapping without creating duplicates.
    """
    legacy = resolve_legacy_platform_owner_audit(db)
    if legacy is None:
        raise PlatformOwnerBackfillError(
            "Platform Owner not configured in platform_settings.platform_owner_user_id"
        )

    user = _load_legacy_user(db, legacy)
    normalized_email = normalize_email(legacy.email)

    created_identity = False
    created_role_binding = False
    created_credential = False
    skipped = False

    identity = get_platform_identity_by_email(db, normalized_email)
    if identity is None:
        identity = create_platform_identity(
            db,
            email=normalized_email,
            status=map_user_to_identity_status(user),
            full_name=legacy.full_name,
            phone=legacy.phone,
            avatar_url=legacy.avatar_url,
            avatar_settings=legacy.avatar_settings,
        )
        created_identity = True

    owner_binding = _role_binding_repo.get_active_owner_binding(db)
    if owner_binding is None:
        owner_binding = create_platform_role_binding(
            db,
            platform_identity_id=identity.platform_identity_id,
            platform_role=PLATFORM_ROLE_OWNER,
            status=PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
        )
        created_role_binding = True
    else:
        _verify_existing_owner_binding(
            db,
            legacy=legacy,
            identity=_identity_repo.get_by_id(db, owner_binding.platform_identity_id) or identity,
            owner_binding=owner_binding,
        )
        if owner_binding.platform_identity_id != identity.platform_identity_id:
            raise PlatformOwnerBackfillError(
                "Active platform_owner binding belongs to another platform_identity_id"
            )

    credentials = list_platform_credentials(db, identity.platform_identity_id)
    password_cred = next(
        (
            c
            for c in credentials
            if c.credential_kind == CREDENTIAL_KIND_PASSWORD
            and c.provider_key == CREDENTIAL_PROVIDER_LOCAL
        ),
        None,
    )
    if password_cred is None:
        password_cred = create_platform_credential(
            db,
            platform_identity_id=identity.platform_identity_id,
            credential_kind=CREDENTIAL_KIND_PASSWORD,
            provider_key=CREDENTIAL_PROVIDER_LOCAL,
            status=map_user_to_credential_status(user),
            password_hash=user.hashed_password,
        )
        created_credential = True
    elif password_cred.password_hash != user.hashed_password:
        raise PlatformOwnerBackfillError(
            "Existing local password credential hash does not match legacy users.hashed_password; "
            "refusing to overwrite"
        )

    skipped = not (created_identity or created_role_binding or created_credential)

    mapping = PlatformOwnerMappingAudit(
        legacy_user_id=legacy.user_id,
        platform_identity_id=identity.platform_identity_id,
        email=identity.email,
        role_binding_id=owner_binding.id,
        credential_id=password_cred.credential_id,
    )

    if commit:
        db.commit()
        db.refresh(identity)
        db.refresh(owner_binding)
        db.refresh(password_cred)

    return PlatformOwnerBackfillResult(
        created_identity=created_identity,
        created_role_binding=created_role_binding,
        created_credential=created_credential,
        skipped=skipped,
        legacy=legacy,
        identity=identity,
        role_binding=owner_binding,
        credential=password_cred,
        mapping=mapping,
    )


def verify_dual_readiness(db: Session) -> dict:
    """Check that Platform Owner can be resolved from store tables only."""
    owner_binding = _role_binding_repo.get_active_owner_binding(db)
    if owner_binding is None:
        return {
            "ready": False,
            "reason": "no_active_platform_owner_binding",
        }

    identity = _identity_repo.get_by_id(db, owner_binding.platform_identity_id)
    if identity is None:
        return {
            "ready": False,
            "reason": "owner_binding_identity_missing",
        }

    credentials = _credential_repo.list_for_identity(db, identity.platform_identity_id)
    password_cred = next(
        (
            c
            for c in credentials
            if c.credential_kind == CREDENTIAL_KIND_PASSWORD
            and c.provider_key == CREDENTIAL_PROVIDER_LOCAL
            and c.status == CREDENTIAL_STATUS_ACTIVE
        ),
        None,
    )

    if password_cred is None or not password_cred.password_hash:
        return {
            "ready": False,
            "reason": "no_active_local_password_credential",
            "email": identity.email,
            "role": owner_binding.platform_role,
        }

    return {
        "ready": True,
        "email": identity.email,
        "platform_identity_id": str(identity.platform_identity_id),
        "role": owner_binding.platform_role,
        "credential_id": str(password_cred.credential_id),
        "has_password_hash": bool(password_cred.password_hash),
    }
