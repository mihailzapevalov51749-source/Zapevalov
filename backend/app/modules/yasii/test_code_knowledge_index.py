import app.modules.yasii.code_knowledge_index  # noqa: F401

from app.modules.yasii.code_knowledge_index import (
    PLACEHOLDER_SNAPSHOT_ID,
    CodeKnowledgeContext,
    CodeKnowledgeIndex,
    CodeKnowledgeRecord,
    CodeKnowledgeSnapshot,
    CodeKnowledgeType,
    get_code_knowledge_snapshot,
    register_code_knowledge,
)


def test_code_knowledge_index_module_imports():
    assert CodeKnowledgeIndex is not None
    assert register_code_knowledge is not None
    assert get_code_knowledge_snapshot is not None


def test_code_knowledge_type_values():
    assert CodeKnowledgeType.MODULE.value == "MODULE"
    assert CodeKnowledgeType.API.value == "API"
    assert CodeKnowledgeType.CONTRACT.value == "CONTRACT"


def test_code_knowledge_record_fields():
    record = CodeKnowledgeRecord(
        knowledgeId="ck-1",
        knowledgeType=CodeKnowledgeType.SERVICE,
        metadata={"path": "modules/yasii"},
    )

    assert record.knowledgeId == "ck-1"
    assert record.knowledgeType == CodeKnowledgeType.SERVICE
    assert record.metadata == {"path": "modules/yasii"}


def test_code_knowledge_snapshot_defaults():
    snapshot = CodeKnowledgeSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.records == []
    assert snapshot.createdAt is None


def test_register_code_knowledge_returns_true():
    assert (
        register_code_knowledge(
            CodeKnowledgeContext(knowledgeId="ctx-1"),
            CodeKnowledgeRecord(
                knowledgeId="ck-1",
                knowledgeType=CodeKnowledgeType.ROUTER,
            ),
        )
        is True
    )


def test_get_code_knowledge_snapshot_returns_empty_placeholder():
    snapshot = get_code_knowledge_snapshot(CodeKnowledgeContext(knowledgeId="ctx-1"))

    assert isinstance(snapshot, CodeKnowledgeSnapshot)
    assert snapshot.snapshotId == "code-knowledge-placeholder"
    assert snapshot.records == []
