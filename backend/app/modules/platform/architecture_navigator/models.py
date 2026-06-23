"""ORM models for Architecture Navigator."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class ArchitectureComponent(Base):
    """Canonical architecture element (human-first title, stable technical key)."""

    __tablename__ = "architecture_components"
    __table_args__ = (
        UniqueConstraint("component_key", name="uq_architecture_components_component_key"),
    )

    id = Column(Integer, primary_key=True, index=True)
    component_key = Column(String(128), nullable=False, index=True)
    technical_name = Column(String(255), nullable=False)
    component_type = Column(String(64), nullable=False, index=True)
    category_key = Column(String(64), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    purpose = Column(Text, nullable=True)
    parent_key = Column(String(128), nullable=True, index=True)
    registry_key = Column(String(64), nullable=False, default="overview", index=True)
    element_status = Column(String(32), nullable=False, default="active", index=True)
    architecture_zone = Column(String(64), nullable=True)
    implementation_json = Column(JSONB, nullable=False, default=dict)
    documents_json = Column(JSONB, nullable=False, default=dict)
    metadata_json = Column(JSONB, nullable=False, default=dict)
    sort_order = Column(Integer, nullable=False, default=0)
    catalog_sources = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    outgoing_links = relationship(
        "ArchitectureLink",
        foreign_keys="ArchitectureLink.from_component_key",
        primaryjoin="ArchitectureComponent.component_key==ArchitectureLink.from_component_key",
        viewonly=True,
    )
    incoming_links = relationship(
        "ArchitectureLink",
        foreign_keys="ArchitectureLink.to_component_key",
        primaryjoin="ArchitectureComponent.component_key==ArchitectureLink.to_component_key",
        viewonly=True,
    )


class ArchitectureLink(Base):
    """Directed relation between architecture components."""

    __tablename__ = "architecture_links"
    __table_args__ = (
        UniqueConstraint(
            "from_component_key",
            "to_component_key",
            "link_type",
            name="uq_architecture_links_from_to_type",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    from_component_key = Column(String(128), nullable=False, index=True)
    to_component_key = Column(String(128), nullable=False, index=True)
    link_type = Column(String(32), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ArchitectureScan(Base):
    """One execution of Architecture Scanner."""

    __tablename__ = "architecture_scans"

    id = Column(Integer, primary_key=True, index=True)
    scanner_version = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False, default="completed", index=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    finished_at = Column(DateTime, nullable=True)
    summary_json = Column(JSONB, nullable=False, default=dict)
    triggered_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    findings = relationship("ArchitectureFinding", back_populates="scan", cascade="all, delete-orphan")


class ArchitectureFinding(Base):
    """Automatic scan result attached to a component or global scope."""

    __tablename__ = "architecture_findings"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("architecture_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    component_key = Column(String(128), nullable=True, index=True)
    finding_kind = Column(String(32), nullable=False, index=True)
    source_kind = Column(String(64), nullable=False, index=True)
    label = Column(String(512), nullable=False)
    value = Column(String(512), nullable=True)
    details_json = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    scan = relationship("ArchitectureScan", back_populates="findings")
