from pathlib import Path

from app.modules.platform_dashboard_analyzer.fingerprint import (
    ANALYZER_FINGERPRINT_FILES,
    ANALYZER_VERSION,
    compute_analyzer_fingerprint,
)
from app.modules.platform_dashboard_analyzer.paths import get_repo_root


def test_compute_analyzer_fingerprint_is_stable() -> None:
    first = compute_analyzer_fingerprint()
    second = compute_analyzer_fingerprint()

    assert first.version == ANALYZER_VERSION
    assert first.hash
    assert first == second


def test_compute_analyzer_fingerprint_changes_when_analyzer_file_changes(tmp_path: Path) -> None:
    repo_root = get_repo_root()
    fake_repo = tmp_path / "repo"
    fake_repo.mkdir()

    for rel in ANALYZER_FINGERPRINT_FILES:
        source = repo_root / rel
        target = fake_repo / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")

    baseline = compute_analyzer_fingerprint(fake_repo)
    target = fake_repo / ANALYZER_FINGERPRINT_FILES[0]
    target.write_text(target.read_text(encoding="utf-8") + "\n# changed\n", encoding="utf-8")
    changed = compute_analyzer_fingerprint(fake_repo)

    assert baseline.hash != changed.hash
