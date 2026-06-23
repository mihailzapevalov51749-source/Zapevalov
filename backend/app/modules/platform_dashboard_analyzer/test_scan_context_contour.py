"""Scan context contour gating tests (WI-RT-014A)."""

from __future__ import annotations

import pytest

from app.modules.platform_dashboard_analyzer.refresh import build_scan_context


def test_build_scan_context_disabled_for_template(monkeypatch):
    monkeypatch.setenv("YASNOPRO_ENV", "TEMPLATE")
    ctx = build_scan_context()
    assert ctx.filesystem_scan_enabled is False
    assert ctx.dev_monorepo_root is None


def test_build_scan_context_enabled_for_dev(monkeypatch):
    monkeypatch.setenv("YASNOPRO_ENV", "DEV")
    ctx = build_scan_context()
    # On dev workstation with monorepo layout this becomes True.
    assert isinstance(ctx.filesystem_scan_enabled, bool)
