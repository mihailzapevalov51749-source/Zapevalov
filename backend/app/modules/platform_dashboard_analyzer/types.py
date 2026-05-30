from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class BackendScanResult:
    module_paths: set[str] = field(default_factory=set)
    router_markers: set[str] = field(default_factory=set)
    model_tables: set[str] = field(default_factory=set)
    test_paths: set[str] = field(default_factory=set)
    file_contents: dict[str, str] = field(default_factory=dict)
    main_py_text: str = ""


@dataclass
class FrontendScanResult:
    module_paths: set[str] = field(default_factory=set)
    file_contents: dict[str, str] = field(default_factory=dict)
    manifest_fallback_files: set[str] = field(default_factory=set)


@dataclass
class ArchitectureDocSnapshot:
    status_tables: dict[str, str] = field(default_factory=dict)
    migration_phases: dict[str, dict] = field(default_factory=dict)
    debt_items: list[dict] = field(default_factory=list)
    adr_items: list[dict] = field(default_factory=list)
    roadmap_milestones: list[str] = field(default_factory=list)


@dataclass
class ScanContext:
    repo_root: Path
    backend: BackendScanResult
    frontend: FrontendScanResult
    docs: ArchitectureDocSnapshot


@dataclass
class EvidenceItem:
    key: str
    label: str
    weight: int
    passed: bool

    @property
    def display_passed(self) -> str:
        return f"✓ {self.label}"

    @property
    def display_failed(self) -> str:
        return f"✗ {self.label}"


@dataclass
class ComponentAnalysis:
    slug: str
    title: str
    description: str
    status: str
    readiness: int | None
    evidence: list[EvidenceItem]
    completed_items: list[str]
    remaining_items: list[str]
    dependencies: list[str] = field(default_factory=list)
    architecture_debt: list[str] = field(default_factory=list)


@dataclass
class StageAnalysis:
    slug: str
    title: str
    description: str
    status: str
    readiness: int | None
    order_index: int
    current_position: bool
    evidence: list[EvidenceItem]
    completed_items: list[str]
    remaining_items: list[str]
    current_tasks: list[str]
    next_tasks: list[str]
    completion_criteria: list[str]
    blockers: list[str]


@dataclass
class RefreshResult:
    components_count: int
    stages_count: int
    activities_added: int
    overall_readiness: int | None
    quality_issues_open: int
    refreshed_at: str
    analyzer_version: str = "1"
    analyzer_hash: str = ""
