"""Tests for demo user inventory classification and cleanup discipline."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.modules.user_management.demo_user_inventory import (
    assert_demo_user_inventory,
    build_user_inventory,
    cleanup_test_user_leaks,
    is_test_leak_user,
    matches_test_email,
)
from app.modules.users.models import Role, User


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def test_matches_test_email_patterns() -> None:
    assert matches_test_email("tenant_config_test_admin_ab12cd34@test.local")
    assert matches_test_email("quality_iso_admin_041293ba@test.local")
    assert not matches_test_email("nino@yasnopro.ru")


def test_build_user_inventory_classifies_test_users(db: Session) -> None:
    role = _ensure_role(db, "admin")
    user = User(
        email="pytest_discipline_admin_ab12cd34@test.local",
        full_name="Pytest Discipline admin",
        hashed_password=hash_password("test"),
        is_active=True,
        role_id=role.id,
        tenant_id=None,
    )
    db.add(user)
    db.commit()

    inventory = build_user_inventory(db)
    assert any(row.email == user.email and row.category == "TEST" for row in inventory["rows"])

    deleted = cleanup_test_user_leaks(db)
    assert user.id in deleted
    assert_demo_user_inventory(db)
