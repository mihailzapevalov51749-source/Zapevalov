export const platformDevelopmentManifest = {
  updatedAt: "2026-06-06T12:00:00",

  title: "Развитие платформы ЯсноПро",

  currentPosition: {
    level: "Level 1 — Hybrid Architecture",
    levelLabel: "Переходный этап (1 из 5)",
    summary:
      "Платформа уже умеет работать с объектами и карточками, но старый табличный контур ещё выводится из системы.",
    strategicDecision:
      "Старые таблицы не переносим в новую модель. Новые данные создаются только через объектную платформу.",
    targetFlow:
      "Тип объекта → Публикация → Запись → Таблица → Карточка объекта",
  },

  readiness: {
    targetPlatformPercent: 39,
    currentPhasePercent: 68,
    capabilities: [
      {
        name: "Модель объектов",
        status: "ready",
        percent: 88,
        businessMeaning:
          "Можно описывать типы объектов, задавать значения по умолчанию полей, публиковать и работать с записями.",
      },
      {
        name: "Представления",
        status: "ready",
        percent: 80,
        businessMeaning:
          "Табличный вид над объектами, фильтры и персональные представления.",
      },
      {
        name: "Карточка объекта",
        status: "ready",
        percent: 90,
        businessMeaning:
          "Карточка объекта отделена от старого табличного интерфейса.",
      },
      {
        name: "Коммуникации",
        status: "in_progress",
        percent: 70,
        businessMeaning:
          "Комментарии и уведомления к объектам работают; часть legacy-сценариев ещё остаётся.",
      },
      {
        name: "Legacy-очистка",
        status: "in_progress",
        percent: 30,
        businessMeaning:
          "Старый табличный контур постепенно выводится из платформы.",
      },
      {
        name: "Права доступа",
        status: "not_started",
        percent: 10,
        businessMeaning:
          "Доступы по объектам и полям ещё не реализованы.",
      },
    ],
  },

  roadmap: [
    {
      number: 1,
      name: "Независимость объектной платформы",
      status: "in_progress",
      percent: 67,
      meaning:
        "Новая объектная платформа перестаёт зависеть от старых таблиц.",
    },
    {
      number: 2,
      name: "Изоляция legacy",
      status: "next",
      percent: 0,
      meaning: "Старый контур остаётся только в старых сценариях.",
    },
    {
      number: 3,
      name: "Удаление legacy",
      status: "planned",
      percent: 0,
      meaning: "Старый табличный модуль полностью удаляется из продукта.",
    },
    {
      number: 4,
      name: "Runtime Foundation",
      status: "planned",
      percent: 0,
      meaning: "Права, поиск и надёжная работа с объектами.",
    },
    {
      number: 5,
      name: "Designer Foundation",
      status: "planned",
      percent: 0,
      meaning: "Studio полноценно управляет платформой.",
    },
    {
      number: 6,
      name: "AI-native Layer",
      status: "planned",
      percent: 0,
      meaning: "AI понимает объекты, связи и события платформы.",
    },
    {
      number: 7,
      name: 'Тип поля "Связи"',
      status: "planned",
      percent: 0,
      meaning:
        "Реализация field_type relation как UI над runtime_relation_instances (7 этапов, от контракта до фильтрации).",
    },
  ],

  currentWork: {
    phase: "Независимость объектной платформы",
    focus:
      "Убираем последние скрытые связи новой платформы со старым табличным контуром.",
    items: [
      { label: "ADR-001 принят", status: "done" },
      { label: "Архитектурные документы согласованы", status: "done" },
      { label: "Карточка объекта отделена от Universal Table", status: "done" },
      { label: "Runtime Read Gateway cleanup", status: "planned" },
      { label: "Notification legacy cleanup", status: "planned" },
      {
        label: 'Тип поля "Связи" — этап 1. Контракт поля',
        status: "next",
      },
    ],
  },

  achievements: [
    {
      date: "2026-06-05",
      text: "Упрощён сценарий действий в модалке удаления объекта с зависимостями: единая кнопка «Удалить», выбор сценария карточками, без дублирующей кнопки открытия зависимостей.",
    },
    {
      date: "2026-06-05",
      text: "Исправлена работа действий в модалке удаления зависимостей Корзины: активные сценарии, открытие зависимостей и восстановление модалки после возврата назад.",
    },
    {
      date: "2026-06-05",
      text: "Модалка удаления зависимостей в Корзине переработана: двухколоночный layout, KPI-карточки, selectable-сценарии и единая кнопка удаления на PlatformModal.",
    },
    {
      date: "2026-06-05",
      text: "Корзина получила сценарии «очистить зависимости» и «каскадное удаление» с деревом зависимостей в PlatformModal.",
    },
    {
      date: "2026-05-30",
      text: "Карточка объекта больше не зависит от Universal Table.",
    },
    {
      date: "2026-05-30",
      text: "Принято архитектурное решение: старые таблицы выводятся из платформы.",
    },
    {
      date: "2026-05-29",
      text: "Dual-SoT recovery (Layers 1–6) завершён.",
    },
    {
      date: "2026-05-29",
      text: "Уведомления ведут на карточку объекта.",
    },
    {
      date: "2026-05-29",
      text: "Создание новых legacy-таблиц заблокировано.",
    },
    {
      date: "2026-06-02",
      text: "Workspace Tabs v2: добавлены типы вкладок, автогенерация slug и универсальные target-поля.",
    },
    {
      date: "2026-06-02",
      text: "Workspace Tabs Routing Fix: унифицирован путь /workspaces/:workspaceSlug/:tabSlug и синхронизированы breadcrumb/active tab.",
    },
    {
      date: "2026-06-02",
      text: "Workspace Tabs Canonical Route Fix: контент вкладок рендерится внутри workspace route без replace на /page и /object-types.",
    },
    {
      date: "2026-06-04",
      text: "ADR: поле «Связи» — UI над runtime_relation_instances; следующий этап — реализация field_type relation.",
    },
    {
      date: "2026-06-04",
      text: 'Запланирована реализация типа поля «Связи» на основе runtime_relation_instances (7 этапов на Dashboard).',
    },
  ],

  platformChangelog: [
    {
      date: "2026-06-04",
      version: null,
      title: "ADR: поле «Связи» как relation instance view",
      summary:
        "Зафиксировано архитектурное решение: единственный SoT связи — runtime_relation_instances; поле не дублирует связь в value_json и не использует lookup.",
      nextStage: "Подготовка реализации типа поля «Связи»",
    },
    {
      date: "2026-06-04",
      version: null,
      title: 'План реализации: тип поля "Связи"',
      summary:
        "Запланирована реализация типа поля «Связи» на основе runtime_relation_instances. На Dashboard добавлен этап с 7 подэтапами (0% готовности, статус PLANNED).",
      nextStage: 'Тип поля "Связи" — этап 1. Контракт поля',
    },
  ],

  risks: [
    {
      title: "Часть уведомлений ещё открывает старую карточку",
      level: "medium",
      explanation:
        "Некоторые старые уведомления могут открывать карточку legacy-таблицы, а не объектную карточку.",
    },
    {
      title: "Права доступа ещё не реализованы",
      level: "high",
      explanation:
        "Для enterprise-сценариев нужны доступы по объектам, полям и ролям.",
    },
    {
      title: "Старые страницы портала ещё используют legacy-таблицы",
      level: "medium",
      explanation:
        "До этапов изоляции и удаления часть portal-страниц ещё показывает старый табличный контур.",
    },
    {
      title: "AI-слой не подключён",
      level: "low",
      explanation:
        "Искусственный интеллект по данным компании пока только в планах.",
    },
  ],

  nextStep: {
    title: 'Тип поля "Связи" — этап 1. Контракт поля',
    titleLabel: "Активный подэтап программы relation field",
    description:
      "Добавить FieldType.RELATION, validation, settings_json, publish validation и runtime contract. Реализация не начата (0%).",
    expectedResult:
      "Поле relation существует в контракте платформы.",
  },

  relationFieldTypeProgram: {
    title: 'Тип поля "Связи"',
    status: "PLANNED",
    readiness: 0,
    adr: "ADR-Object-Relation-Field",
    sourceOfTruth: "runtime_relation_instances",
    activeSubPhaseKey: "relation-field-contract",
    stages: [
      {
        key: "relation-field-contract",
        number: 1,
        title: "Контракт поля",
        status: "PLANNED",
        readiness: 0,
        steps: [
          "Добавить FieldType.RELATION",
          "Добавить backend validation",
          "Добавить settings_json для relation field",
          "Добавить publish validation",
          "Добавить runtime contract",
        ],
        completionCriterion:
          "Поле relation существует в контракте платформы.",
      },
      {
        key: "relation-field-studio",
        number: 2,
        title: "Studio",
        status: "PLANNED",
        readiness: 0,
        steps: [
          'Добавить тип поля "Связи"',
          "Добавить настройки relation field",
          "Выбор relation definition",
          "Выбор роли source/target",
          "Настройка cardinality",
          "Настройка required",
        ],
        completionCriterion:
          "Пользователь может создать relation field через Studio.",
      },
      {
        key: "relation-field-runtime-api",
        number: 3,
        title: "Runtime API",
        status: "PLANNED",
        readiness: 0,
        steps: [
          "Получение relation instances по relation field",
          "Создание relation instance через field",
          "Удаление relation instance через field",
          "Замена relation instance",
        ],
        completionCriterion:
          "Relation field полностью работает через relation engine.",
      },
      {
        key: "relation-field-object-card",
        number: 4,
        title: "Карточка объекта",
        status: "PLANNED",
        readiness: 0,
        steps: [
          "RelationValueRenderer",
          "RelationFieldEditor",
          "Отображение одной связи",
          "Отображение множественных связей",
          "Переход в связанную карточку",
        ],
        completionCriterion: "Связи работают в карточке объекта.",
      },
      {
        key: "relation-field-object-table",
        number: 5,
        title: "Таблица объекта",
        status: "PLANNED",
        readiness: 0,
        steps: [
          "Отображение relation field в таблице",
          "Поддержка множественных связей",
          "Переход в связанную карточку",
          "Оптимизация загрузки title",
        ],
        completionCriterion: "Связи корректно отображаются в таблице.",
      },
      {
        key: "relation-field-related-records",
        number: 6,
        title: 'Интеграция со "Связанными записями"',
        status: "PLANNED",
        readiness: 0,
        steps: [
          "Проверить единый источник данных",
          'Проверить совместимость relation field и Related Records',
          "Исключить дублирование данных",
          "Проверить обратные связи",
        ],
        completionCriterion:
          'Поле "Связи" и вкладка "Связанные записи" используют один relation engine.',
      },
      {
        key: "relation-field-analytics",
        number: 7,
        title: "Фильтрация и аналитика",
        status: "PLANNED",
        readiness: 0,
        steps: [
          "Фильтрация по связанному объекту",
          "Фильтрация по наличию связи",
          "Фильтрация по отсутствию связи",
          "Сортировка по связанному объекту",
          "Группировка по связанному объекту",
        ],
        completionCriterion:
          "Relation field участвует в механизмах анализа данных.",
      },
    ],
  },

  platformArchitecture: [
    {
      key: "object-platform",
      title: "Object Platform",
      description:
        "Центральный контур управления объектной моделью платформы: от описания типов до работы с записями.",
      status: "in_progress",
      readiness: 62,
      dependencies: ["Object Type", "Publish", "Runtime Entity"],
      risks: ["Legacy-зависимости", "Разрыв между Studio и Runtime"],
    },
    {
      key: "object-type",
      title: "Object Type",
      description:
        "Конструктор типов объектов в Studio: поля, связи, представления и жизненный цикл типа.",
      status: "review",
      readiness: 85,
      dependencies: ["Object Platform"],
      risks: ["Сложность для новых пользователей Studio"],
    },
    {
      key: "publish",
      title: "Publish",
      description:
        "Публикация типа объекта из Studio в рабочую среду портала и обновление меню.",
      status: "in_progress",
      readiness: 72,
      dependencies: ["Object Type", "Runtime Entity"],
      risks: ["Несогласованность версий Studio и Runtime"],
    },
    {
      key: "runtime-entity",
      title: "Runtime Entity",
      description:
        "Хранение и чтение записей объектов в рабочей среде: единый API для таблиц и карточек.",
      status: "in_progress",
      readiness: 68,
      dependencies: ["Publish", "Object Platform"],
      risks: ["Остаточные fallback на legacy-таблицы"],
    },
    {
      key: "object-card",
      title: "Object Card",
      description:
        "Карточка объекта для просмотра и редактирования записи: поля, комментарии, вложения.",
      status: "done",
      readiness: 90,
      dependencies: ["Runtime Entity", "Object Type"],
      risks: ["Часть уведомлений ещё ведёт на legacy-карточки"],
    },
    {
      key: "relations",
      title: "Relations",
      description:
        "Relation engine (~58%): definitions, instances, вкладка «Связанные записи». Программа типа поля «Связи» — PLANNED, 0% (7 подэтапов в manifest).",
      status: "in_progress",
      readiness: 58,
      relationEngineReadiness: 58,
      relationFieldTypeProgramReadiness: 0,
      relationFieldTypeProgramStatus: "PLANNED",
      dependencies: ["Object Type", "Runtime Entity", "Object Card"],
      risks: [
        "Неполное покрытие сценариев связей в UI",
        "Риск реализации поля через lookup/value_json вместо relation instances",
      ],
    },
    {
      key: "search",
      title: "Search",
      description:
        "Поиск по объектам и записям платформы: быстрый доступ к данным из любого раздела.",
      status: "planned",
      readiness: 8,
      dependencies: ["Runtime Entity", "Object Platform"],
      risks: ["Без поиска сложно масштабировать портал"],
    },
    {
      key: "permissions",
      title: "Permissions",
      description:
        "Права доступа к объектам, полям и действиям: основа для enterprise-сценариев.",
      status: "blocked",
      readiness: 10,
      dependencies: ["Object Platform", "Runtime Entity"],
      risks: ["Блокирует enterprise-внедрения", "Нет модели ролей по объектам"],
    },
    {
      key: "ai-context",
      title: "AI Context",
      description:
        "ACE + YASII skeleton (P1-W01/W02): /ai-context/health, /yasii/health. Полный контекст и handoff — Phase 1 (P1-W03+).",
      status: "in_progress",
      readiness: 1,
      dependencies: ["Object Platform", "Relations", "Search"],
      risks: [
        "Identity/Permission/ContextSnapshot ещё не реализованы (P1-W03–W06)",
        "Зависит от зрелости runtime-контура",
      ],
    },
  ],

  architectureDebt: [
    {
      key: "universal-table-retirement",
      title: "Universal Table Retirement",
      description:
        "Вывод старого табличного контура из платформы: новые данные создаются только через объектную модель.",
      priority: "p0",
      progress: 65,
      status: "in_progress",
      impact:
        "Пока legacy-таблицы остаются в продукте, платформа не может стать единой объектной системой.",
      nextAction: "Завершить очистку Runtime Read Gateway и убрать fallback на старые таблицы.",
      relatedContours: ["Object Platform", "Runtime Entity", "Object Card"],
    },
    {
      key: "legacy-block-isolation",
      title: "Legacy Block Isolation",
      description:
        "Изоляция устаревших блоков портала, чтобы они не смешивались с новой объектной платформой.",
      priority: "p0",
      progress: 40,
      status: "in_progress",
      impact:
        "Legacy-блоки создают риск случайного использования старых сценариев в новых порталах.",
      nextAction: "Закрепить freeze legacy-блоков и явно отделить их в Studio.",
      relatedContours: ["Object Platform", "Publish"],
    },
    {
      key: "object-runtime-separation",
      title: "Object Runtime Separation",
      description:
        "Чёткое разделение настройки объектов в Studio и работы с записями в runtime.",
      priority: "p0",
      progress: 55,
      status: "in_progress",
      impact:
        "Скрытые связи между Studio и Runtime усложняют сопровождение и публикацию изменений.",
      nextAction: "Убрать оставшиеся скрытые зависимости контура чтения данных.",
      relatedContours: ["Runtime Entity", "Publish", "Object Platform"],
    },
    {
      key: "view-state-ownership",
      title: "View State Ownership",
      description:
        "Предсказуемое владение состоянием представлений: фильтры, сортировка, персональные настройки.",
      priority: "p1",
      progress: 45,
      status: "in_progress",
      impact:
        "Пользователь может потерять ожидаемое поведение таблицы при смене представления или сессии.",
      nextAction: "Закрепить контракт персональных представлений и dirty-guard сценарии.",
      relatedContours: ["Object Type", "Object Platform"],
    },
    {
      key: "designer-runtime-boundary",
      title: "Designer / Runtime Boundary",
      description:
        "Понятная граница между настройкой типа объекта в Studio и его работой в портале.",
      priority: "p1",
      progress: 70,
      status: "review",
      impact:
        "Размытая граница мешает владельцу продукта понимать, что уже опубликовано и что ещё в черновике.",
      nextAction: "Проверить сценарии публикации, preview и обновления опубликованного типа.",
      relatedContours: ["Publish", "Object Type", "Runtime Entity"],
    },
    {
      key: "permissions-foundation",
      title: "Permissions Foundation",
      description:
        "Базовая модель прав доступа к объектам, полям и действиям платформы.",
      priority: "p0",
      progress: 10,
      status: "blocked",
      impact:
        "Без прав доступа платформа не готова к enterprise-внедрениям и мультитenant-сценариям.",
      nextAction: "Утвердить модель доступов по объектам и полям на уровне архитектуры.",
      relatedContours: ["Permissions", "Object Platform"],
    },
    {
      key: "notifications-runtime-completion",
      title: "Notifications Runtime Completion",
      description:
        "Завершение перевода уведомлений на объектный runtime и карточку объекта.",
      priority: "p1",
      progress: 60,
      status: "in_progress",
      impact:
        "Часть уведомлений всё ещё открывает legacy-маршруты вместо карточки объекта.",
      nextAction: "Перевести оставшиеся типы уведомлений на объектную навигацию.",
      relatedContours: ["Object Card", "Runtime Entity"],
    },
  ],

  implementationPhases: [
    {
      key: "object-platform-independence",
      title: "Object Platform Independence",
      description:
        "Новая объектная платформа перестаёт зависеть от старых таблиц и legacy-fallback.",
      status: "in_progress",
      readiness: 75,
      ownerFocus:
        "Контролировать, что новые сценарии создают данные только через объектную модель.",
      result:
        "Таблицы и карточки читают и пишут записи через Runtime Entity API без gateway adapters.",
      nextMilestone: "Entity card layout в shared/entityCardShell и полная независимость objectEntities от UT styles.",
      linkedContours: ["Object Platform", "Runtime Entity", "Object Card"],
      linkedDebt: ["Universal Table Retirement", "Object Runtime Separation"],
      keyWorks: [
        "Runtime Read Gateway cleanup — COMPLETED",
        "RuntimeLegacyWriteAdapter removal — COMPLETED",
        "Entity card shell migration",
      ],
      risks: [
        "Legacy-зависимости в старых portal-страницах",
        "Скрытые fallback в контуре чтения данных",
      ],
      completionCriteria: [
        "Новые записи создаются только через object platform",
        "Таблицы и карточки читают данные через Runtime Entity API",
      ],
    },
    {
      key: "relation-field-type",
      title: 'Тип поля "Связи"',
      description:
        "Реализация field_type relation как UI-представления над runtime_relation_instances (ADR-Object-Relation-Field). Семь подэтапов от контракта до фильтрации.",
      status: "planned",
      ownerStatus: "PLANNED",
      readiness: 0,
      ownerFocus:
        "Пошагово закрывать подэтапы программы relation field; не начинать реализацию без контракта (этап 1).",
      result:
        "Поле «Связи» в Studio и Office: карточка, таблица, единый relation engine с вкладкой «Связанные записи».",
      nextMilestone:
        "Этап 1. Контракт поля — FieldType.RELATION, settings_json, publish и runtime contract.",
      activeSubPhaseKey: "relation-field-contract",
      linkedContours: ["Relations", "Object Type", "Runtime Entity", "Object Card"],
      linkedDebt: [],
      linkedAdr: "ADR-Object-Relation-Field",
      subPhases: [
        {
          key: "relation-field-contract",
          title: "Контракт поля",
          readiness: 0,
          status: "PLANNED",
        },
        {
          key: "relation-field-studio",
          title: "Studio",
          readiness: 0,
          status: "PLANNED",
        },
        {
          key: "relation-field-runtime-api",
          title: "Runtime API",
          readiness: 0,
          status: "PLANNED",
        },
        {
          key: "relation-field-object-card",
          title: "Карточка объекта",
          readiness: 0,
          status: "PLANNED",
        },
        {
          key: "relation-field-object-table",
          title: "Таблица объекта",
          readiness: 0,
          status: "PLANNED",
        },
        {
          key: "relation-field-related-records",
          title: 'Интеграция со "Связанными записями"',
          readiness: 0,
          status: "PLANNED",
        },
        {
          key: "relation-field-analytics",
          title: "Фильтрация и аналитика",
          readiness: 0,
          status: "PLANNED",
        },
      ],
      keyWorks: [
        "Этап 1. Контракт поля — FieldType.RELATION, validation, publish (0%)",
        "Этап 2. Studio — тип поля и настройки relation field (0%)",
        "Этап 3. Runtime API — CRUD instances через field (0%)",
        "Этап 4. Карточка — RelationValueRenderer / RelationFieldEditor (0%)",
        "Этап 5. Таблица — колонка relation field (0%)",
        "Этап 6. Интеграция с «Связанными записями» (0%)",
        "Этап 7. Фильтрация и аналитика (0%)",
      ],
      risks: [
        "Дублирование SoT (value_json vs relation instances)",
        "Преждевременная реализация UI до контракта и publish validation",
        "Сложность filter/sort по связям в object view query",
      ],
      completionCriteria: [
        "Поле relation существует в контракте платформы",
        "Пользователь может создать relation field через Studio",
        "Relation field полностью работает через relation engine",
        "Связи работают в карточке объекта",
        "Связи корректно отображаются в таблице",
        'Поле "Связи" и вкладка "Связанные записи" используют один relation engine',
        "Relation field участвует в механизмах анализа данных",
      ],
    },
    {
      key: "legacy-isolation",
      title: "Legacy Isolation",
      description:
        "Старый табличный контур остаётся только в явно legacy-сценариях, без смешения с новой платформой.",
      status: "in_progress",
      readiness: 60,
      ownerFocus:
        "Убедиться, что новые порталы и Studio не предлагают legacy как равноправный путь.",
      result:
        "Legacy-блоки изолированы через placeholder boundary; support mode для existing pages сохранён.",
      nextMilestone: "Убрать UT bridges из navigation/sidebar.",
      linkedContours: ["Object Platform", "Publish"],
      linkedDebt: ["Legacy Block Isolation"],
      keyWorks: [
        "Запрет создания новых UT blocks — COMPLETED",
        "Legacy block types из новых сценариев — COMPLETED",
        "Placeholder для existing UT blocks — COMPLETED",
        "Аудит UT bridges в navigation/sidebar",
      ],
      risks: [
        "Случайное использование legacy в новых порталах",
        "Непонятная граница между старым и новым контуром",
      ],
      completionCriteria: [
        "Legacy явно отделён от object platform",
        "Новые порталы не предлагают legacy как основной путь",
      ],
    },
    {
      key: "legacy-removal",
      title: "Legacy Removal",
      description:
        "Полное удаление старого табличного модуля из продукта после изоляции.",
      status: "planned",
      readiness: 0,
      ownerFocus:
        "Принять решение о сроках вывода legacy только после подтверждения изоляции.",
      result:
        "Universal Table и связанные legacy-сценарии отсутствуют в продукте.",
      nextMilestone: "Утверждён план миграции оставшихся portal-страниц.",
      linkedContours: ["Object Platform", "Runtime Entity"],
      linkedDebt: ["Universal Table Retirement", "Legacy Block Isolation"],
      keyWorks: [
        "План миграции оставшихся portal-страниц",
        "Вывод Universal Table из продукта",
        "Коммуникация перехода для владельцев порталов",
      ],
      risks: [
        "Регрессии на старых portal-страницах до миграции",
        "Преждевременное удаление без изоляции",
      ],
      completionCriteria: [
        "Legacy-табличный модуль удалён из продукта",
        "Все критичные сценарии переведены на object platform",
      ],
    },
    {
      key: "runtime-foundation",
      title: "Runtime Foundation",
      description:
        "Надёжный runtime-контур: права, поиск и предсказуемая работа с объектами в портале.",
      status: "planned",
      readiness: 0,
      ownerFocus:
        "Определить минимальный набор возможностей runtime для enterprise-ready платформы.",
      result:
        "Портал масштабируется по объектам с правами доступа и поиском.",
      nextMilestone: "Утверждена модель Permissions Foundation.",
      linkedContours: ["Runtime Entity", "Permissions", "Search"],
      linkedDebt: ["Permissions Foundation", "Object Runtime Separation"],
      keyWorks: [
        "Модель прав доступа по объектам и полям",
        "Базовый поиск по объектам",
        "Надёжный контур чтения и записи runtime-сущностей",
      ],
      risks: [
        "Без прав платформа не готова к enterprise",
        "Отложенный поиск усложнит масштабирование портала",
      ],
      completionCriteria: [
        "Права доступа работают на уровне объектов",
        "Поиск доступен из ключевых разделов портала",
      ],
    },
    {
      key: "designer-foundation",
      title: "Designer Foundation",
      description:
        "Studio полноценно управляет платформой: типы, публикация, preview и граница с runtime.",
      status: "planned",
      readiness: 0,
      ownerFocus:
        "Сделать Studio главным местом настройки объектной платформы без двусмысленностей.",
      result:
        "Владелец продукта понимает, что настроено, опубликовано и доступно в портале.",
      nextMilestone: "Закреплены сценарии Designer / Runtime Boundary.",
      linkedContours: ["Object Type", "Publish"],
      linkedDebt: ["Designer / Runtime Boundary", "View State Ownership"],
      keyWorks: [
        "Сценарии публикации и preview",
        "Понятная граница Studio и runtime",
        "Управление жизненным циклом типа объекта",
        "Корзина платформы",
      ],
      risks: [
        "Размытая граница между черновиком и опубликованным",
        "Сложность Studio для новых пользователей",
      ],
      completionCriteria: [
        "Studio — единая точка настройки object platform",
        "Публикация и preview предсказуемы для владельца продукта",
      ],
    },
    {
      key: "ai-native-layer",
      title: "Встроенный ИИ",
      description:
        "Создание встроенного цифрового интеллектуального сотрудника платформы. ACE обеспечивает контекст, права доступа и безопасную область анализа. YASII обеспечивает интеллектуальный анализ, рекомендации и поддержку пользователей на основе контекста платформы.",
      status: "planned",
      readiness: 0,
      ownerFocus:
        "Разделить прогресс ACE Foundation и YASII Core Foundation внутри единого этапа платформы.",
      result:
        "Host Surface → ACE → YASII: контекст нормализуется в ACE, reasoning и Knowledge — в YASII.",
      nextMilestone: "ACE Foundation: ContextSnapshot и PermissionBoundary; YASII: runtime skeleton.",
      linkedContours: ["AI Context", "Relations", "Search"],
      linkedDebt: [],
      keyWorks: [
        "ACE Track: HostContext, Identity, Permission, ContextSnapshot, PermissionBoundary",
        "YASII Track: EffectiveScope (Runtime Entry), Core, Knowledge, Graph, Runtime",
        "YASII Track: Core, Knowledge, Graph, Runtime, Developer и Owner Assistant",
        "Platform Dashboard: отдельная готовность ACE и YASII",
      ],
      risks: [
        "Смешение ownership ACE и YASII скрывает реальный прогресс",
        "YASII Track зависит от handoff ACE",
      ],
      completionCriteria: [
        "ACE Foundation: HostContext → PermissionBoundary → ContextSnapshot",
        "YASII Runtime Entry: EffectiveScope (= PermissionBoundary ∩ Current Context)",
        "YASII Track: Core, Knowledge, Graph, Runtime, роли Developer и Owner Assistant",
        "ЯСИИ работает из контекста платформы; Dashboard — источник контроля реализации",
      ],
    },
  ],

  next90Days: {
    title: "Следующие 90 дней",
    summary:
      "Завершить независимость object platform и закрепить управленческий baseline Dashboard.",
    items: [
      {
        label: "Runtime Read Gateway cleanup",
        focus: "Убрать fallback на legacy-таблицы в контуре чтения.",
      },
      {
        label: 'Тип поля "Связи" — этап 1. Контракт поля',
        focus: "FieldType.RELATION, settings_json, publish и runtime contract (0%).",
      },
      {
        label: "Freeze legacy-блоков",
        focus: "Подготовить изоляцию legacy перед этапом удаления.",
      },
    ],
  },

  platformHistory: [
    {
      key: "adr-001-accepted",
      date: "2026-05-29",
      title: "ADR-001 принят",
      type: "decision",
      description:
        "Принято стратегическое решение: старые таблицы не переносятся в новую объектную модель.",
      impact:
        "Задаёт направление развития платформы и снимает неопределённость между legacy и object platform.",
      relatedContours: ["Object Platform", "Runtime Entity"],
      relatedDebt: ["Universal Table Retirement"],
      relatedAdr: "ADR-001",
    },
    {
      key: "root-section-owner-fixed",
      date: "2026-05-29",
      title: "Root Section Owner исправлен",
      type: "architecture",
      description:
        "Навигация и подсветка меню для опубликованных объектов больше не смешиваются с разделом «Объекты».",
      impact:
        "Владелец продукта видит предсказуемые маршруты в Studio при работе с опубликованными типами.",
      relatedContours: ["Object Platform", "Publish"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-entity-card-decoupling",
      date: "2026-05-30",
      title: "Object Entity Card Decoupling завершён",
      type: "milestone",
      description:
        "Карточка объекта отделена от старого табличного интерфейса Universal Table.",
      impact:
        "Пользователи работают с записями через объектную карточку — ключевой шаг к независимости платформы.",
      relatedContours: ["Object Card", "Runtime Entity"],
      relatedDebt: ["Universal Table Retirement"],
      relatedAdr: "ADR-001",
    },
    {
      key: "quality-issue-registry",
      date: "2026-05-30",
      title: "Quality Issue Registry создан",
      type: "quality",
      description:
        "Проблемы качества платформы сохраняются в постоянном реестре и отображаются на Dashboard.",
      impact:
        "Владелец продукта может фиксировать проблемы качества без потери данных после обновления страницы.",
      relatedContours: ["Object Platform"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "architecture-map-added",
      date: "2026-05-30",
      title: "Architecture Map добавлена",
      type: "architecture",
      description:
        "На Dashboard появилась карта из 9 крупных контуров платформы с готовностью и рисками.",
      impact:
        "Архитектура платформы видна как управленческая карта, а не как схема файлов или модулей.",
      relatedContours: [
        "Object Platform",
        "Object Type",
        "Publish",
        "Runtime Entity",
        "Permissions",
        "AI Context",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "architecture-debt-added",
      date: "2026-05-30",
      title: "Architecture Debt добавлен",
      type: "architecture",
      description:
        "Архитектурный долг представлен как управленческий блок с приоритетами P0–P2 и следующими шагами.",
      impact:
        "Крупные долги, мешающие развитию, видны в одном месте с прогрессом закрытия.",
      relatedContours: ["Object Platform", "Runtime Entity"],
      relatedDebt: [
        "Universal Table Retirement",
        "Legacy Block Isolation",
        "Permissions Foundation",
      ],
      relatedAdr: null,
    },
    {
      key: "implementation-kanban-added",
      date: "2026-05-30",
      title: "Implementation Kanban добавлен",
      type: "milestone",
      description:
        "Фазы реализации платформы показаны как Kanban-панель с фокусом владельца продукта.",
      impact:
        "Этапы развития читаются как управленческие фазы, а не как список задач разработки.",
      relatedContours: ["Object Platform"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "workspace-tabs-v2",
      date: "2026-06-02",
      title: "Workspace Tabs v2",
      type: "milestone",
      description:
        "Вкладки рабочего пространства расширены с object-only до multi-type (object/page/link/dashboard/documents/process/group) с автогенерацией slug и ручным override.",
      impact:
        "Рабочие пространства теперь открывают разные источники контента без жёсткой привязки только к объектам.",
      relatedContours: ["Object Platform", "Publish"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "workspace-tabs-routing-fix",
      date: "2026-06-02",
      title: "Workspace Tabs Routing Fix",
      type: "quality",
      description:
        "Единый маршрут вкладок пространства переведён на формат /workspaces/:workspaceSlug/:tabSlug, добавлена канонизация home-вкладки и синхронизация breadcrumb с tab title.",
      impact:
        "Состояние вкладки определяется URL и стабильно восстанавливается при прямом открытии и навигации по вкладкам.",
      relatedContours: ["Object Platform", "Publish"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "workspace-tabs-canonical-route-fix",
      date: "2026-06-02",
      title: "Workspace Tabs Canonical Route Fix",
      type: "quality",
      description:
        "Убран принудительный replace на специализированные runtime-маршруты из workspace flow; URL вкладки сохраняется в формате /workspaces/:workspaceSlug/:tabSlug.",
      impact:
        "Навигация, active tab и breadcrumb синхронизируются на уровне canonical workspace route.",
      relatedContours: ["Object Platform", "Publish"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-card-publish-pipeline",
      date: "2026-06-04",
      title: "Публикация layout карточки объекта в Office",
      type: "quality",
      description:
        "Сохранение настроек карточки обновляет updated_at объекта (неопубликованные изменения), publish переносит presentation.card в catalog snapshot; страница данных Studio получила Publish и onSchemaChanged после save card layout.",
      impact:
        "Цикл Studio → Save card → Есть неопубликованные изменения → Publish → Office применяет видимость блоков карточки.",
      relatedContours: ["Object Card", "Publish", "Object Platform"],
      relatedDebt: [],
      relatedAdr: "ADR-002",
    },
    {
      key: "object-card-visibility-persistence-fix",
      date: "2026-06-04",
      title: "Исправление сохранения и применения видимости блоков карточки объекта",
      type: "quality",
      description:
        "Карточка в Studio (режим «Все») читала layout из published catalog вместо сохранённого designer view; после Save видимость сбрасывалась. Добавлен resolveEntityCardLayoutForRender и исправлены toggle вкладок.",
      impact:
        "Скрытие/показ блоков, вкладок, полей и комментариев сохраняется в presentation.card и применяется при повторном открытии; после Publish — в Office.",
      relatedContours: ["Object Card", "Object Platform"],
      relatedDebt: [],
      relatedAdr: "ADR-002",
    },
    {
      key: "page-status-runtime-contract",
      date: "2026-06-04",
      title: "Runtime-контракт статусов страниц",
      type: "quality",
      description:
        "Внедрён строгий runtime-контракт статусов страниц: draft и hidden исключены из Office-навигации и Office runtime; published доступна при корректной привязке и is_visible.",
      impact:
        "Backend фильтрует runtime navigation по pages.status и navigation_items.is_visible; Office URL для draft/hidden возвращает 403; sidebar обновляется без F5 после смены статуса в Studio.",
      relatedContours: ["Designer Foundation", "Object Platform", "Navigation"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "platform-trash-bin",
      date: "2026-06-04",
      title: "Корзина платформы",
      type: "feature",
      description:
        "Двухэтапное удаление в Studio: soft delete (deleted_at, deleted_by), реестр «Корзина», восстановление и окончательное удаление с проверкой зависимостей.",
      impact:
        "Страницы, workspace, навигация и метаданные объектов попадают в корзину вместо немедленного hard delete; purge только из корзины.",
      relatedContours: ["Object Platform", "Designer Foundation"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "platform-trash-dependency-actions",
      date: "2026-06-05",
      title: "Dependency actions в Корзине платформы",
      type: "feature",
      description:
        "Добавлены централизованные dependency actions: «Открыть», «Удалить и очистить зависимости», «Удалить каскадно». Блокировка purge теперь показывает дерево зависимостей и подтверждение каскадного удаления.",
      impact:
        "Пользователь завершает удаление прямо в модальном окне: очистка ссылок и каскадное удаление выполняются без ручного обхода Studio-разделов.",
      relatedContours: ["Object Platform", "Designer Foundation"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "platform-trash-purge-modal-footer-simplify",
      date: "2026-06-05",
      title: "Упрощение footer модалки удаления зависимостей",
      type: "quality",
      description:
        "Удалена кнопка «Открыть зависимости» из footer; правый блок переименован в «Выбери сценарий действий»; вместо двух кнопок удаления — единая «Удалить» с выбором clear/cascade.",
      impact:
        "Studio → Корзина → модалка удаления: пользователь выбирает сценарий карточкой и подтверждает одной кнопкой «Удалить».",
      relatedContours: ["Designer Foundation", "PlatformModal", "Object Platform"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "platform-trash-purge-modal-actions-fix",
      date: "2026-06-05",
      title: "Исправление действий модалки удаления зависимостей",
      type: "quality",
      description:
        "Активированы кнопки «Открыть зависимости» и сценарии удаления; состояние модалки сохраняется в query params и восстанавливается после перехода к зависимости и возврата назад.",
      impact:
        "Studio → Корзина: пользователь не теряет контекст модалки при проверке зависимостей; выбранный сценарий clear/cascade сохраняется в URL.",
      relatedContours: ["Designer Foundation", "PlatformModal", "Object Platform"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "field-default-value-system",
      date: "2026-06-06",
      title: "Значение по умолчанию для пользовательских полей",
      type: "feature",
      description:
        "Реализован контракт default_value_json { type, value } в Field Definition: UI в свойствах поля Studio, валидация по типу поля, runtime-применение только при создании новой записи (ручной ввод имеет приоритет).",
      impact:
        "Studio → Тип объекта → Поля → Свойства поля → блок «Значение по умолчанию»; Office/Quick Create и runtime create подставляют defaults для новых записей без изменения существующих.",
      relatedContours: ["Object Platform", "Designer Foundation", "Runtime Entity"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "platform-trash-purge-modal-ux",
      date: "2026-06-05",
      title: "UX модалки удаления зависимостей (PlatformModal)",
      type: "quality",
      description:
        "Переработан интерфейс TrashPurgeModal: двухколоночная структура (зависимости / последствия), KPI-карточки, карточка удаляемого объекта, selectable-сценарии удаления, единая кнопка действия в footer, высота ~88vh.",
      impact:
        "Studio → Корзина → «Удалить окончательно» при зависимостях: пользователь видит структурированный сценарий выбора без «вертикальной простыни»; drag/resize/persist PlatformModal сохранены.",
      relatedContours: ["Designer Foundation", "PlatformModal", "Object Platform"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-card-comments-visibility",
      date: "2026-06-04",
      title: "Добавление управления видимостью комментариев в настройках карточки объекта",
      type: "quality",
      description:
        "В структуру presentation.card добавлен блок «Комментарии»; видимость управляет правой панелью комментариев. Исправлено сохранение скрытия/показа блока вкладок и восстановление полей в fieldsGrid после повторного включения.",
      impact:
        "Studio настраивает комментарии как остальные блоки карточки; состояние сохраняется в view contract и применяется в Office после Publish.",
      relatedContours: ["Object Card", "Object Platform"],
      relatedDebt: [],
      relatedAdr: "ADR-002",
    },
    {
      key: "studio-object-card-settings-restored",
      date: "2026-06-04",
      title: "Восстановление настроек карточки объекта в Studio",
      type: "quality",
      description:
        "В режиме таблицы «Все» (base state) шестерёнка настройки layout карточки снова доступна в Studio: сохранение идёт в опубликованное table-представление (default_table), в Office кнопка по-прежнему скрыта.",
      impact:
        "Конструктор может настраивать layout карточки из данных объекта без переключения на отдельное представление; runtime Office не получает Studio-инструменты.",
      relatedContours: ["Object Card", "Object Platform", "Publish"],
      relatedDebt: [],
      relatedAdr: "ADR-002",
    },
    {
      key: "adr-object-relation-field-instance-view",
      date: "2026-06-04",
      title: "ADR: поле «Связи» как представление над relation instances",
      type: "decision",
      description:
        "Принят ADR_OBJECT_RELATION_FIELD_AS_RELATION_INSTANCE_VIEW: поле «Связи» (field_type relation) управляет runtime_relation_instances по relation_key; запрещены lookup, value_json и copied title как источник истины.",
      impact:
        "Снимает архитектурную неопределённость перед реализацией типа поля; единый граф связей для карточки, таблицы и вкладки «Связанные записи».",
      relatedContours: ["Relations", "Object Type", "Runtime Entity", "Object Card"],
      relatedDebt: [],
      relatedAdr: "ADR-Object-Relation-Field",
    },
    {
      key: "relation-field-type-program-planned",
      date: "2026-06-04",
      title: 'Запланирован этап «Тип поля "Связи"» на Dashboard',
      type: "planning",
      description:
        "Запланирована реализация типа поля «Связи» на основе runtime_relation_instances. В manifest добавлена программа из 7 подэтапов (0%, PLANNED); активный — этап 1. Контракт поля.",
      impact:
        "Прогресс реализации relation field можно отслеживать по шагам без старта кода до закрытия контракта.",
      relatedContours: ["Relations", "Object Type", "Runtime Entity", "Object Card"],
      relatedDebt: [],
      relatedAdr: "ADR-Object-Relation-Field",
    },
  ],

  architectureDecisions: [
    {
      key: "adr-001",
      code: "ADR-001",
      title: "Object Platform Independence",
      date: "2026-05-29",
      status: "accepted",
      decision:
        "Старые таблицы не переносятся в новую объектную модель. Новые данные создаются только через object platform.",
      reason:
        "Двойной источник истины замедлял развитие и создавал риск расхождения между legacy и runtime.",
      impact:
        "Задаёт стратегическое направление платформы и определяет приоритет вывода Universal Table.",
      relatedContours: ["Object Platform", "Runtime Entity", "Object Card"],
      relatedDebt: ["Universal Table Retirement", "Object Runtime Separation"],
      relatedPhases: ["Object Platform Independence", "Legacy Removal"],
    },
    {
      key: "adr-002",
      code: "ADR-002",
      title: "Runtime / Designer Boundary",
      date: "2026-05-29",
      status: "accepted",
      decision:
        "Studio отвечает за настройку и публикацию типов объектов; runtime — за работу с записями в портале.",
      reason:
        "Размытая граница мешала понимать, что уже опубликовано и доступно пользователям портала.",
      impact:
        "Упрощает сопровождение публикаций и снижает риск скрытых зависимостей между Studio и runtime.",
      relatedContours: ["Object Type", "Publish", "Runtime Entity"],
      relatedDebt: ["Designer / Runtime Boundary", "Object Runtime Separation"],
      relatedPhases: ["Object Platform Independence", "Designer Foundation"],
    },
    {
      key: "adr-003",
      code: "ADR-003",
      title: "Quality Issue Registry as Product Control Layer",
      date: "2026-05-30",
      status: "accepted",
      decision:
        "Проблемы качества платформы ведутся в постоянном реестре и отображаются на Platform Dashboard.",
      reason:
        "Локальное состояние не позволяло владельцу продукта накапливать и отслеживать проблемы качества.",
      impact:
        "Dashboard становится рабочим инструментом контроля качества, а не статичной презентацией.",
      relatedContours: ["Object Platform"],
      relatedDebt: [],
      relatedPhases: ["Platform Dashboard v2"],
    },
    {
      key: "adr-004",
      code: "ADR-004",
      title: "Dashboard Manifest as Operational Source",
      date: "2026-05-30",
      status: "accepted",
      decision:
        "Архитектура, долг, фазы и история платформы на Dashboard v2 питаются из manifest до интеграции v3.",
      reason:
        "Нужен быстрый управленческий слой без ожидания полной backend-интеграции всех источников.",
      impact:
        "Владелец продукта видит целостную картину зрелости платформы уже на этапе Dashboard v2.",
      relatedContours: ["Object Platform"],
      relatedDebt: [],
      relatedPhases: ["Platform Dashboard v2"],
    },
    {
      key: "adr-005",
      code: "ADR-005",
      title: "Legacy Isolation before Legacy Removal",
      date: "2026-05-29",
      status: "accepted",
      decision:
        "Перед удалением legacy-контура он сначала изолируется и явно отделяется от новой платформы.",
      reason:
        "Резкое удаление legacy без изоляции создало бы риск для действующих portal-страниц.",
      impact:
        "Задаёт безопасную последовательность этапов Legacy Isolation → Legacy Removal.",
      relatedContours: ["Object Platform", "Publish"],
      relatedDebt: ["Legacy Block Isolation", "Universal Table Retirement"],
      relatedPhases: ["Legacy Isolation", "Legacy Removal"],
    },
    {
      key: "adr-object-relation-field",
      code: "ADR-Object-Relation-Field",
      title: "Object Relation Field as Relation Instance View",
      date: "2026-06-04",
      status: "accepted",
      decision:
        "Поле «Связи» (field_type relation) — UI-представление над runtime_relation_instances по relation_key; единственный SoT факта связи — таблица instances, не value_json и не lookup.",
      reason:
        "Relation engine уже есть; дублирование связи в поле привело бы к расхождению данных и блокировало граф, права и автоматизацию.",
      impact:
        "Определяет контракт publish, runtime read/write и UI для Studio/Office перед реализацией типа поля «Связи».",
      relatedContours: ["Relations", "Object Type", "Runtime Entity", "Object Card"],
      relatedDebt: [],
      relatedPhases: [
        "Object Platform Independence",
        "Designer Foundation",
        'Тип поля "Связи"',
      ],
    },
  ],
};
