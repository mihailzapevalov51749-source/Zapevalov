from __future__ import annotations

from types import SimpleNamespace

from app.modules.platform.designer.pages import page_status_normalization as normalization


class _FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return list(self._rows)


class _FakeSession:
    def __init__(self, pages, nav_items):
        self._pages = pages
        self._nav_items = nav_items

    def query(self, model):
        name = getattr(model, "__name__", "")
        if name == "Page":
            return _FakeQuery(self._pages)
        if name == "NavigationItem":
            return _FakeQuery(self._nav_items)
        raise AssertionError(f"Unexpected model: {model}")


def _page(page_id: int, status: str, *, deleted_at=None, title: str = "Page"):
    return SimpleNamespace(id=page_id, status=status, deleted_at=deleted_at, title=title)


def _nav(nav_id: int, *, page_id=None, is_visible=True, title="Nav", url=None):
    return SimpleNamespace(
        id=nav_id,
        page_id=page_id,
        is_visible=is_visible,
        title=title,
        url=url,
        deleted_at=None,
    )


def test_page_without_bindings_becomes_draft(monkeypatch) -> None:
    db = _FakeSession([_page(1, "published")], [])
    monkeypatch.setattr(normalization, "collect_page_placements", lambda *_args, **_kwargs: {})
    changes = normalization.plan_page_status_changes(db)
    assert changes[0].new_status == "draft"


def test_page_with_visible_navigation_becomes_published(monkeypatch) -> None:
    db = _FakeSession([_page(2, "draft")], [_nav(1, page_id=2, is_visible=True)])
    monkeypatch.setattr(
        normalization,
        "collect_page_placements",
        lambda *_args, **_kwargs: {
            2: [normalization.PlacementRecord(kind="navigation", visible=True, detail="visible")]
        },
    )
    changes = normalization.plan_page_status_changes(db)
    assert changes[0].new_status == "published"


def test_page_with_hidden_navigation_becomes_hidden(monkeypatch) -> None:
    db = _FakeSession([_page(3, "published")], [_nav(2, page_id=3, is_visible=False)])
    monkeypatch.setattr(
        normalization,
        "collect_page_placements",
        lambda *_args, **_kwargs: {
            3: [normalization.PlacementRecord(kind="navigation", visible=False, detail="hidden")]
        },
    )
    changes = normalization.plan_page_status_changes(db)
    assert changes[0].new_status == "hidden"


def test_mixed_bindings_with_one_visible_becomes_published(monkeypatch) -> None:
    db = _FakeSession([_page(4, "hidden")], [_nav(3, page_id=4, is_visible=False)])
    monkeypatch.setattr(
        normalization,
        "collect_page_placements",
        lambda *_args, **_kwargs: {
            4: [
                normalization.PlacementRecord(kind="navigation", visible=False, detail="hidden"),
                normalization.PlacementRecord(kind="workspace_tab", visible=True, detail="visible"),
            ]
        },
    )
    changes = normalization.plan_page_status_changes(db)
    assert changes[0].new_status == "published"


def test_workspace_home_visible_is_published() -> None:
    placements = [normalization.PlacementRecord(kind="workspace_home", visible=True, detail="active")]
    status, _reason = normalization.compute_target_status(placements)
    assert status == "published"


def test_resolve_workspace_home_page_target_status_active_is_published() -> None:
    workspace = SimpleNamespace(title="Workspace", status="active")
    assert normalization.resolve_workspace_home_page_target_status(workspace) == "published"


def test_resolve_workspace_home_page_target_status_archived_is_hidden() -> None:
    workspace = SimpleNamespace(title="Workspace", status="archived")
    assert normalization.resolve_workspace_home_page_target_status(workspace) == "hidden"


class _SyncFakeQuery(_FakeQuery):
    def first(self):
        rows = self.all()
        return rows[0] if rows else None


class _SyncFakeSession:
    def __init__(self, page):
        self._page = page
        self.flushed = False

    def query(self, model):
        name = getattr(model, "__name__", "")
        if name == "Page":
            return _SyncFakeQuery([self._page])
        raise AssertionError(f"Unexpected model: {model}")

    def flush(self):
        self.flushed = True


def test_sync_workspace_home_page_status_promotes_draft_to_published() -> None:
    page = _page(1, "draft")
    page.portal_id = 10
    workspace = SimpleNamespace(home_page_id=1, tenant_id=10, title="Workspace", status="active")
    db = _SyncFakeSession(page)

    changed = normalization.sync_workspace_home_page_status(db, workspace)

    assert changed is True
    assert page.status == "published"
    assert db.flushed is True


def test_sync_workspace_home_page_status_skips_when_already_aligned() -> None:
    page = _page(1, "published")
    page.portal_id = 10
    workspace = SimpleNamespace(home_page_id=1, tenant_id=10, title="Workspace", status="active")
    db = _SyncFakeSession(page)

    changed = normalization.sync_workspace_home_page_status(db, workspace)

    assert changed is False
    assert db.flushed is False


def test_workspace_tab_hidden_is_hidden() -> None:
    placements = [normalization.PlacementRecord(kind="workspace_tab", visible=False, detail="hidden")]
    status, _reason = normalization.compute_target_status(placements)
    assert status == "hidden"


def test_soft_deleted_page_is_skipped(monkeypatch) -> None:
    db = _FakeSession([_page(7, "published", deleted_at="2026-06-05T00:00:00Z")], [])
    monkeypatch.setattr(normalization, "collect_page_placements", lambda *_args, **_kwargs: {})
    changes = normalization.plan_page_status_changes(db)
    assert changes == []


def test_repeated_dry_run_is_idempotent(monkeypatch) -> None:
    db = _FakeSession([_page(8, "draft")], [])
    monkeypatch.setattr(normalization, "collect_page_placements", lambda *_args, **_kwargs: {})
    first = normalization.plan_page_status_changes(db)
    second = normalization.plan_page_status_changes(db)
    assert first == second


def test_page_navigation_is_visible_false_moves_to_hidden_and_reset(monkeypatch) -> None:
    db = _FakeSession([_page(9, "published")], [_nav(10, page_id=9, is_visible=False)])
    monkeypatch.setattr(
        normalization,
        "collect_page_placements",
        lambda *_args, **_kwargs: {
            9: [normalization.PlacementRecord(kind="navigation", visible=False, detail="legacy hidden")]
        },
    )
    changes = normalization.plan_page_status_changes(db)
    assert changes[0].new_status == "hidden"
    assert changes[0].nav_item_ids_to_reset_visible == (10,)


def test_non_page_navigation_item_unchanged(monkeypatch) -> None:
    db = _FakeSession([_page(11, "draft")], [_nav(20, page_id=None, is_visible=False, url="/external")])
    monkeypatch.setattr(normalization, "collect_page_placements", lambda *_args, **_kwargs: {})
    changes = normalization.plan_page_status_changes(db)
    assert changes == []
