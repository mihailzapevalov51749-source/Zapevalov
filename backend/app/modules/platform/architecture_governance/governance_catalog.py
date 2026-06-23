"""Constitution norm linkage metadata (derived index, not separate SoT)."""

from __future__ import annotations

CONSTITUTION_SOURCE_DOCUMENT = "docs/architecture/YASNOPRO_PLATFORM_STANDARDS.md"
CONSTITUTION_SOURCE_SECTION = "§3 Архитектурная конституция"

CONSTITUTION_NORM_LINKS: dict[int, dict[str, list[str]]] = {
    1: {
        "linked_restrictions": [],
        "related_adrs": [],
        "related_categories": [
            "Ядро",
            "Стандарты",
            "Службы",
            "Модули",
            "Данные",
            "Элементы интерфейса",
            "Компоненты",
            "Конфигурация",
        ],
    },
    2: {
        "linked_restrictions": ["Запрет двух primary-категорий у одного элемента"],
        "related_adrs": [],
        "related_categories": ["Методика классификации"],
    },
    3: {
        "linked_restrictions": ["Запрет классификации «по папке в коде»"],
        "related_adrs": [],
        "related_categories": ["Архитектурная классификация", "Все реестры"],
    },
    4: {
        "linked_restrictions": [
            "No display name as identifier",
            "Запрет name/title/short_name/label как id, key, marker защиты",
        ],
        "related_adrs": ["ADR-SEC-001", "ADR-007"],
        "related_categories": ["Ядро (Доступ)", "Данные"],
    },
    5: {
        "linked_restrictions": ["Запрет dual SoT в UI и скриптах", "Запрет параллельных catalog без синхронизации"],
        "related_adrs": [],
        "related_categories": ["Ядро", "Данные", "Компоненты"],
    },
    6: {
        "linked_restrictions": ["No tenant data in Control Plane", "Запрет правок demo через platform API"],
        "related_adrs": ["ADR-CP-001"],
        "related_categories": ["Runtime", "Данные", "Службы (Provisioning)"],
    },
    7: {
        "linked_restrictions": [
            "DEV-only development",
            "No direct TEMPLATE modifications",
            "No direct CLIENT modifications",
            "Runtime ≠ designer draft",
        ],
        "related_adrs": ["ADR-TPL-001", "ADR-UPD-001", "ADR-REL-001"],
        "related_categories": ["Публикация", "Runtime"],
    },
    8: {
        "linked_restrictions": ["No tenant bypass", "Запрет cross-env writes", "Запрет test junk в Эталоне"],
        "related_adrs": ["ADR-SEC-001"],
        "related_categories": ["Runtime"],
    },
    9: {
        "linked_restrictions": ["No tenant bypass", "Запрет shared DB между компаниями"],
        "related_adrs": ["ADR-RT-001", "ADR-SEC-001", "ADR-PROV-001"],
        "related_categories": ["Runtime", "Службы", "Публикация"],
    },
    10: {
        "linked_restrictions": ["Запрет параллельных registry/catalog без синхронизации"],
        "related_adrs": [],
        "related_categories": ["Ядро", "Модули", "Стандарты разработки"],
    },
    11: {
        "linked_restrictions": ["Запрет идентификации system entities по title"],
        "related_adrs": ["ADR-007"],
        "related_categories": ["Ядро", "Данные"],
    },
    12: {
        "linked_restrictions": ["Запрет legacy identity formats как write SoT"],
        "related_adrs": [],
        "related_categories": ["Ядро (Объекты)", "Данные"],
    },
}

DELIVERY_CONTOUR_SOURCE = "docs/architecture/YASNOPRO_ARCHITECTURE_GOVERNANCE.md"

DELIVERY_ROUTE = ["DEV", "TEMPLATE", "COMPANY"]

DELIVERY_PHASES: list[dict[str, str]] = [
    {
        "key": "scope",
        "title": "Scope",
        "description": "Фиксация состава изменений (Release Scope).",
    },
    {
        "key": "candidate",
        "title": "Candidate",
        "description": "Gate review / readiness.",
    },
    {
        "key": "materialize",
        "title": "Materialize",
        "description": "DEV → TEMPLATE (Publication Service).",
    },
    {
        "key": "verify",
        "title": "Verify",
        "description": "Проверка package и runtime (Deployment Execution).",
    },
    {
        "key": "activate",
        "title": "Activate",
        "description": "Применение к целевой среде.",
    },
    {
        "key": "rollback",
        "title": "Rollback",
        "description": "Дисциплина отката (archive/soft before hard).",
    },
]

DELIVERY_POLICIES: list[str] = [
    "Offer-gated update",
    "Version pin",
    "Rollback discipline",
]

DELIVERY_LINKS: list[dict[str, str]] = [
    {
        "label": "Релизы платформы",
        "kind": "operational",
        "target": "platform-releases",
    },
    {
        "label": "Publication Service",
        "kind": "compositional",
        "target": "services",
    },
    {
        "label": "Deployment Execution Service",
        "kind": "compositional",
        "target": "services",
    },
    {
        "label": "Стандарты публикации",
        "kind": "compositional",
        "target": "standards",
    },
]
