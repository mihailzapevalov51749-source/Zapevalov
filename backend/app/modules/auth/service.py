from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import PlatformEventJournalSource
from app.modules.platform_event_journal.service import record_platform_event
from app.modules.users.bootstrap_owner_service import (
    build_platform_setup_state,
    ensure_bootstrap_owner_recovery,
    is_bootstrap_owner,
)
from app.modules.users.models import User
from .security import create_access_token, hash_password, verify_password


def register_user(db: Session, email: str, password: str, full_name: str):
    existing = db.query(User).filter(User.email == email).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def login_user(db: Session, email: str, password: str):
    ensure_bootstrap_owner_recovery(db)

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=400, detail="Неверный email или пароль")

    if bool(getattr(user, "login_disabled", False)):
        raise HTTPException(status_code=403, detail="Вход для этой учётной записи отключён")

    if not user.is_active and not is_bootstrap_owner(user):
        raise HTTPException(status_code=403, detail="Учётная запись неактивна")

    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")

    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.flush()

    if is_bootstrap_owner(user):
        record_platform_event(
            db,
            event_code=PlatformEventCode.BOOTSTRAP_OWNER_USED.value,
            event_category=PlatformEventCategory.BOOTSTRAP.value,
            title="Вход Bootstrap Owner",
            description=f"Bootstrap Owner выполнил вход ({user.email}).",
            status=PlatformAuditStatus.DONE.value,
            source=PlatformEventJournalSource.MANUAL.value,
            actor_user=user,
            target_type="bootstrap_owner",
            target_id=user.id,
            target_name=user.full_name,
            metadata={"email": user.email},
            slug=f"bootstrap-owner-used-{user.id}-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            commit=False,
        )

    token = create_access_token({"sub": str(user.id)})
    setup_state = build_platform_setup_state(db, user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "platform_setup": setup_state,
    }