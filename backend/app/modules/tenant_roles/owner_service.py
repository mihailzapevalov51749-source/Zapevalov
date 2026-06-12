"""Company ownership helpers for tenant users."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.users.models import User


def get_company_owner(db: Session, tenant_id: int) -> User | None:
    return (
        db.query(User)
        .filter(User.tenant_id == tenant_id)
        .filter(User.is_company_owner.is_(True))
        .order_by(User.id.asc())
        .first()
    )


def ensure_single_company_owner(
    db: Session,
    *,
    tenant_id: int,
    owner_user_id: int,
) -> None:
    (
        db.query(User)
        .filter(User.tenant_id == tenant_id)
        .filter(User.id != owner_user_id)
        .filter(User.is_company_owner.is_(True))
        .update({User.is_company_owner: False}, synchronize_session=False)
    )


def assign_company_owner(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    commit: bool = False,
) -> User:
    if user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=400,
            detail="Пользователь не принадлежит выбранной компании",
        )

    ensure_single_company_owner(db, tenant_id=tenant_id, owner_user_id=user.id)
    user.is_company_owner = True
    db.add(user)

    if commit:
        db.commit()
        db.refresh(user)

    return user


def transfer_company_ownership(
    db: Session,
    *,
    tenant_id: int,
    new_owner_user_id: int,
    commit: bool = False,
) -> User:
    new_owner = (
        db.query(User)
        .filter(User.id == new_owner_user_id)
        .filter(User.tenant_id == tenant_id)
        .one_or_none()
    )
    if new_owner is None:
        raise HTTPException(status_code=404, detail="Новый владелец компании не найден")

    return assign_company_owner(
        db,
        tenant_id=tenant_id,
        user=new_owner,
        commit=commit,
    )
