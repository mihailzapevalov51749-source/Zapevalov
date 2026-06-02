import pytest

from app.db.session import SessionLocal
from app.modules.platform_dashboard.yasii_catalog import work_item_by_key
from app.modules.platform_dashboard.yasii_sync import compute_resolved_done_keys, load_yasii_item_passed_from_db
from app.modules.platform_dashboard.service import get_governance_model, list_stages
from app.modules.yasii.governance_answers import resolve_governance_command
from app.modules.yasii.project_awareness import load_project_state_from_db
from app.modules.yasii.unified_project_state import SOURCE_CHAIN, build_unified_project_state


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_source_chain_documents_analyzer_to_yasii_path():
    assert SOURCE_CHAIN[0] == "analyzer"
    assert "platform_tasks" in SOURCE_CHAIN
    assert "unified_project_state" in SOURCE_CHAIN
    assert "yasii" in SOURCE_CHAIN


def test_build_unified_project_state_layers(db):
    unified = build_unified_project_state(db)
    assert unified.platform.engines
    assert unified.developmentWorkspace.yasii.containerReadiness >= 0
    assert unified.companyWorkspaces.companyWorkspaces
    assert unified.doneKeys is not None


def test_resolved_done_keys_respects_dependencies(db):
    item_passed = load_yasii_item_passed_from_db(db)
    resolved = compute_resolved_done_keys(item_passed)
    if "P10-W06" in resolved and "P10-W03" not in resolved:
        pytest.fail("P10-W06 cannot be in done_keys without P10-W03")


def test_load_project_state_delegates_to_unified(db):
    state, done_keys, item_passed = load_project_state_from_db(db)
    unified = build_unified_project_state(db)
    assert state.containerReadiness == unified.developmentWorkspace.yasii.containerReadiness
    assert done_keys == set(unified.doneKeys)
    assert item_passed == unified.itemPassed


def test_governance_api_and_stages_embed_model(db):
    governance = get_governance_model(db)
    assert governance.platform.engines
    assert governance.developmentWorkspace.sections
    stages = list_stages(db)
    assert stages.governance is not None
    assert stages.governance.schemaVersion == "1.0.0"


def test_governance_answers_use_unified_state():
    result = resolve_governance_command("Какие подсистемы готовы?", {"tenantId": "t1"})
    assert result is not None
    assert "Platform Layer" in result.message
    assert result.state_loaded


def test_company_workspaces_use_object_model_not_tenant_business_layer(db):
    unified = build_unified_project_state(db)
    assert unified.companyWorkspaces.companyWorkspaces
    workspace = unified.companyWorkspaces.companyWorkspaces[0]
    assert workspace.objectModelFacets
    assert "tenant_id" in workspace.note
    assert "tenant layer" not in unified.companyWorkspaces.companyWorkspacesSummary.casefold()
