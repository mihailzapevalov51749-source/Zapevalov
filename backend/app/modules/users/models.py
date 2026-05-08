from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # ======================
    # Основные данные
    # ======================
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)

    # ======================
    # Рабочие данные
    # ======================
    position = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)

    # НОВОЕ ↓
    city = Column(String(255), nullable=True)
    manager = Column(String(255), nullable=True)
    mentor = Column(String(255), nullable=True)

    # ======================
    # Фото / аватар
    # ======================
    avatar_url = Column(String(500), nullable=True)
    avatar_settings = Column(JSON, nullable=True)

    # ======================
    # Безопасность
    # ======================
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    # ======================
    # Роль
    # ======================
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    role = relationship("Role", back_populates="users")

    # ======================
    # Служебные поля
    # ======================
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )