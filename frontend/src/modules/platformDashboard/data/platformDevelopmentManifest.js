export const platformDevelopmentManifest = {
  updatedAt: "2026-05-30T14:35:00",

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
    targetPlatformPercent: 38,
    currentPhasePercent: 65,
    capabilities: [
      {
        name: "Модель объектов",
        status: "ready",
        percent: 85,
        businessMeaning:
          "Можно описывать типы объектов, публиковать их и работать с записями.",
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
      percent: 65,
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
  ],

  currentWork: {
    phase: "Независимость объектной платформы",
    focus:
      "Убираем последние скрытые связи новой платформы со старым табличным контуром.",
    items: [
      { label: "ADR-001 принят", status: "done" },
      { label: "Архитектурные документы согласованы", status: "done" },
      { label: "Карточка объекта отделена от Universal Table", status: "done" },
      { label: "Runtime Read Gateway cleanup", status: "next" },
      { label: "Notification legacy cleanup", status: "planned" },
    ],
  },

  achievements: [
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
    title: "Runtime Read Gateway Cleanup",
    titleLabel: "Очистка контура чтения данных",
    description:
      "Убрать неиспользуемый fallback на старые таблицы из контура чтения Object Views.",
    expectedResult:
      "Таблицы и представления объектов будут читать данные только через Runtime Entity API.",
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
        "Связи между объектами: описание в Studio и отображение связанных записей в runtime.",
      status: "in_progress",
      readiness: 55,
      dependencies: ["Object Type", "Runtime Entity", "Object Card"],
      risks: ["Неполное покрытие сценариев связей в UI"],
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
        "Контекст для AI: понимание типов объектов, связей и событий платформы компании.",
      status: "planned",
      readiness: 0,
      dependencies: ["Object Platform", "Relations", "Search"],
      risks: ["Слой не подключён", "Зависит от зрелости runtime-контура"],
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
      title: "AI-native Layer",
      description:
        "AI понимает объекты, связи и события платформы компании.",
      status: "planned",
      readiness: 0,
      ownerFocus:
        "Определить, какие данные платформы должны быть доступны AI-контексту.",
      result:
        "AI работает поверх объектной модели, а не разрозненных legacy-источников.",
      nextMilestone: "Согласован контур AI Context с архитектурой объектов.",
      linkedContours: ["AI Context", "Relations", "Search"],
      linkedDebt: [],
      keyWorks: [
        "Контур AI Context для типов объектов и связей",
        "Согласование событий платформы для AI",
        "Пилотный сценарий AI поверх object platform",
      ],
      risks: [
        "AI-слой зависит от зрелости runtime-контура",
        "Разрозненные источники данных снижают качество AI",
      ],
      completionCriteria: [
        "AI использует object platform как источник контекста",
        "Связи и события доступны для AI-сценариев",
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
        label: "Roadmap реализации на Dashboard",
        focus: "Показать этапы, фокус и критерии готовности в одном месте.",
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
  ],
};
