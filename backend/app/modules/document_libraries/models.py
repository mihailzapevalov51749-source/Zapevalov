from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class DocumentLibrary(Base):
    __tablename__ = "document_libraries"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    documents = relationship(
        "LibraryDocument",
        back_populates="library",
        cascade="all, delete-orphan",
        foreign_keys="LibraryDocument.library_id",
    )


class LibraryDocument(Base):
    __tablename__ = "library_documents"

    id = Column(Integer, primary_key=True, index=True)

    library_id = Column(
        Integer,
        ForeignKey("document_libraries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    parent_id = Column(
        Integer,
        ForeignKey("library_documents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    title = Column(String(255), nullable=False)

    document_type = Column(String(50), nullable=False)
    file_path = Column(String(500), nullable=True)
    original_filename = Column(String(255), nullable=True)

    is_folder = Column(Boolean, default=False, nullable=False)

    # 🔴 НОВОЕ: автор
    created_by = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    library = relationship(
        "DocumentLibrary",
        back_populates="documents",
        foreign_keys=[library_id],
    )

    parent = relationship(
        "LibraryDocument",
        remote_side=[id],
        backref="children",
    )