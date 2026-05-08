from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
)
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
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    role = relationship("Role", back_populates="users")

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    result = Column(Text, nullable=True)

    status = Column(String(50), nullable=False, default="new")
    priority = Column(String(50), nullable=False, default="medium")

    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assignee = relationship(
        "User",
        foreign_keys=[assignee_id],
    )

    created_by = relationship(
        "User",
        foreign_keys=[created_by_id],
    )


class NavigationItem(Base):
    __tablename__ = "navigation_items"

    id = Column(Integer, primary_key=True, index=True)

    portal_id = Column(Integer, ForeignKey("portals.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("navigation_items.id"), nullable=True)

    type = Column(String(50), nullable=False)

    title = Column(String(255), nullable=False)
    url = Column(String(1000), nullable=True)

    page_id = Column(Integer, ForeignKey("pages.id"), nullable=True)

    sort_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)

    icon = Column(String(255), nullable=True)
    color = Column(String(50), nullable=True)
    is_bold = Column(Boolean, default=False)
    is_italic = Column(Boolean, default=False)

    portal = relationship("Portal", back_populates="navigation_items")
    page = relationship("Page", back_populates="navigation_item", foreign_keys=[page_id])

    parent = relationship("NavigationItem", remote_side=[id], backref="children")


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)

    portal_id = Column(Integer, ForeignKey("portals.id"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    status = Column(String(50), default="draft")

    is_home = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)

    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    portal = relationship("Portal", back_populates="pages")
    sections = relationship("Section", back_populates="page", cascade="all, delete-orphan")

    navigation_item = relationship("NavigationItem", back_populates="page", uselist=False)


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)

    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    layout = Column(String(50), default="one_column")

    sort_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)

    settings = Column(JSON, default={})

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    page = relationship("Page", back_populates="sections")
    blocks = relationship("Block", back_populates="section", cascade="all, delete-orphan")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)

    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)

    type = Column(String(100), nullable=False)

    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    sort_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)

    status = Column(String(50), default="draft")

    settings = Column(JSON, default={})
    content = Column(JSON, default={})

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    section = relationship("Section", back_populates="blocks")