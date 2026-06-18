from typing import Any
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ДОБАВИТЬ ↓↓↓

class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None

    position: str | None = None
    department: str | None = None

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None


class TenantLoginBrandingRead(BaseModel):
    display_name: str
    tenant_id: int | None = None
    public_slug: str | None = None
    tenant_key: str | None = None


class TenantEntryRead(BaseModel):
    tenant_id: int
    public_slug: str
    display_name: str
    tenant_key: str | None = None