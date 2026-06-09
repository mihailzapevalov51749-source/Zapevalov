from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.auth.security import hash_password, verify_password
from app.modules.users.router import change_my_password
from app.modules.users.schemas import ChangePasswordRequest


def _make_user(password: str):
    return SimpleNamespace(
        id=1,
        hashed_password=hash_password(password),
    )


def test_change_my_password_success():
    user = _make_user("TempPass1")
    db = MagicMock()

    result = change_my_password(
        ChangePasswordRequest(
            current_password="TempPass1",
            new_password="NewPass123",
            confirm_password="NewPass123",
        ),
        db=db,
        current_user=user,
    )

    assert result == {"status": "ok", "message": "Пароль успешно изменён"}
    assert verify_password("NewPass123", user.hashed_password)
    db.add.assert_called_once_with(user)
    db.commit.assert_called_once()


@pytest.mark.parametrize(
    ("payload", "expected_detail"),
    [
        (
            ChangePasswordRequest(
                current_password="",
                new_password="NewPass123",
                confirm_password="NewPass123",
            ),
            "Заполните все поля пароля",
        ),
        (
            ChangePasswordRequest(
                current_password="TempPass1",
                new_password="NewPass123",
                confirm_password="OtherPass",
            ),
            "Новый пароль и повтор пароля не совпадают",
        ),
        (
            ChangePasswordRequest(
                current_password="TempPass1",
                new_password="short",
                confirm_password="short",
            ),
            "Пароль должен содержать не менее 8 символов",
        ),
        (
            ChangePasswordRequest(
                current_password="TempPass1",
                new_password="TempPass1",
                confirm_password="TempPass1",
            ),
            "Новый пароль должен отличаться от текущего",
        ),
        (
            ChangePasswordRequest(
                current_password="WrongPass1",
                new_password="NewPass123",
                confirm_password="NewPass123",
            ),
            "Текущий пароль указан неверно",
        ),
    ],
)
def test_change_my_password_validation_errors(payload, expected_detail):
    user = _make_user("TempPass1")
    db = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        change_my_password(payload, db=db, current_user=user)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == expected_detail
    db.commit.assert_not_called()
