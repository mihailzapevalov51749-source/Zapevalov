"""Project Knowledge Corpus — runtime answers (P11-W01)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from app.modules.platform_dashboard.yasii_catalog import (
    YASII_IMPLEMENTATION_STAGE_SLUG,
    YASII_WORK_ITEMS,
    work_items_by_stage,
)
from app.modules.platform_dashboard.yasii_sync import YASII_TASK_KIND, parse_yasii_task_meta
from app.modules.yasii.project_corpus import (
    KnowledgeDocument,
    KnowledgeDocumentType,
    extract_bullets,
    find_document_by_path,
)
from app.modules.yasii.knowledge_index import (
    build_project_corpus,
    find_sections,
    search_project_corpus,
)

ASSESSMENT_HEADER = "Knowledge Assessment"
MAX_ANSWER_LINES = 24

_MD_FILE_PATTERN = re.compile(
    r"([A-Za-z0-9_\-./]+\.md)",
    re.IGNORECASE,
)


class KnowledgeQueryKind(str, Enum):
    PROJECT_STATUS = "project_status"
    DOCUMENT_CONTENT = "document_content"
    DASHBOARD_WI = "dashboard_wi"
    ROADMAP = "roadmap"
    ARCHITECTURE_DEBT = "architecture_debt"
    DOCUMENT_LIST = "document_list"
    SUBSYSTEMS = "subsystems"
    SEARCH = "search"


@dataclass(frozen=True)
class KnowledgeCorpusResult:
    message: str
    corpus_loaded: bool = False
    document_found: bool = False
    section_found: bool = False
    answer_generated: bool = False
    query_kind: str = ""


_PROJECT_KEYWORDS = (
    "что реализовано в проекте",
    "что реализовано",
    "что уже реализовано",
    "что сделано в проекте",
    "готовые подсистемы",
    "какие подсистемы",
    "состояние проекта",
)

_NOT_IMPLEMENTED_KEYWORDS = (
    "что ещё не реализовано",
    "что еще не реализовано",
    "что не реализовано",
    "что осталось реализовать",
)

_DEBT_KEYWORDS = (
    "архитектурные долги",
    "архитектурный долг",
    "architecture debt",
    "технический долг проекта",
)

_DOCUMENT_KEYWORDS = (
    "что находится в",
    "что написано в",
    "содержимое документа",
    "о чём этот adr",
    "о чем этот adr",
    "что в adr",
    "прочитай документ",
)

_ROADMAP_KEYWORDS = (
    "roadmap",
    "роадмап",
    "дорожн",
    "этапы ещё не завершены",
    "этапы еще не завершены",
    "что в roadmap",
)

_WI_KEYWORDS = (
    "какие wi",
    "какие wi открыты",
    "wi открыты",
    "work item",
    "задачи yasii",
    "что сейчас в работе",
    "какие этапы завершены",
    "зависимости wi",
    "dashboard metadata",
)

_DOC_LIST_KEYWORDS = (
    "какие документы",
    "список документов",
    "какие архитектурные документы",
)

_MODULE_KEYWORDS = (
    "как устроен модуль",
    "как устроен конкретный модуль",
    "модуль ",
)

_CORPUS_KEYWORDS = (
    *_PROJECT_KEYWORDS,
    *_NOT_IMPLEMENTED_KEYWORDS,
    *_DEBT_KEYWORDS,
    *_DOCUMENT_KEYWORDS,
    *_ROADMAP_KEYWORDS,
    *_WI_KEYWORDS,
    *_DOC_LIST_KEYWORDS,
    *_MODULE_KEYWORDS,
    "architecture status",
    "implementation roadmap",
    "yasii_catalog",
    "platform_tasks",
    "project knowledge",
    "knowledge corpus",
    "корпус знаний",
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _extract_md_filename(query: str) -> str | None:
    match = _MD_FILE_PATTERN.search(query)
    if match:
        return Path(match.group(1)).name
    return None


def classify_knowledge_query(query_text: str) -> KnowledgeQueryKind | None:
    normalized = _normalize(query_text)
    if not normalized:
        return None

    if _extract_md_filename(query_text) or any(k in normalized for k in _DOCUMENT_KEYWORDS):
        return KnowledgeQueryKind.DOCUMENT_CONTENT
    if any(k in normalized for k in _WI_KEYWORDS):
        return KnowledgeQueryKind.DASHBOARD_WI
    if any(k in normalized for k in _DEBT_KEYWORDS):
        return KnowledgeQueryKind.ARCHITECTURE_DEBT
    if any(k in normalized for k in _ROADMAP_KEYWORDS):
        return KnowledgeQueryKind.ROADMAP
    if any(k in normalized for k in _NOT_IMPLEMENTED_KEYWORDS):
        return KnowledgeQueryKind.PROJECT_STATUS
    if any(k in normalized for k in _PROJECT_KEYWORDS):
        return KnowledgeQueryKind.PROJECT_STATUS
    if any(k in normalized for k in _DOC_LIST_KEYWORDS):
        return KnowledgeQueryKind.DOCUMENT_LIST
    if any(k in normalized for k in _MODULE_KEYWORDS):
        return KnowledgeQueryKind.SUBSYSTEMS

    if any(k in normalized for k in _CORPUS_KEYWORDS):
        return KnowledgeQueryKind.SEARCH

    corpus_terms = (
        "документ",
        "архитектур",
        "реализован",
        "не реализован",
        "статус",
        "каталог",
        "миграц",
        "подсистем",
    )
    if any(term in normalized for term in corpus_terms):
        return KnowledgeQueryKind.SEARCH
    return None


def _defers_to_architect_profile(query_text: str) -> bool:
    from app.modules.yasii.architect_profile import is_architect_query

    return is_architect_query(query_text)


def _defers_to_project_awareness(query_text: str) -> bool:
    from app.modules.yasii.project_awareness import is_project_awareness_query

    return is_project_awareness_query(query_text)


def _defers_to_business_explanation(query_text: str) -> bool:
    from app.modules.yasii.business_explanation import is_business_explanation_query

    return is_business_explanation_query(query_text)


def _defers_to_development_intelligence(query_text: str) -> bool:
    from app.modules.yasii.development_intelligence import is_development_intelligence_query

    return is_development_intelligence_query(query_text)


def is_knowledge_corpus_query(query_text: str) -> bool:
    if _defers_to_architect_profile(query_text):
        return False
    if _defers_to_development_intelligence(query_text):
        return False
    if _defers_to_business_explanation(query_text):
        return False
    if _defers_to_project_awareness(query_text):
        return False
    return classify_knowledge_query(query_text) is not None


def is_knowledge_corpus_command(query_text: str) -> bool:
    return is_knowledge_corpus_query(query_text)


def _load_dashboard_wi_status() -> dict[str, dict[str, str]]:
    try:
        from app.db.session import SessionLocal
        from app.modules.platform_dashboard.models import PlatformImplementationStage, PlatformTask

        db = SessionLocal()
        try:
            stage = (
                db.query(PlatformImplementationStage)
                .filter_by(slug=YASII_IMPLEMENTATION_STAGE_SLUG)
                .one_or_none()
            )
            if stage is None:
                return {}
            rows: dict[str, dict[str, str]] = {}
            for task in db.query(PlatformTask).filter_by(stage_id=stage.id).all():
                meta = parse_yasii_task_meta(task.description)
                if meta.get("kind") != YASII_TASK_KIND:
                    continue
                key = str(meta.get("key") or "").strip()
                if not key:
                    continue
                rows[key] = {
                    "status": str(task.status or "").strip(),
                    "title": str(task.title or "").strip(),
                    "analyzer_passed": str(meta.get("analyzer_passed", "")),
                }
            return rows
        finally:
            db.close()
    except Exception:
        return {}


def _done_work_item_keys(statuses: dict[str, dict[str, str]] | None = None) -> set[str]:
    rows = statuses if statuses is not None else _load_dashboard_wi_status()
    if not rows:
        return set()
    return {key for key, row in rows.items() if row.get("status") == "done"}


def _open_work_items(statuses: dict[str, dict[str, str]] | None = None) -> list:
    rows = statuses if statuses is not None else _load_dashboard_wi_status()
    if not rows:
        return list(YASII_WORK_ITEMS)
    return [item for item in YASII_WORK_ITEMS if rows.get(item.key, {}).get("status") != "done"]


def _format_sources(paths: list[str]) -> str:
    unique = []
    seen: set[str] = set()
    for path in paths:
        if path and path not in seen:
            seen.add(path)
            unique.append(path)
    return "\n".join(f"- {path}" for path in unique) if unique else "- project_corpus"


def _notable_lines(content: str, *, limit: int = 6) -> list[str]:
    picked: list[str] = []
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("|"):
            continue
        if any(
            token in stripped.casefold()
            for token in ("level", "hybrid", "не реализ", "долг", "open", "implemented", "verified")
        ):
            picked.append(stripped.lstrip("#").strip())
        if len(picked) >= limit:
            break
    return picked


def _document_summary(doc: KnowledgeDocument, *, max_sections: int = 3) -> list[str]:
    lines = [f"Документ: {doc.title} ({Path(doc.documentPath).name})"]
    for section in doc.sections[:max_sections]:
        title = section.sectionTitle or "Основное"
        bullets = extract_bullets(section.content, limit=6)
        if bullets:
            lines.append(f"{title}:")
            lines.extend(f"  - {bullet}" for bullet in bullets[:5])
        else:
            notable = _notable_lines(section.content, limit=4)
            if notable:
                lines.append(f"{title}:")
                lines.extend(f"  - {line}" for line in notable)
            else:
                preview = section.content.splitlines()[0][:200] if section.content else ""
                if preview:
                    lines.append(f"{title}: {preview}")
    return lines


def _answer_project_status() -> tuple[list[str], list[str]]:
    statuses = _load_dashboard_wi_status()
    done = _done_work_item_keys(statuses)
    total = len(YASII_WORK_ITEMS)
    if statuses:
        lines = [
            f"По platform_tasks закрыто WI: {len(done)} из {total}.",
            "Реализованные контуры (по Architecture Status):",
        ]
    else:
        lines = [
            f"Dashboard metadata недоступна — показан catalog ({total} WI).",
            "Реализованные контуры (по Architecture Status):",
        ]
    hits = search_project_corpus("IMPLEMENTED ACTIVE VERIFIED Runtime Entity Object Type", limit=3)
    for hit in hits:
        for bullet in extract_bullets(hit.section.content, limit=4):
            if any(token in bullet.upper() for token in ("IMPLEMENTED", "ACTIVE", "VERIFIED", "DONE")):
                lines.append(f"- {bullet}")
    sources = [hit.document.documentPath for hit in hits]
    sources.append("backend/app/modules/platform_dashboard/yasii_catalog.py")
    return lines[:MAX_ANSWER_LINES], sources


def _answer_not_implemented() -> tuple[list[str], list[str]]:
    statuses = _load_dashboard_wi_status()
    lines = ["Ещё не реализовано или в статусе OPEN (по документам и catalog):"]
    hits = search_project_corpus("не реализованы NOT IMPLEMENTED OPEN BLOCKED", limit=4)
    for hit in hits:
        bullets = extract_bullets(hit.section.content, limit=5)
        for bullet in bullets:
            if any(
                token in bullet.casefold()
                for token in ("не реализ", "not ", "open", "blocked", "нестабил", "partial")
            ):
                lines.append(f"- {bullet}")
    open_wi = _open_work_items(statuses)
    if open_wi:
        label = "platform_tasks" if statuses else "catalog"
        lines.append(f"Открытые WI по {label}: {len(open_wi)} (примеры: {', '.join(i.key for i in open_wi[:6])}).")
    sources = [hit.document.documentPath for hit in hits]
    sources.append("docs/architecture/YASII_IMPLEMENTATION_ROADMAP.md")
    return lines[:MAX_ANSWER_LINES], sources


def _answer_architecture_debt() -> tuple[list[str], list[str]]:
    lines = ["Архитектурные долги и открытые проблемы:"]
    corpus = build_project_corpus()
    debt_doc = find_document_by_path(corpus, "YASNOPRO_ARCHITECTURE_DEBT.md")
    status_doc = find_document_by_path(corpus, "YASNOPRO_ARCHITECTURE_STATUS.md")
    sources: list[str] = []

    for doc in (debt_doc, status_doc):
        if doc is None:
            continue
        sources.append(doc.documentPath)
        for section in doc.sections[:4]:
            bullets = extract_bullets(section.content, limit=6)
            for bullet in bullets:
                if any(
                    token in bullet.casefold()
                    for token in ("долг", "debt", "не реализ", "legacy", "риск", "open", "hybrid")
                ):
                    lines.append(f"- {bullet}")

    if len(lines) == 1:
        hits = search_project_corpus("архитектурный долг debt legacy", limit=3)
        for hit in hits:
            sources.append(hit.document.documentPath)
            lines.extend(f"- {b}" for b in extract_bullets(hit.section.content, limit=4))
    return lines[:MAX_ANSWER_LINES], sources


def _answer_document_content(query: str) -> tuple[list[str], list[str], bool, bool]:
    corpus = build_project_corpus()
    filename = _extract_md_filename(query)
    doc = find_document_by_path(corpus, filename) if filename else None
    if doc is None:
        hits = search_project_corpus(query, limit=1)
        if hits:
            doc = hits[0].document
        else:
            return ["Документ не найден в Project Knowledge Corpus."], [], False, False

    lines = _document_summary(doc, max_sections=5)
    highlights: list[str] = []
    for section in doc.sections:
        highlights.extend(_notable_lines(section.content, limit=2))
    if highlights:
        lines.append("Ключевые факты:")
        seen: set[str] = set()
        for line in highlights:
            key = line.casefold()
            if key in seen:
                continue
            seen.add(key)
            lines.append(f"- {line}")
            if len(seen) >= 8:
                break
    return lines, [doc.documentPath], True, bool(doc.sections)


def _answer_dashboard_wi() -> tuple[list[str], list[str]]:
    statuses = _load_dashboard_wi_status()
    done = _done_work_item_keys(statuses)
    open_items = _open_work_items(statuses)
    in_progress_stages: list[str] = []
    for stage_slug in {item.stage_slug for item in open_items[:12]}:
        stage_items = work_items_by_stage(stage_slug)
        open_in_stage = [item for item in stage_items if item.key not in done]
        if open_in_stage and len(open_in_stage) < len(stage_items):
            in_progress_stages.append(stage_slug)

    source_label = "platform_tasks" if statuses else "yasii_catalog (без БД)"
    lines = [
        f"Всего WI в catalog: {len(YASII_WORK_ITEMS)}.",
        f"Источник статусов: {source_label}.",
        f"Закрыто: {len(done)}.",
        f"Открыто: {len(open_items)}.",
    ]
    if open_items:
        lines.append("Примеры открытых WI:")
        for item in open_items[:10]:
            deps = ", ".join(item.depends_on) if item.depends_on else "—"
            lines.append(f"- {item.key} {item.title} (depends: {deps})")
    if in_progress_stages:
        lines.append(f"Этапы с незакрытыми WI: {', '.join(sorted(set(in_progress_stages))[:6])}.")
    return lines, ["backend/app/modules/platform_dashboard/yasii_catalog.py", "platform_tasks"]


def _answer_roadmap() -> tuple[list[str], list[str]]:
    corpus = build_project_corpus()
    doc = (
        find_document_by_path(corpus, "YASII_IMPLEMENTATION_ROADMAP.md")
        or find_document_by_path(corpus, "YASNOPRO_PLATFORM_IMPLEMENTATION_ROADMAP.md")
    )
    if doc is None:
        hits = search_project_corpus("roadmap phase этап", limit=2)
        lines = ["Roadmap (поиск по corpus):"]
        sources = []
        for hit in hits:
            sources.append(hit.document.documentPath)
            lines.extend(f"- {b}" for b in extract_bullets(hit.section.content, limit=6))
        return lines, sources

    lines = _document_summary(doc, max_sections=5)
    return lines, [doc.documentPath]


def _answer_document_list() -> tuple[list[str], list[str]]:
    corpus = build_project_corpus()
    by_type: dict[str, list[str]] = {}
    for doc in corpus.documents:
        if doc.documentType == KnowledgeDocumentType.CATALOG:
            continue
        key = doc.documentType.value
        by_type.setdefault(key, []).append(Path(doc.documentPath).name)
    lines = ["Документы в Project Knowledge Corpus:"]
    sources: list[str] = []
    for doc_type, names in sorted(by_type.items()):
        lines.append(f"{doc_type}: {len(names)} файлов")
        for name in sorted(names)[:8]:
            lines.append(f"  - {name}")
        if len(names) > 8:
            lines.append(f"  … ещё {len(names) - 8}")
        sources.extend(names[:3])
    return lines[:MAX_ANSWER_LINES], sources[:6]


def _answer_subsystems() -> tuple[list[str], list[str]]:
    corpus = build_project_corpus()
    lines = ["Подсистемы и runtime metadata:"]
    for row in corpus.runtimeMetadata:
        lines.append(f"- {row['subsystem']}: {row['description']}")
    hits = search_project_corpus("Platform Core Runtime Designer Object", limit=2)
    sources = ["project_corpus/runtime_metadata"]
    for hit in hits:
        sources.append(hit.document.documentPath)
        for bullet in extract_bullets(hit.section.content, limit=4):
            lines.append(f"- {bullet}")
    return lines[:MAX_ANSWER_LINES], sources


def _answer_search(query: str) -> tuple[list[str], list[str], bool]:
    hits = search_project_corpus(query, limit=5)
    if not hits:
        sections = find_sections(query, limit=3)
        if not sections:
            return ["По Project Knowledge Corpus совпадений не найдено."], [], False
        lines = []
        sources = []
        for section in sections:
            lines.append(section.sectionTitle or "Раздел")
            lines.extend(f"- {b}" for b in extract_bullets(section.content, limit=4))
        return lines, sources, True

    lines = []
    sources = []
    for hit in hits:
        sources.append(hit.document.documentPath)
        title = hit.section.sectionTitle or hit.document.title
        lines.append(f"{title} ({Path(hit.document.documentPath).name}):")
        lines.extend(f"- {b}" for b in extract_bullets(hit.section.content, limit=4))
    return lines[:MAX_ANSWER_LINES], sources, True


def build_knowledge_assessment(query_text: str) -> tuple[str, KnowledgeQueryKind, list[str], bool, bool]:
    kind = classify_knowledge_query(query_text) or KnowledgeQueryKind.SEARCH
    document_found = False
    section_found = False

    if kind == KnowledgeQueryKind.DOCUMENT_CONTENT:
        lines, sources, document_found, section_found = _answer_document_content(query_text)
    elif kind == KnowledgeQueryKind.DASHBOARD_WI:
        lines, sources = _answer_dashboard_wi()
        document_found = True
    elif kind == KnowledgeQueryKind.ARCHITECTURE_DEBT:
        lines, sources = _answer_architecture_debt()
        section_found = True
    elif kind == KnowledgeQueryKind.ROADMAP:
        lines, sources = _answer_roadmap()
        document_found = True
        section_found = True
    elif kind == KnowledgeQueryKind.DOCUMENT_LIST:
        lines, sources = _answer_document_list()
        document_found = True
    elif kind == KnowledgeQueryKind.SUBSYSTEMS:
        lines, sources = _answer_subsystems()
    elif kind == KnowledgeQueryKind.PROJECT_STATUS and any(
        k in _normalize(query_text) for k in _NOT_IMPLEMENTED_KEYWORDS
    ):
        lines, sources = _answer_not_implemented()
        section_found = True
    elif kind == KnowledgeQueryKind.PROJECT_STATUS:
        lines, sources = _answer_project_status()
        section_found = True
    else:
        lines, sources, section_found = _answer_search(query_text)

    message = (
        f"{ASSESSMENT_HEADER}\n\n"
        f"Запрос:\n{query_text.strip()}\n\n"
        f"Ответ:\n"
        + "\n".join(lines)
        + "\n\nИсточник:\n"
        + _format_sources(sources)
    )
    return message, kind, sources, document_found, section_found


def resolve_knowledge_corpus_command(query_text: str, payload: dict) -> KnowledgeCorpusResult | None:
    del payload
    if not is_knowledge_corpus_command(query_text):
        return None

    build_project_corpus()
    message, kind, _sources, document_found, section_found = build_knowledge_assessment(query_text)

    return KnowledgeCorpusResult(
        message=message,
        corpus_loaded=True,
        document_found=document_found,
        section_found=section_found,
        answer_generated=True,
        query_kind=kind.value,
    )
