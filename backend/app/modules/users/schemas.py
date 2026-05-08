from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None

    position: str | None = None
    department: str | None = None
    city: str | None = None
    manager: str | None = None
    mentor: str | None = None

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None


# НОВОЕ — создание пользователя
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None

    position: str | None = None
    department: str | None = None
    city: str | None = None
    manager: str | None = None
    mentor: str | None = None

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None

    is_active: bool = True
    role_id: int | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None

    position: str | None = None
    department: str | None = None
    city: str | None = None
    manager: str | None = None
    mentor: str | None = None

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None


class UserResponse(BaseModel):
    id: int

    email: EmailStr
    full_name: str | None = None
    phone: str | None = None

    position: str | None = None
    department: str | None = None
    city: str | None = None
    manager: str | None = None
    mentor: str | None = None

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None

    is_active: bool

    role_id: int | None = None
    role: str | None = None
    role_description: str | None = None

    last_login_at: datetime | None = None

    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {
        "from_attributes": True
    }