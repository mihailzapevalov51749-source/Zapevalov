"""Company Workspaces — tenant is infrastructure, company model via Object Engine."""

from app.db.session import SessionLocal
from app.modules.platform_dashboard.company_workspaces import COMPANY_WORKSPACES_ARCHITECTURE_RULE
from app.modules.yasii.governance_answers import resolve_governance_command
from app.modules.yasii.unified_project_state import build_unified_project_state


def test_architecture_rule_constant():
    assert "infrastructure boundary" in COMPANY_WORKSPACES_ARCHITECTURE_RULE.casefold()
    assert "object model" in COMPANY_WORKSPACES_ARCHITECTURE_RULE.casefold()


def test_unified_state_uses_company_workspaces_not_tenant_layer():
    db = SessionLocal()
    try:
        unified = build_unified_project_state(db)
    finally:
        db.close()
    assert hasattr(unified, "companyWorkspaces")
    assert unified.companyWorkspaces.companyWorkspacesSummary
    assert "объектную модель" in unified.companyWorkspaces.companyWorkspacesSummary.casefold()
    assert unified.companyWorkspaces.companyWorkspaces
    workspace = unified.companyWorkspaces.companyWorkspaces[0]
    assert workspace.tenantId
    assert workspace.objectModelFacets
    assert "Object Engine" in workspace.objects or "Object" in workspace.objects


def test_governance_answers_companies_faq():
    what = resolve_governance_command("Что такое компании?", {})
    assert what is not None
    assert "рабочие пространства" in what.message.casefold()
    assert "Tenant Layer" not in what.message

    diff = resolve_governance_command("Чем компания отличается от платформы?", {})
    assert diff is not None
    assert "общий движок" in diff.message.casefold()
    assert "цифровая модель" in diff.message.casefold()
