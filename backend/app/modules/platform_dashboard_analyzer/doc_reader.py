import re
from pathlib import Path

from app.modules.platform_dashboard_analyzer.paths import get_docs_dir
from app.modules.platform_dashboard_analyzer.types import ArchitectureDocSnapshot


STATUS_DOC = "YASNOPRO_ARCHITECTURE_STATUS.md"
MIGRATION_DOC = "YASNOPRO_MIGRATION_MAP.md"
DEBT_DOC = "YASNOPRO_ARCHITECTURE_DEBT.md"
ROADMAP_DOC = "YASNOPRO_PLATFORM_IMPLEMENTATION_ROADMAP.md"


def read_architecture_docs(repo_root: Path) -> ArchitectureDocSnapshot:
    docs_dir = get_docs_dir(repo_root)
    snapshot = ArchitectureDocSnapshot()

    status_text = _read_doc(docs_dir / STATUS_DOC)
    migration_text = _read_doc(docs_dir / MIGRATION_DOC)
    debt_text = _read_doc(docs_dir / DEBT_DOC)
    roadmap_text = _read_doc(docs_dir / ROADMAP_DOC)

    snapshot.status_tables.update(_parse_status_table(status_text))
    snapshot.migration_phases.update(_parse_migration_phases(migration_text))
    snapshot.debt_items.extend(_parse_debt_items(debt_text))
    snapshot.roadmap_milestones.extend(_parse_roadmap_milestones(roadmap_text))
    snapshot.adr_items.extend(_parse_adrs(docs_dir / "adr"))

    return snapshot


def _read_doc(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def _parse_status_table(text: str) -> dict[str, str]:
    statuses: dict[str, str] = {}
    for line in text.splitlines():
        if "|" not in line or line.strip().startswith("|---"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 2:
            continue
        name = cells[0].strip("* ").strip()
        status = cells[1].strip("* ").upper()
        if not name or name in {"Компонент", "Phase", "Область", "Recovery Layer"}:
            continue
        if any(token in status for token in ("DONE", "ACTIVE", "IMPLEMENTED", "VERIFIED", "PARTIAL", "BLOCKED", "NOT STARTED", "IN PROGRESS", "CANCELLED")):
            statuses[name.lower()] = status
    return statuses


def _parse_migration_phases(text: str) -> dict[str, dict]:
    phases: dict[str, dict] = {}
    section = _extract_updated_migration_strategy(text)
    if not section:
        return phases

    slug_map = {
        "phase 1. object platform independence": "object-platform-independence",
        "phase 2. legacy isolation": "legacy-isolation",
        "phase 3. legacy removal": "legacy-removal",
        "phase 4. runtime foundation": "runtime-foundation",
        "phase 5. designer foundation": "designer-foundation",
        "phase 6. ai-native layer": "ai-native-layer",
    }

    current_slug: str | None = None
    current: dict | None = None
    in_key_works = False

    for line in section.splitlines():
        stripped = line.strip()

        if stripped == "---":
            current_slug = None
            current = None
            in_key_works = False
            continue

        heading_match = re.match(r"^###\s+(.+)$", stripped)
        if heading_match:
            title = heading_match.group(1).strip().lower()
            current_slug = slug_map.get(title)
            if current_slug:
                current = {"title": heading_match.group(1).strip(), "works": [], "goal": ""}
                phases[current_slug] = current
            else:
                current_slug = None
                current = None
            in_key_works = False
            continue

        if not current_slug or current is None:
            continue

        if re.match(r"^\*\*Цель:\*\*", stripped):
            goal_match = re.match(r"^\*\*Цель:\*\*\s*(.+)$", stripped)
            if goal_match:
                current["goal"] = goal_match.group(1).strip()
            in_key_works = False
            continue

        if re.match(r"^\*\*Ключевые работы:\*\*", stripped):
            in_key_works = True
            continue

        work_match = re.match(r"^-\s+(.+)$", stripped)
        if work_match and in_key_works:
            current["works"].append(work_match.group(1).strip())

    return phases


def _extract_updated_migration_strategy(text: str) -> str:
    match = re.search(
        r"## Updated Migration Strategy.*?(?=\n---\s*\n|\n## 1\.|\Z)",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    return match.group(0) if match else ""


def _parse_debt_items(text: str) -> list[dict]:
    items: list[dict] = []
    blocks = re.split(r"\n#\s+", text)
    for block in blocks:
        code_match = re.search(r"(AD-\d+)", block)
        if not code_match:
            continue
        code = code_match.group(1)
        status_match = re.search(r"##\s+Статус\s*\n\s*\*\*(.+?)\*\*", block, re.MULTILINE)
        title_match = re.search(r"##\s+Название\s*\n\s*(.+)", block)
        risk_match = re.search(r"##\s+Риск\s*\n\s*(.+)", block)
        items.append(
            {
                "code": code,
                "title": title_match.group(1).strip() if title_match else code,
                "status": status_match.group(1).strip().upper() if status_match else "ACTIVE",
                "risk": risk_match.group(1).strip() if risk_match else "",
            }
        )
    return items


def _parse_roadmap_milestones(text: str) -> list[str]:
    milestones: list[str] = []
    for line in text.splitlines():
        if line.startswith("## Milestone:") or line.startswith("## Legacy Removal Program"):
            milestones.append(line.replace("## ", "").strip())
    return milestones


def _parse_adrs(adr_dir: Path) -> list[dict]:
    items: list[dict] = []
    if not adr_dir.exists():
        return items

    for path in sorted(adr_dir.glob("*.md")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        title_match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
        status_match = re.search(r"Status:\s*(.+)$", text, re.MULTILINE | re.IGNORECASE)
        items.append(
            {
                "slug": path.stem.lower(),
                "title": title_match.group(1).strip() if title_match else path.stem,
                "status": status_match.group(1).strip() if status_match else "accepted",
                "path": path.name,
            }
        )
    return items
