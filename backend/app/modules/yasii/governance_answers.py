"""Platform Governance answers (P13-W02) — YASII reads Unified Project State only."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum

from app.db.session import SessionLocal
from app.modules.platform_dashboard.company_workspaces import COMPANY_WORKSPACES_ARCHITECTURE_RULE
from app.modules.yasii.unified_project_state import build_unified_project_state

ASSESSMENT_HEADER = "Platform Governance Assessment"


class GovernanceQueryLayer(str, Enum):
    PLATFORM = "platform"
    DEVELOPMENT = "development"
    COMPANIES = "companies"


@dataclass(frozen=True)
class GovernanceAnswerResult:
    message: str
    layer: str = ""
    state_loaded: bool = False


_PLATFORM_KEYWORDS = (
    "состояние платформы",
    "в каком состоянии платформа",
    "какие подсистемы готовы",
    "какие подсистемы проблемные",
    "проблемные подсистемы",
    "готовность платформенного",
    "platform layer",
    "чем компания отличается от платформы",
    "чем отличается компания от платформы",
)

_DEVELOPMENT_KEYWORDS = (
    "development workspace",
    "контур разработки",
    "где мы относительно архитектуры",
    "целевой архитектур",
)

_COMPANY_KEYWORDS = (
    "что такое компании",
    "что такое компания",
    "какие компании используют",
    "company workspaces",
    "company workspace",
    "компании на платформе",
    "состояние компании",
    "конкретная компания",
    "рабочие пространства компаний",
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _is_company_vs_platform_query(normalized: str) -> bool:
    return "отличается" in normalized and "компан" in normalized and "платформ" in normalized


def _is_what_are_companies_query(normalized: str) -> bool:
    return ("что такое" in normalized or "что такое" in normalized) and "компан" in normalized


def classify_governance_query(query_text: str) -> GovernanceQueryLayer | None:
    normalized = _normalize(query_text)
    if not normalized:
        return None
    if _is_company_vs_platform_query(normalized):
        return GovernanceQueryLayer.COMPANIES
    if _is_what_are_companies_query(normalized):
        return GovernanceQueryLayer.COMPANIES
    if any(k in normalized for k in _COMPANY_KEYWORDS):
        return GovernanceQueryLayer.COMPANIES
    if any(k in normalized for k in _PLATFORM_KEYWORDS):
        return GovernanceQueryLayer.PLATFORM
    if any(k in normalized for k in _DEVELOPMENT_KEYWORDS):
        return GovernanceQueryLayer.DEVELOPMENT
    return None


def is_governance_query(query_text: str) -> bool:
    return classify_governance_query(query_text) is not None


def _format_platform_message(unified, query_text: str) -> str:
    platform = unified.platform
    lines = [
        ASSESSMENT_HEADER,
        "",
        f"Запрос:\n{query_text.strip()}",
        "",
        "Platform Layer",
        f"- Общая готовность контуров: {platform.overallReadiness if platform.overallReadiness is not None else '—'}%",
        "",
        "Подсистемы:",
    ]
    for engine in platform.engines:
        readiness = f"{engine.readiness}%" if engine.readiness is not None else "—"
        flag = "проблемная" if (engine.openIssueCount or engine.debtItemCount) else "стабильная"
        if engine.readiness is not None and engine.readiness < 50:
            flag = "проблемная"
        lines.append(
            f"- {engine.title}: {readiness}, статус {engine.status}, "
            f"quality issues {engine.openIssueCount}, долг {engine.debtItemCount} ({flag})"
        )
    if platform.missingFromDashboard:
        lines.append("")
        lines.append("Не отражены в Dashboard:")
        for slug in platform.missingFromDashboard:
            lines.append(f"- {slug}")
    lines.append("")
    lines.append("Источник: unified_project_state → platform_components + quality_issues")
    return "\n".join(lines)


def _format_development_message(unified, query_text: str) -> str:
    dev = unified.developmentWorkspace
    yasii = dev.yasii
    lines = [
        ASSESSMENT_HEADER,
        "",
        f"Запрос:\n{query_text.strip()}",
        "",
        "Development Workspace Layer",
        f"- Этап: {dev.currentStageTitle} ({dev.currentStageSlug})",
        f"- Фокус: {dev.currentFocus or '—'}",
        f"- Реализовано: Container {yasii.containerImplementationReadiness}% · "
        f"YASII track {yasii.yasiiTrackImplementationReadiness}%",
        f"- Готово к выпуску: Container {yasii.containerReleaseReadiness}% · "
        f"YASII track {yasii.yasiiTrackReleaseReadiness}%",
    ]
    if unified.governanceReleaseBlockerLabel:
        lines.append(f"- Блокер выпуска: {unified.governanceReleaseBlockerLabel}")
    lines.extend(
        [
            f"- Качество (open/critical): {dev.qualityOpenCount}/{dev.qualityCriticalCount}",
            "",
            "Активные WI:",
        ]
    )
    if dev.activeWorkItems:
        lines.extend(f"- {row}" for row in dev.activeWorkItems[:6])
    else:
        lines.append("- нет явного current WI")
    if dev.blockedWorkItems:
        lines.append("")
        lines.append("Блокеры:")
        lines.extend(f"- {row}" for row in dev.blockedWorkItems[:6])
    lines.append("")
    lines.append("Источник: unified_project_state → platform_tasks + yasii_catalog")
    return "\n".join(lines)


def _format_company_vs_platform_faq() -> str:
    return "\n".join(
        [
            ASSESSMENT_HEADER,
            "",
            "Платформа — это общий движок ЯсноПро.",
            "Компания — это конкретная цифровая модель, настроенная на этом движке.",
            "",
            COMPANY_WORKSPACES_ARCHITECTURE_RULE,
        ]
    )


def _format_what_are_companies_faq() -> str:
    return "\n".join(
        [
            ASSESSMENT_HEADER,
            "",
            "Компании — это рабочие пространства клиентов внутри ЯсноПро.",
            "Каждая компания использует общие платформенные движки, но имеет собственные данные, "
            "пользователей, права, лицензии и объектную модель.",
            "",
            COMPANY_WORKSPACES_ARCHITECTURE_RULE,
        ]
    )


def _format_company_workspaces_message(unified, query_text: str) -> str:
    normalized = _normalize(query_text)
    if _is_company_vs_platform_query(normalized):
        return _format_company_vs_platform_faq()
    if _is_what_are_companies_query(normalized):
        return _format_what_are_companies_faq()

    companies = unified.companyWorkspaces
    lines = [
        ASSESSMENT_HEADER,
        "",
        f"Запрос:\n{query_text.strip()}",
        "",
        "Компании",
        f"- {companies.companyWorkspacesSummary}",
        f"- {companies.architectureRule}",
        "",
        "Активные компании:",
    ]
    for workspace in companies.companyWorkspaces:
        readiness = (
            f"{workspace.digitalModelReadiness}%"
            if workspace.digitalModelReadiness is not None
            else "настраивается через Object Model"
        )
        lines.append(f"- {workspace.title} (tenant_id={workspace.tenantId}): {workspace.status}")
        lines.append(f"  Готовность цифровой модели: {readiness}")
        lines.append(f"  Пользователи: {workspace.users}")
        lines.append(f"  Лицензии: {workspace.licenses}")
        lines.append(f"  Права: {workspace.permissions}")
        lines.append(f"  Объекты: {workspace.objects}")
        lines.append(f"  Процессы: {workspace.processes}")
        lines.append(f"  Представления: {workspace.views}")
        if workspace.note:
            lines.append(f"  {workspace.note}")
    lines.append("")
    lines.append("Источник: unified_project_state → companyWorkspaces (tenant_id — technical boundary)")
    return "\n".join(lines)


def resolve_governance_command(query_text: str, payload: dict) -> GovernanceAnswerResult | None:
    del payload
    layer = classify_governance_query(query_text)
    if layer is None:
        return None

    db = SessionLocal()
    try:
        unified = build_unified_project_state(db)
    finally:
        db.close()

    if layer == GovernanceQueryLayer.PLATFORM:
        message = _format_platform_message(unified, query_text)
    elif layer == GovernanceQueryLayer.COMPANIES:
        message = _format_company_workspaces_message(unified, query_text)
    else:
        message = _format_development_message(unified, query_text)

    return GovernanceAnswerResult(
        message=message,
        layer=layer.value,
        state_loaded=True,
    )
