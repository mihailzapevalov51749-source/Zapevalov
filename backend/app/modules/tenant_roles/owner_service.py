"""Company ownership helpers for tenant users."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.tenant_users.constants import MEMBERSHIP_STATUS_ACTIVE
from app.modules.tenant_users.membership_service import get_tenant_membership
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User


def _active_membership_query(db: Session, tenant_id: int):
    return (
        db.query(User)
        .join(TenantUserMembership, TenantUserMembership.user_id == User.id)
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.membership_status == MEMBERSHIP_STATUS_ACTIVE)
    )


def get_company_owner(db: Session, tenant_id: int) -> User | None:
    owner = (
        _active_membership_query(db, tenant_id)
        .filter(User.is_company_owner.is_(True))
        .order_by(User.id.asc())
        .first()
    )
    if owner is not None:
        return owner

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
    membership_owner_ids = [
        row[0]
        for row in (
            _active_membership_query(db, tenant_id)
            .filter(User.is_company_owner.is_(True))
            .with_entities(User.id)
            .all()
        )
    ]
    legacy_owner_ids = [
        row[0]
        for row in db.query(User.id)
        .filter(User.tenant_id == tenant_id)
        .filter(User.is_company_owner.is_(True))
        .all()
    ]
    candidate_ids = {owner_user_id}
    for user_id in membership_owner_ids + legacy_owner_ids:
        if user_id != owner_user_id:
            candidate_ids.add(user_id)

    if len(candidate_ids) <= 1:
        return

    (
        db.query(User)
        .filter(User.id.in_(sorted(candidate_ids - {owner_user_id})))
        .filter(User.is_company_owner.is_(True))
        .update({User.is_company_owner: False}, synchronize_session=False)
    )


def _assert_user_belongs_to_tenant(db: Session, *, tenant_id: int, user: User) -> None:
    membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user.id)
    if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_ACTIVE:
        return
    if user.tenant_id == tenant_id:
        return
    raise HTTPException(
        status_code=400,
        detail="Пользователь не принадлежит выбранной компании",
    )


def assign_company_owner(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    commit: bool = False,
) -> User:
    _assert_user_belongs_to_tenant(db, tenant_id=tenant_id, user=user)

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
        _active_membership_query(db, tenant_id)
        .filter(User.id == new_owner_user_id)
        .one_or_none()
    )
    if new_owner is None:
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
