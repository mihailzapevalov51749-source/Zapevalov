"""YASII Code Knowledge Index skeleton (P3-W07). DTO + stub only — no AST or repo scanning."""

from enum import Enum

from pydantic import BaseModel, Field

CODE_KNOWLEDGE_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "code-knowledge-placeholder"


class CodeKnowledgeContext(BaseModel):
    """Technical input placeholder for code knowledge index operations."""

    schemaVersion: str = Field(default=CODE_KNOWLEDGE_SCHEMA_VERSION)
    knowledgeId: str | None = None


class CodeKnowledgeType(str, Enum):
    MODULE = "MODULE"
    SERVICE = "SERVICE"
    COMPONENT = "COMPONENT"
    API = "API"
    ENTITY = "ENTITY"
    ROUTER = "ROUTER"
    MODEL = "MODEL"
    CONTRACT = "CONTRACT"


class CodeKnowledgeRecord(BaseModel):
    """Formal record for future platform code knowledge linkage."""

    knowledgeId: str
    knowledgeType: CodeKnowledgeType
    metadata: dict[str, str] = Field(default_factory=dict)


class CodeKnowledgeSnapshot(BaseModel):
    """Grouped view of registered code knowledge records."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    records: list[CodeKnowledgeRecord] = Field(default_factory=list)
    createdAt: str | None = None


class CodeKnowledgeIndex:
    """Placeholder service container for future code knowledge index wiring."""

    schemaVersion: str = CODE_KNOWLEDGE_SCHEMA_VERSION


def register_code_knowledge(
    context: CodeKnowledgeContext | None = None,
    record: CodeKnowledgeRecord | None = None,
) -> bool:
    """Stub: accepts record registration without parsing or persisting."""
    _ = context
    _ = record
    return True


def get_code_knowledge_snapshot(
    context: CodeKnowledgeContext | None = None,
) -> CodeKnowledgeSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return CodeKnowledgeSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        records=[],
    )
