import pytest
from types import SimpleNamespace

from app.modules.platform.search import permissions
from app.modules.platform.search import service as platform_search_service
from app.modules.platform.runtime.search.schemas import RuntimeSearchRequest, RuntimeSearchResultItem
from app.modules.platform.search.schemas import PlatformSearchRequest


def _user(role_name: str | None):
    role = SimpleNamespace(name=role_name) if role_name else None
    return SimpleNamespace(role=role)


def test_resolve_allowed_domains_for_admin_and_superadmin() -> None:
    assert permissions.resolve_allowed_search_domains(_user("admin")) == ["runtime", "designer"]
    assert permissions.resolve_allowed_search_domains(_user("superadmin")) == [
        "runtime",
        "designer",
    ]


def test_resolve_allowed_domains_for_regular_user() -> None:
    assert permissions.resolve_allowed_search_domains(_user("user")) == ["runtime"]
    assert permissions.resolve_allowed_search_domains(_user(None)) == ["runtime"]


def test_frontend_requested_designer_ignored_for_regular_user() -> None:
    effective = permissions.resolve_effective_search_domains(
        _user("user"),
        requested_domains=["runtime", "designer"],
        current_mode="runtime",
    )
    assert effective == ["runtime"]


def test_admin_gets_runtime_and_designer_domains() -> None:
    effective = permissions.resolve_effective_search_domains(
        _user("admin"),
        requested_domains=["runtime", "designer"],
        current_mode="runtime",
    )
    assert effective == ["runtime", "designer"]


def test_execute_platform_search_merges_runtime_and_designer_for_admin(monkeypatch) -> None:
    runtime_item = RuntimeSearchResultItem(
        id="ent-1",
        type="object_entity",
        title="Проект",
        subtitle="Проекты",
        path="/portal/1/object-types/projects",
        rank=2,
        source="runtime.company",
    )
    designer_item = RuntimeSearchResultItem(
        id="ot-1",
        type="designer.object_type",
        title="Проекты",
        subtitle="Студия · Тип объекта",
        path="/designer/tenant/1/object-types/ot-1/general",
        rank=1,
        source="designer.workspace",
    )

    monkeypatch.setattr(
        "app.modules.platform.search.service.execute_runtime_search",
        lambda *_args, **_kwargs: SimpleNamespace(results=[runtime_item]),
    )
    monkeypatch.setattr(
        "app.modules.platform.search.service.execute_designer_search",
        lambda *_args, **_kwargs: [designer_item],
    )

    response = platform_search_service.execute_platform_search(
        None,
        tenant_id=1,
        user=_user("admin"),
        payload=PlatformSearchRequest(
            query="про",
            scope="runtime.company",
            currentMode="runtime",
            requestedDomains=["runtime", "designer"],
        ),
    )

    assert len(response.results) == 2
    assert response.results[0].type == "designer.object_type"
    assert response.results[1].type == "object_entity"
    assert response.meta["effectiveDomains"] == ["runtime", "designer"]


def test_regular_user_gets_runtime_only(monkeypatch) -> None:
    runtime_item = RuntimeSearchResultItem(
        id="ent-1",
        type="object_entity",
        title="Проект",
        subtitle="Проекты",
        path="/portal/1/object-types/projects",
        rank=1,
        source="runtime.company",
    )
    designer_calls = {"count": 0}

    def _designer_search(*_args, **_kwargs):
        designer_calls["count"] += 1
        return []

    monkeypatch.setattr(
        "app.modules.platform.search.service.execute_runtime_search",
        lambda *_args, **_kwargs: SimpleNamespace(results=[runtime_item]),
    )
    monkeypatch.setattr(
        "app.modules.platform.search.service.execute_designer_search",
        _designer_search,
    )

    response = platform_search_service.execute_platform_search(
        None,
        tenant_id=1,
        user=_user("user"),
        payload=PlatformSearchRequest(
            query="про",
            scope="runtime.company",
            currentMode="runtime",
            requestedDomains=["runtime", "designer"],
        ),
    )

    assert len(response.results) == 1
    assert response.results[0].type == "object_entity"
    assert designer_calls["count"] == 0
    assert response.meta["effectiveDomains"] == ["runtime"]


def test_designer_result_ranking_works() -> None:
    from app.modules.platform.runtime.search.ranking import compute_text_match_rank

    assert compute_text_match_rank("Проекты", "проекты") == 1
    assert compute_text_match_rank("Проекты", "про") == 2
    assert compute_text_match_rank("Справочник проектов", "проект") == 3
