"""Platform Standards registry seed (WI-ARCH-REG-STD-002).

Source: docs/architecture/YASNOPRO_PLATFORM_STANDARDS.md v1.1
"""

from __future__ import annotations

from typing import Any

from app.modules.platform.architecture_navigator.constants import (
    ArchitectureComponentType,
    ArchitectureSourceKind,
)
from app.modules.platform.architecture_navigator.registry_catalog import RegistrySupplementRow, _row
from app.modules.platform.architecture_navigator.registry_constants import REGISTRY_STANDARDS

_STANDARDS_DOC = {
    "primary": "docs/architecture/YASNOPRO_PLATFORM_STANDARDS.md",
    "version": "v1.1",
}

_METHODOLOGY_DOC = "docs/architecture/YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md"
_GOVERNANCE_DOC = "docs/architecture/YASNOPRO_ARCHITECTURE_GOVERNANCE.md"
_MODAL_DOC = "docs/architecture/YASNOPRO_PLATFORM_MODAL_STANDARD.md"
_ENTITY_CONTRACT = "docs/architecture/YASNOPRO_ENTITY_IDENTITY_CONTRACT.md"
_OBJECT_VIEW_CONTRACT = "docs/architecture/OBJECT_VIEW_CONTRACT.md"


def _standards_row(**kwargs: Any) -> RegistrySupplementRow:
    if "purpose" not in kwargs and kwargs.get("description"):
        kwargs["purpose"] = kwargs["description"]
    metadata = dict(kwargs.pop("metadata_json", {}))
    metadata.setdefault("source_document", _STANDARDS_DOC["primary"])
    metadata.setdefault("source_version", _STANDARDS_DOC["version"])
    documents = dict(kwargs.pop("documents_json", {}))
    documents.setdefault("primary", _STANDARDS_DOC["primary"])
    base = _row(
        registry_key=REGISTRY_STANDARDS,
        category_key="decisions",
        component_type=ArchitectureComponentType.ARCHITECTURE_DECISION.value,
        architecture_zone="standards",
        documents_json=documents,
        metadata_json=metadata,
        **kwargs,
    )
    return base


_CONSTITUTION_NORMS: list[dict[str, Any]] = [
    {
        "component_key": "constitution-norm-ten-categories",
        "technical_name": "Ten Architectural Categories",
        "title": "Десять архитектурных категорий",
        "description": "Единая модель состава платформы для реестров, ADR и релизов.",
        "sort_order": 101,
        "norm_number": 1,
        "related_adrs": [],
        "related_contracts": [_METHODOLOGY_DOC],
        "cursor_rules": [".cursor/rules/yasnopro-architecture.mdc"],
    },
    {
        "component_key": "constitution-norm-one-primary-category",
        "technical_name": "One Primary Category",
        "title": "Один элемент — одна основная категория",
        "description": "У каждого архитектурного элемента — одна primary-категория в реестре.",
        "sort_order": 102,
        "norm_number": 2,
        "related_adrs": [],
        "related_contracts": [_METHODOLOGY_DOC],
        "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
    },
    {
        "component_key": "constitution-norm-classification-methodology",
        "technical_name": "Classification Methodology",
        "title": "Методика архитектурной классификации",
        "description": "Единый алгоритм отнесения новых элементов к категориям.",
        "sort_order": 103,
        "norm_number": 3,
        "related_adrs": [],
        "related_contracts": [_METHODOLOGY_DOC],
        "cursor_rules": [".cursor/rules/yasnopro-architecture.mdc"],
    },
    {
        "component_key": "constitution-norm-display-not-id",
        "technical_name": "Display Name Is Not Identifier",
        "title": "Отображаемое название не является идентификатором",
        "description": "Защита, routing и идентификация только по техническим полям id/key/code.",
        "sort_order": 104,
        "norm_number": 4,
        "related_adrs": ["ADR-SEC-001", "ADR-007"],
        "related_contracts": [_ENTITY_CONTRACT],
        "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
    },
    {
        "component_key": "constitution-norm-single-sot",
        "technical_name": "Single Source of Truth",
        "title": "Единый источник истины",
        "description": "На каждый домен — один authoritative слой данных и логики.",
        "sort_order": 105,
        "norm_number": 5,
        "related_adrs": [],
        "related_contracts": [],
        "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
    },
    {
        "component_key": "constitution-norm-platform-tenant-separation",
        "technical_name": "Platform Tenant Separation",
        "title": "Разделение платформы и компаний",
        "description": "Чёткая граница platform scope и tenant scope.",
        "sort_order": 106,
        "norm_number": 6,
        "related_adrs": ["ADR-CP-001"],
        "related_contracts": [],
        "cursor_rules": [".cursor/rules/platform-data-safety.mdc"],
    },
    {
        "component_key": "constitution-norm-dev-template-company",
        "technical_name": "DEV Template Company Route",
        "title": "Разработка → Эталон → Компания",
        "description": "Канонический маршрут доставки изменений между средами.",
        "sort_order": 107,
        "norm_number": 7,
        "related_adrs": ["ADR-TPL-001", "ADR-UPD-001", "ADR-REL-001"],
        "related_contracts": [],
        "cursor_rules": [".cursor/rules/platform-data-safety.mdc"],
    },
    {
        "component_key": "constitution-norm-environment-isolation",
        "technical_name": "Environment Isolation",
        "title": "Изоляция сред",
        "description": "Среды DEV, Эталон и Компания не смешиваются.",
        "sort_order": 108,
        "norm_number": 8,
        "related_adrs": ["ADR-SEC-001"],
        "related_contracts": [],
        "cursor_rules": [".cursor/rules/platform-data-safety.mdc"],
    },
    {
        "component_key": "constitution-norm-company-isolated-runtime",
        "technical_name": "Company Isolated Runtime",
        "title": "Изолированная среда компании",
        "description": "У каждой компании — собственный runtime-контур.",
        "sort_order": 109,
        "norm_number": 9,
        "related_adrs": ["ADR-RT-001", "ADR-SEC-001", "ADR-PROV-001"],
        "related_contracts": [],
        "cursor_rules": [],
    },
    {
        "component_key": "constitution-norm-no-logic-duplication",
        "technical_name": "No Logic Duplication",
        "title": "Отсутствие дублирования логики",
        "description": "Бизнес-правила живут в одном слое (service/backend), не в UI и скриптах.",
        "sort_order": 110,
        "norm_number": 10,
        "related_adrs": [],
        "related_contracts": [],
        "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
    },
    {
        "component_key": "constitution-norm-system-entity-standard",
        "technical_name": "System Entity Standard",
        "title": "Стандарт системных сущностей",
        "description": "Платформенные singleton-записи идентифицируются структурным ключом, не title.",
        "sort_order": 111,
        "norm_number": 11,
        "related_adrs": ["ADR-007"],
        "related_contracts": [],
        "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
    },
    {
        "component_key": "constitution-norm-entity-identity-contract",
        "technical_name": "Entity Identity Contract",
        "title": "Контракт идентичности сущностей",
        "description": "Единый canonical формат identity для записей, комментариев, связей, AI context.",
        "sort_order": 112,
        "norm_number": 12,
        "related_adrs": [],
        "related_contracts": [_ENTITY_CONTRACT],
        "cursor_rules": [],
    },
]


def _constitution_rows() -> list[RegistrySupplementRow]:
    rows: list[RegistrySupplementRow] = []
    for item in _CONSTITUTION_NORMS:
        rows.append(
            _standards_row(
                component_key=item["component_key"],
                technical_name=item["technical_name"],
                title=item["title"],
                description=item["description"],
                sort_order=item["sort_order"],
                documents_json={
                    "primary": _STANDARDS_DOC["primary"],
                    "section": f"§3.{item['norm_number']}",
                    "related_adrs": item["related_adrs"],
                    "related_contracts": item["related_contracts"],
                    "cursor_rules": item["cursor_rules"],
                },
                metadata_json={
                    "standards_group": "constitution",
                    "constitution_norm_number": item["norm_number"],
                    "criticality": "critical",
                },
            )
        )
    return rows


STANDARDS_REGISTRY_COMPONENTS: list[RegistrySupplementRow] = [
    *_constitution_rows(),
    # --- Architectural principles (3) ---
    _standards_row(
        component_key="decision-control-plane-not-tenant",
        technical_name="Control Plane ≠ Tenant",
        title="Control Plane ≠ Tenant",
        description="Контур управления платформой не является tenant-компанией.",
        purpose="Разделение глобального и tenant-контекста",
        sort_order=201,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§4 Архитектурные принципы",
            "related_adrs": ["ADR-CP-001"],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
        },
        metadata_json={"standards_group": "principles"},
    ),
    _standards_row(
        component_key="decision-platform-owner-not-tenant-user",
        technical_name="Platform Owner ≠ Tenant User",
        title="Platform Owner ≠ Tenant User",
        description="Владелец платформы и пользователь компании — разные роли.",
        purpose="Разграничение полномочий владельца и tenant",
        sort_order=202,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§4 Архитектурные принципы",
            "related_adrs": ["ADR-009", "ADR-010"],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
        },
        metadata_json={"standards_group": "principles"},
    ),
    _standards_row(
        component_key="decision-entity-sot",
        technical_name="Entity as Source of Truth",
        title="Entity — источник истины данных",
        description="Бизнес-данные хранятся в Entity Engine, не в UI.",
        purpose="Единый SoT для данных tenant",
        sort_order=203,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§4 Архитектурные принципы",
            "related_adrs": ["ADR-001"],
            "related_contracts": [_ENTITY_CONTRACT],
            "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
        },
        metadata_json={"standards_group": "principles"},
    ),
    # --- Development standards (10) ---
    _standards_row(
        component_key="standard-dev-prompt-preparation",
        technical_name="Prompt Preparation Standard",
        title="Стандарт подготовки задач",
        description="Полная структура промта: Context, Goal, Tests, Report, DEV Journal.",
        sort_order=301,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/02_PROMPT_STANDARD.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-journal",
        technical_name="Development Journal Standard",
        title="Журнал разработки",
        description="Обязательная запись в DEV tenant journal после значимого WI.",
        sort_order=302,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": ["ADR-AUD-001"],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/dev-journal-mandatory.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-doc-sync",
        technical_name="Documentation Sync Standard",
        title="Синхронизация документации",
        description="Обновление architecture status и Dashboard sources после кода.",
        sort_order=303,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/yasii-dashboard-gate.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-architecture-audit",
        technical_name="Architecture Audit Standard",
        title="Архитектурный аудит",
        description="Pass/Fail по SoT, дублированию, tenant architecture перед DONE.",
        sort_order=304,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/03_QUALITY_CONTROL.mdc", ".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-test-data-control",
        technical_name="Test Data Control Standard",
        title="Контроль тестовых данных",
        description="Формат Created/Deleted/Verification; запрет DONE при leak в demo.",
        sort_order=305,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/03_QUALITY_CONTROL.mdc", ".cursor/rules/platform-data-safety.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-cleanup-control",
        technical_name="Cleanup Control Standard",
        title="Контроль очистки",
        description="Cleanup status = PASSED только при 0 remaining test records.",
        sort_order=306,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/03_QUALITY_CONTROL.mdc", ".cursor/rules/task-local-test-data-ownership.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-data-impact",
        technical_name="Data Impact Audit Standard",
        title="Проверка влияния на данные",
        description="Data Impact Audit: tables, rows, dry-run перед destructive ops.",
        sort_order=307,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/platform-data-safety.mdc", ".cursor/rules/03_QUALITY_CONTROL.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-demo-readiness",
        technical_name="Demo Readiness Standard",
        title="Проверка готовности демонстрации",
        description="Demo Readiness Audit перед закрытием задач с UI/CP impact.",
        sort_order=308,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/03_QUALITY_CONTROL.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-manual-smoke",
        technical_name="Manual Smoke Standard",
        title="Ручная проверка",
        description="Manual Smoke в отчёте: шаги UI/CLI или NOT PERFORMED + reason.",
        sort_order=309,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/02_PROMPT_STANDARD.mdc", ".cursor/rules/03_QUALITY_CONTROL.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    _standards_row(
        component_key="standard-dev-test-data-ownership",
        technical_name="Task-Local Test Data Ownership",
        title="Владение тестовыми данными задачи",
        description="Создал → зафиксировал id → удалил по id → подтвердил отсутствие.",
        sort_order=310,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§5",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/task-local-test-data-ownership.mdc"],
        },
        metadata_json={"standards_group": "development"},
    ),
    # --- Interface standards (5) ---
    _standards_row(
        component_key="standard-ui-modal",
        technical_name="Platform Modal Standard",
        title="Стандарт модальных окон",
        description="PlatformModal / PlatformModalShell: drag, resize, persist bounds.",
        sort_order=401,
        documents_json={
            "primary": _MODAL_DOC,
            "standards_ref": _STANDARDS_DOC["primary"],
            "section": "§6",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/platform-modal-standard.mdc"],
        },
        metadata_json={"standards_group": "interface"},
    ),
    _standards_row(
        component_key="standard-ui-color-zones",
        technical_name="Platform Color Zones",
        title="Цветовые зоны платформы",
        description="Studio — фиолетовый; Office — синий; data-platform-zone.",
        sort_order=402,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§6",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [],
        },
        metadata_json={"standards_group": "interface"},
    ),
    _standards_row(
        component_key="standard-ui-three-level-model",
        technical_name="Three-Level UI Model",
        title="Трёхуровневая модель интерфейса",
        description="Элемент интерфейса / Компонент платформы / UI-библиотека.",
        sort_order=403,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§6",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [],
        },
        metadata_json={"standards_group": "interface"},
    ),
    _standards_row(
        component_key="standard-ui-card-structure",
        technical_name="Unified Card Structure",
        title="Единая структура карточек",
        description="Hero, секции, вкладки, поля — единый card pattern Office/Studio.",
        sort_order=404,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§6",
            "related_adrs": [],
            "related_contracts": [_OBJECT_VIEW_CONTRACT],
            "cursor_rules": [],
        },
        metadata_json={"standards_group": "interface"},
    ),
    _standards_row(
        component_key="standard-ui-navigation-shell",
        technical_name="Navigation Shell Standard",
        title="Стандарт навигационной оболочки платформы",
        description="App Shell: sidebar, header, workspace tabs, breadcrumbs.",
        sort_order=405,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§6",
            "related_adrs": [],
            "related_contracts": [],
            "cursor_rules": [],
        },
        metadata_json={"standards_group": "interface"},
    ),
    # --- Data standards (2) ---
    _standards_row(
        component_key="standard-data-identifiers",
        technical_name="Technical Identifiers Standard",
        title="Технические идентификаторы и ключи",
        description="Стабильные id, key, code, slug; не редактировать key через display forms.",
        sort_order=501,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§7",
            "related_adrs": ["ADR-SEC-001"],
            "related_contracts": [_ENTITY_CONTRACT],
            "cursor_rules": [".cursor/rules/01_ARCHITECTURE_RULES.mdc"],
        },
        metadata_json={"standards_group": "data"},
    ),
    _standards_row(
        component_key="standard-data-event-journal",
        technical_name="Event Journal Model Standard",
        title="Модель журналов событий",
        description="Scope, journal_kind, audit fields; display title не protection key.",
        sort_order=502,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§7",
            "related_adrs": ["ADR-AUD-001"],
            "related_contracts": [],
            "cursor_rules": [".cursor/rules/platform-event-journal-gate.mdc", ".cursor/rules/dev-journal-mandatory.mdc"],
        },
        metadata_json={"standards_group": "data"},
    ),
    # --- Publication standards (3) ---
    _standards_row(
        component_key="standard-pub-release-package",
        technical_name="Unified Release Package Standard",
        title="Единый пакет релиза",
        description="Immutable Unified Release Package с code artifacts и governance metadata.",
        sort_order=601,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§8",
            "related_adrs": ["ADR-REL-001"],
            "related_contracts": [],
            "cursor_rules": [],
        },
        metadata_json={"standards_group": "publication"},
    ),
    _standards_row(
        component_key="standard-pub-release-scope",
        technical_name="Release Scope Standard",
        title="Область и состав релиза",
        description="Release Scope: модули, компоненты, migrations, config snapshots.",
        sort_order=602,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§8",
            "related_adrs": ["ADR-REL-001", "ADR-PROVENANCE-001"],
            "related_contracts": [],
            "cursor_rules": [],
        },
        metadata_json={"standards_group": "publication"},
    ),
    _standards_row(
        component_key="standard-pub-governance-discipline",
        technical_name="Publication Governance Discipline",
        title="Управление публикацией и дисциплина релиза",
        description="Provenance, dirty DEV check, version pin, rollback discipline.",
        sort_order=603,
        documents_json={
            "primary": _STANDARDS_DOC["primary"],
            "section": "§8",
            "related_adrs": ["ADR-UPD-001", "ADR-TPL-001", "ADR-CP-001", "ADR-PROVENANCE-001"],
            "related_contracts": [],
            "cursor_rules": [],
        },
        metadata_json={"standards_group": "publication"},
    ),
]
