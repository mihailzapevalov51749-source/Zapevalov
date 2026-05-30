from app.modules.platform_dashboard_analyzer.doc_reader import read_architecture_docs
from app.modules.platform_dashboard_analyzer.paths import get_repo_root


def test_migration_phases_parse_only_key_works_section():
    snapshot = read_architecture_docs(get_repo_root())

    phase6 = snapshot.migration_phases.get("ai-native-layer")
    assert phase6 is not None
    assert phase6["goal"]
    assert len(phase6["works"]) == 0

    phase1 = snapshot.migration_phases["object-platform-independence"]
    assert len(phase1["works"]) <= 8
    assert not any("appshell" in work.lower() for work in phase1["works"])
