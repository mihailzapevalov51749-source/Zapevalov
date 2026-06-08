export const platformDevelopmentManifest = {
  updatedAt: "2026-06-09T02:00:00",

  title: "Развитие платформы ЯсноПро",

  currentPosition: {
    level: "Level 1 — Hybrid Architecture",
    levelLabel: "Переходный этап (1 из 5)",
    summary:
      "Платформа уже умеет работать с объектами и карточками, но старый табличный контур ещё выводится из системы.",
    strategicDecision:
      "Старые таблицы не переносим в новую модель. Новые данные создаются только через объектную платформу.",
    targetFlow:
      "Тип объекта → Публикация (Runtime) → [Навигация / вкладки пространства] → Запись → Вкладка объекта",
  },

  readiness: {
    targetPlatformPercent: 40,
    currentPhasePercent: 70,
    capabilities: [
      {
        name: "Модель объектов",
        status: "ready",
        percent: 90,
        businessMeaning:
          "Публикация объекта отделена от навигации; пространства открывают конкретные вкладки объекта.",
      },
      {
        name: "Представления",
        status: "ready",
        percent: 85,
        businessMeaning:
          "Табличный вид, фильтры, персональные представления и рабочая вкладка «План» с inline-редактированием ключевых полей.",
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
      percent: 68,
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
        status: "planned",
      },
      {
        label: "Архитектура представлений — этап 2: Projection UI",
        status: "done",
      },
      {
        label: "Архитектура представлений — этап 4: Runtime dual-read",
        status: "done",
      },
      {
        label: "Архитектура представлений — этап 5: Очистка legacy",
        status: "next",
      },
    ],
  },

  achievements: [
    {
      date: "2026-06-09",
      text:
        "Action Engine: Target Object для create_record — Action Definition хранит target_object_type_id; форма и executor создают запись в целевом объекте (например, Проект → Создать задачу → Задачи).",
    },
    {
      date: "2026-06-08",
      text:
        "Action Engine: Executor create_record — Runtime Action Form создаёт запись через runtimeWriteGateway.createEntity и submitPendingRelationLinks; top_panel и row_menu обновляют таблицу через runtimeEntityDataReloadBridge.",
    },
    {
      date: "2026-06-09",
      text:
        "Plan View Studio/Office parity: вкладка Инфо в Office снова использует ту же plan info grid, что и Studio preview; inline-edit через PlanInfoFieldValue внутри сетки (без entity card layout RuntimeFieldCell).",
    },
    {
      date: "2026-06-09",
      text:
        "Plan View: inline-редактирование перенесено из левого дерева в правую карточку (вкладка Инфо); дерево восстановлено как навигационное (название / готовность / статус); persistRuntimeEntityFieldUpdate.",
    },
    {
      date: "2026-06-08",
      text:
        "Plan Inline Editing audit: устранён регресс запуска frontend — FieldValueRenderer импортируется из shared/fieldTypes (как ViewEngineCell), не из несуществующего fieldEditors.",
    },
    {
      date: "2026-06-08",
      text:
        "Plan View: inline-редактирование ключевых полей в дереве (статус, ответственный, приоритет, срок, % готовности) через общий runtime update pipeline с Object Table; optimistic patch без сброса раскрытия дерева.",
    },
    {
      date: "2026-06-08",
      text:
        "Action Engine V1: в Studio → Object Type добавлены системные вкладки «Действия» и «Правила» (/actions, /rules) между «Вкладки» и «Предпросмотр»; заглушки ObjectActionsTab / ObjectRulesTab — задел под Event → Rule → Action Engine.",
    },
    {
      date: "2026-06-07",
      text:
        "Платформенное ядро: утверждена целевая модель Object Tab = Projection + Query + View Settings для Table/Plan/Card/Kanban/Calendar/Tree/Diagram; матрица отклонений и roadmap этапов 0–6 в docs/architecture/OBJECT_VIEW_ARCHITECTURE.md v1.1.",
    },
    {
      date: "2026-06-08",
      text:
        "Платформенное ядро: этап 1 — контракт представлений: roleMapping в ObjectViewContract (draft/save/publish/catalog); publish validation; dual-read adapter для Plan; docs/architecture/OBJECT_VIEW_CONTRACT.md.",
    },
    {
      date: "2026-06-08",
      text:
        "Платформенное ядро: этап 2 — единый Projection UI (ObjectProjectionPanel) для Table/Plan/Form/Card/List в Studio; Plan получил блок Projection над настройками Плана.",
    },
    {
      date: "2026-06-08",
      text:
        "Платформенное ядро: этап 3 — универсальный ObjectRoleMappingPanel; Plan: Role Mapping UI (nodeTitle/nodeStatus/nodeDescription/nextSteps); legacy *FieldKey сохранены; runtime без изменений.",
    },
    {
      date: "2026-06-08",
      text:
        "Платформенное ядро: этап 4 — Plan runtime dual-read: resolvePlanRoleMappingDualRead в ObjectPlanView/buildPlanTree; приоритет roleMapping → legacy → fallback; обратная совместимость сохранена.",
    },
    {
      date: "2026-06-08",
      text:
        "Plan Tree Visual Polish: контрастные заголовки колонок, глобальное раскрытие/сворачивание (Chevron в шапке), удалён GripVertical, единый gap 8px в строке; логика дерева без изменений.",
    },
    {
      date: "2026-06-07",
      text: 'Object Platform: представление «План» (view_type=plan) — иерархия экземпляров по relation, дерево + детали, готовность по статусам, следующие шаги, опциональные проблемы; Studio → Object Type → Tabs → План; Office → вкладка План; Preview на mock-данных.',
    },
    {
      date: "2026-06-07",
      text: "Object Actions Menu: меню «…» в шапке типа объекта (Studio → Object Type) снова открывается; пункты Переименовать / Дублировать / Удалить; удаление через модалку с delete-preview (вкладки, представления, связи, навигация, пространства).",
    },
    {
      date: "2026-06-07",
      text: "Create Relation Modal UX: фиксированный footer PlatformModal [Отмена][Создать связь], scroll только в body, minHeight 480px; Studio → Object Type → Relations → Создать связь.",
    },
    {
      date: "2026-06-07",
      text: "Create Field Modal: «Значение по умолчанию» доступно при создании поля — переиспользован DefaultValueEditor и default_value_json сохраняется сразу; Studio → Object Type → Fields → Добавить поле.",
    },
    {
      date: "2026-06-07",
      text: "Object Publish vs Navigation: публикация объекта больше не добавляет его в меню автоматически; флаг «Отображать в навигации» (default Нет) + миграция для существующих объектов в navigation_items.",
    },
    {
      date: "2026-06-07",
      text: "Workspace Object View Tab: вкладка пространства типа «Объект» ссылается на object_type_id + object_view_id; runtime открывает конкретную опубликованную вкладку объекта без tab-bar объекта.",
    },
    {
      date: "2026-06-06",
      text: "Excel Import Default Values: обязательные поля на шаге «Колонки» — источник «Колонка Excel» или «Значение по умолчанию» (пользователь, статус, список, текст, число, дата); Office → Object → Импорт Excel.",
    },
    {
      date: "2026-06-06",
      text: "Excel Import Value Mapping: шаг «Сопоставление значений» для статусов, списков и пользователей; автопропуск при точном match, ручное сопоставление нераспознанных значений; Office → Object → Импорт Excel.",
    },
    {
      date: "2026-06-06",
      text: "Excel Import Wizard UX (clean): шапка «Импорт Excel / объект», stepper ①–④, компактная dropzone, [Отмена][Далее →] справа; .xlsx только в notification при неверном файле.",
    },
    {
      date: "2026-06-06",
      text: "Excel Import Wizard UX (compact): компактная модалка и dropzone, иконка Excel, платформенные кнопки, «Далее →»; Office → Object Menu → Импорт Excel.",
    },
    {
      date: "2026-06-06",
      text: "Excel Import Wizard UX: шаг «Файл» — stepper 4 этапов, drag-and-drop, карточка файла, статистика листа, badge-колонки, «Далее →»; Office → Object Menu → Импорт Excel.",
    },
    {
      date: "2026-06-06",
      text: "Excel Import (MVP): Office → «Название объекта ▾ → Импорт Excel» — мастер из 4 шагов, создание новых записей через runtime_entity (chunk 50), без Universal Tables; недоступен в Studio Preview.",
    },
    {
      date: "2026-06-06",
      text: "Excel Export UX: колонка «Иерархия» после «№» вместо «Иерархический №»; расчёт hierarchyNumber без изменений.",
    },
    {
      date: "2026-06-06",
      text: "Excel Export: иерархия (tree order, все узлы) и человекочитаемые списки/статусы (key → label из settings_json.options).",
    },
    {
      date: "2026-06-06",
      text: "Studio Preview: badge «Демо-данные» в toolbar таблицы — компактное warning-уведомление вместо строки над таблицей; только studio-preview.",
    },
    {
      date: "2026-06-06",
      text: "Studio Object Type Header: иконка объекта совпадает с Office — единый ObjectTypeIcon и mergeObjectTypeAppearance с navigation fallback.",
    },
    {
      date: "2026-06-06",
      text: "Studio Preview: демонстрационные строки вместо runtime records — mock data по схеме объекта, без загрузки реальных записей в Studio.",
    },
    {
      date: "2026-06-06",
      text: "Studio Preview UX: dropdown «Предпросмотр ▾» в tab-bar; на странице — имя вкладки, тип, платформенный статус и «Используется» только в Офис.",
    },
    {
      date: "2026-06-06",
      text: "Studio: вкладка «Предпросмотр» — dropdown выбора вкладки объекта, статус вкладки и блок «Используется»; preview-only через ObjectViewHost.",
    },
    {
      date: "2026-06-06",
      text: "Studio: вкладка «Предпросмотр» — бизнес-контекст (используется, статус, отображается) вместо технических runtime-строк.",
    },
    {
      date: "2026-06-06",
      text: "Object Table Studio Preview: визуальный паритет с Office — иерархия, tree toggle, нумерация; режим «Предпросмотр» без изменения данных.",
    },
    {
      date: "2026-06-06",
      text: "Object Table: раскрытие дерева перенесено в колонку чекбокса — [checkbox][tree toggle] в шапке и строках; глобальное раскрытие/сворачивание через expandedRowIds.",
    },
    {
      date: "2026-06-06",
      text: "Object Table: иерархический номер в Title Field — зоны меню/раскрытия/номера/названия, приоритет hierarchyNumber, hover-меню без сдвига строки.",
    },
    {
      date: "2026-06-06",
      text: "Object Platform: MVP-экспорт Excel из контекстного меню объекта — текущее табличное представление (колонки, фильтры, сортировка), читаемые значения полей, до 10 000 записей.",
    },
    {
      date: "2026-06-06",
      text: "Object Platform: контекстное меню объекта в шапке (Название ▾) — единая точка управления объектом; MVP-пункты Импорт/Экспорт Excel с расширяемым registry действий.",
    },
    {
      date: "2026-06-06",
      text: "Object Table: MVP-фильтрация по полям типа «Связь» — выбор связанной записи в модалке фильтров, операторы eq/neq/is_empty/is_not_empty, backend через runtime_relation_instances.",
    },
    {
      date: "2026-06-05",
      text: "Object Table: многоколоночная сортировка — несколько уровней ORDER BY, панель «Сортировки», Shift+клик, сохранение в Object View.",
    },
    {
      date: "2026-06-05",
      text: "Dashboard: правая панель этапа показывает сводку задач, следующие задачи, блок «В работе» и выполненные задачи с весами и раскрываемыми списками.",
    },
    {
      date: "2026-06-05",
      text: "Dashboard: в этап «Переход на объектную платформу» добавлены остаточные работы по аудиту Universal Tables vs Object Table (19 шагов, P0–P3).",
    },
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
      date: "2026-06-08",
      version: null,
      title: "Object Type: вкладки «Действия» и «Правила»",
      summary:
        "Studio → Object Type: маршруты /actions и /rules, компоненты ObjectActionsTab / ObjectRulesTab (заглушки); порядок вкладок — между «Вкладки» и «Предпросмотр»; задел под Action Engine и Rule Engine.",
      nextStage: "CRUD Action Definition и Rule Definition в новых вкладках",
    },
    {
      date: "2026-06-07",
      version: null,
      title: "Bugfix: поле «Связь» — auto role/cardinality",
      summary:
        "Create Field Modal: роль и кардинальность relation field определяются автоматически по relation definition; убран ручной выбор роли; 422 settings_json.role больше не воспроизводится через UI.",
      nextStage: "Проверить self-relation и many_to_many на двух полях одного объекта",
    },
    {
      date: "2026-06-07",
      version: null,
      title: "Studio Relations: убран технический блок про граф",
      summary:
        "Со страницы «Связи» удалено сообщение «Граф связей в MVP отключён. Источник: …» — остаются заголовок, счётчик, кнопка «Добавить связь» и таблица.",
      nextStage: "Relation graph — отдельная фича без MVP-заглушки в UI",
    },
    {
      date: "2026-06-07",
      version: null,
      title: "Create Relation Modal: footer [Отмена][Создать связь]",
      summary:
        "Модалка создания связи: фиксированный footer PlatformModal, scroll в body, minHeight 480px, сброс persist key v3; кнопка «Создать связь» всегда видна справа от «Отмена».",
      nextStage: "Проверить на маленьком экране и после resize модалки",
    },
    {
      date: "2026-06-07",
      version: null,
      title: "Create Field Modal: значение по умолчанию при создании",
      summary:
        "Модалка «Добавить поле» переиспользует DefaultValueEditor; default_value_json сохраняется вместе с полем без повторного открытия панели свойств.",
      nextStage: "Проверить сценарии список/статус/число и смену типа поля",
    },
    {
      date: "2026-06-07",
      version: null,
      title: "Bugfix: workspace «Разработка» — миграция object_view_id",
      summary:
        "ensure-tabs падал с UndefinedColumn: колонка object_view_id отсутствовала (миграция 20260607_0017 не применена). Исправлен backfill JOIN (varchar object_type_id → ::uuid).",
      nextStage: "Перезапустить backend после alembic upgrade head",
    },
    {
      date: "2026-06-07",
      version: null,
      title: "Bugfix: backend startup (NavigationItemResponse import)",
      summary:
        "В navigation/enrichment.py добавлен импорт NavigationItemResponse из schemas — backend снова стартует после доработки show_in_navigation.",
      nextStage: "Проверить login и /users/me после перезапуска backend",
    },
    {
      date: "2026-06-07",
      version: null,
      title: "Публикация объекта и навигация разделены",
      summary:
        "Новый флаг «Отображать в навигации» в настройках типа объекта; публикация переносит объект в Runtime без автоматического пункта меню; размещение в меню — отдельный сценарий «Разместить в меню».",
      nextStage: "Проверить сценарий «Разработка» с объектами без навигации",
    },
    {
      date: "2026-06-07",
      version: null,
      title: "Вкладки пространства → вкладки объекта",
      summary:
        "Вкладка пространства типа «Объект» хранит object_view_id; Studio показывает выбор опубликованной вкладки объекта; миграция backfill для существующих object-вкладок.",
      nextStage: "Kanban/board представления для сценария «Карта платформы»",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Excel Export: колонка «Иерархия» после «№»",
      summary:
        "Заголовок «Иерархический №» заменён на «Иерархия»; порядок системных колонок: № → Иерархия → название; логика hierarchyNumber и tree order без изменений.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Excel Export: иерархия и человекочитаемые списки",
      summary:
        "Экспорт сохраняет tree order и колонку «Иерархический №» (все узлы, включая свёрнутые); списки и статусы экспортируются как label из fieldDef.settings.options, не key.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Studio Preview: badge демо-данных в toolbar",
      summary:
        "Строка «Показаны демонстрационные данные» убрана; компактный warning-badge «Демо-данные» по центру панели таблицы с tooltip; только mode=studio-preview.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Studio: иконка объекта в шапке workspace",
      summary:
        "Шапка Object Type в Studio использует тот же резолв иконки, что Office: icon_type/icon_file_url из object type + display_* из меню через mergeObjectTypeAppearance; ObjectTypeIcon без дефолтной папки при настроенной иконке.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Studio Preview: демонстрационные данные",
      summary:
        "Предпросмотр в Studio показывает 7 mock-строк по типам полей и mock-иерархию; runtime/query для строк не вызывается; Office без изменений.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Studio Preview: dropdown в tab-bar и office-only usage",
      summary:
        "«Предпросмотр ▾» перенесён в tab-bar объекта; страница показывает компактное имя вкладки, тип, designer-pages-badge статус и маршруты только Офис.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Studio: предпросмотр выбранной вкладки объекта",
      summary:
        "Вкладка «Предпросмотр ▾» переключает вкладки из раздела «Вкладки»; показываются название, компактный статус и «Используется»; поле «Отображается» убрано.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Studio: бизнес-контекст вкладки «Предпросмотр»",
      summary:
        "Runtime Preview переименован в «Предпросмотр»; технические endpoint-строки заменены блоком: используется, статус, отображается.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Object Table: Studio Preview parity с Office",
      summary:
        "Studio Runtime Preview использует тот же ViewEngine render path: иерархия, tree toggle, hierarchyNumber; чекбоксы и меню строки видны, но изменение данных заблокировано; метка «Предпросмотр».",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Bugfix: Object Table — глобальное раскрытие дерева",
      summary:
        "Tree toggle в шапке раскрывает всё дерево из полностью свернутого состояния: expandableRowIds строится по childrenByParent и полному flatRows, а не по видимым displayRows.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Object Table: раскрытие дерева в колонке чекбокса",
      summary:
        "Первая служебная колонка объединяет выбор строки и раскрытие дерева; в шапке — глобальный tree toggle (expandAll/collapseAll через expandedRowIds); Title Field без отдельной зоны раскрытия.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Object Table: иерархический номер в Title Field",
      summary:
        "Title Field выровнен по зонам: hover-меню ⋮ (24px), раскрытие дерева (20px), иерархический номер (hierarchyNumber с fallback), название; колонка № (record_number) без изменений.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Bugfix: Excel Export — Runtime query 422",
      summary:
        "Экспорт больше не отправляет limit=500 (Runtime API допускает до 200); сортировка использует тот же mapper, что Object Table; при отклонении sort — fallback без сортировки.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Object Platform: экспорт Excel (MVP)",
      summary:
        "Пункт «Экспорт Excel» в контекстном меню объекта выгружает текущее табличное представление: видимые колонки и порядок, фильтры, сортировка, читаемые значения пользователей/статусов/связей/дат/ссылок; источник — Object Platform runtime.",
      nextStage: "Реализовать импорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Object Platform: контекстное меню объекта",
      summary:
        "В шапке runtime-объекта добавлено меню «Название ▾» между иконкой и вкладками: архитектура Object Context Menu, пункты Импорт/Экспорт Excel (заглушки до реализации обмена).",
      nextStage: "Реализовать экспорт Excel",
    },
    {
      date: "2026-06-06",
      version: null,
      title: "Object Table: фильтрация по связям (MVP)",
      summary:
        "В фильтрах Object Table доступны поля типа «Связь»: операторы равно / не равно / заполнено / не заполнено, выбор связанной записи по названию; backend фильтрует через runtime_relation_instances.",
      nextStage: "Реализовать перетаскивание строк",
    },
    {
      date: "2026-06-05",
      version: null,
      title: "Object Platform: тип поля «Ссылка»",
      summary:
        "Добавлен field_type=link: создание в Studio, URL в карточке и таблице, безопасное открытие http/https, фильтрация и сортировка как у текста.",
      nextStage: "Реализовать фильтрацию по связям",
    },
    {
      date: "2026-06-05",
      version: null,
      title: "Object Platform: чек-лист в карточке объекта",
      summary:
        "В карточке runtime-объекта добавлена вкладка «Чек-лист» (добавление через Enter, checkbox, редактирование, удаление, прогресс, бейдж); привязка entity_type=runtime_entity.",
      nextStage: "Реализовать фильтрацию по связям",
    },
    {
      date: "2026-06-05",
      version: null,
      title: "Object Table: многоколоночная сортировка",
      summary:
        "Object View поддерживает несколько уровней сортировки (query.sort.rules), runtime API sorts[], панель управления и Shift+клик по заголовкам; старые представления совместимы.",
      nextStage: "Реализовать чек-листы в карточке",
    },
    {
      date: "2026-06-05",
      version: null,
      title: "Dashboard: улучшение отображения этапов",
      summary:
        "Правая панель выбранного этапа показывает выполненные, текущие и оставшиеся задачи с весами, раскрываемые секции «Следующие задачи», «В работе» и «Выполненные задачи»; расчёт готовности не изменён.",
      nextStage: null,
    },
    {
      date: "2026-06-05",
      version: null,
      title: "Dashboard: остаточные работы UT → Object Table",
      summary:
        "В этап «Переход на объектную платформу» добавлены 19 шагов закрытия функциональных пробелов Object Table (миграция legacy, чек-листы, multi-sort, фильтры по связям, режим дерева, Excel и др.) с весами P0–P3.",
      nextStage: "Завершить перевод legacy страниц на объектную платформу",
    },
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
    title: "Архитектура представлений — этап 6: Финальная унификация",
    titleLabel: "Активная программа платформенного ядра",
    description:
      "Runtime adapters для board/calendar/tree; единый ObjectViewHost; Studio gate для неготовых view types.",
    expectedResult:
      "Все целевые представления следуют Projection + Query + View Settings.",
  },

  objectViewArchitectureProgram: {
    title: "Архитектура представлений объектов",
    parentStage: "Платформенное ядро",
    status: "IN_PROGRESS",
    readiness: 99,
    doc: "docs/architecture/OBJECT_VIEW_CONTRACT.md",
    docVersion: "1.0",
    activeSubPhaseKey: "object-view-architecture-unification",
    currentStatus:
      "Plan View: дерево слева — навигация и индикаторы; inline-редактирование полей — только на вкладке Инфо справа (RuntimeFieldCell + persistRuntimeEntityFieldUpdate).",
    nextStage: "Этап 6 — Финальная унификация",
    planLegacyDeprecationMetrics: {
      title: "Plan Views",
      viaRoleMapping: "usesLegacyPlanFields: false",
      viaLegacy: "usesLegacyPlanFields: true",
      diagnosticFlag: "presentation.plan.usesLegacyPlanFields",
      note:
        "Диагностический флаг при publish; runtime dual-read не изменён. Метрика готовности к отключению legacy.",
    },
    planLegacyUsageAudit: {
      title: "Plan Legacy Usage",
      auditedAt: "2026-06-07T09:51:17+00:00",
      catalogVersion: 69,
      auditScript: "backend/scripts/audit_plan_legacy_usage.py",
      publishScript: "backend/scripts/publish_tenant_catalog_cli.py",
      migrationAssistant: "generatePlanRoleMappingFromLegacy + Studio кнопка",
      total: 1,
      roleMappingReady: 1,
      legacyDependent: 0,
      viaRoleMapping: 1,
      viaLegacy: 0,
      mixedPlans: 0,
      legacyKeysInSnapshot: 0,
      mixed: 0,
      legacyOnly: 0,
      fallbackOnly: 0,
      duplicateRoleMappingAndLegacy: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 1,
      legacyPercent: 0,
      removalReadinessPercent: 100,
      stage5BRecommendation: "Этап 5B завершён",
      stage5CRecommendation: "Этап 5C.2 завершён",
      stage5DRecommendation: "Этап 5D.2 завершён",
      stage5ERecommendation: "Этап 5E завершён",
      stage5FRecommendation: "Этап 5F завершён",
    },
    planUiCleanup: {
      title: "Plan Settings UI Cleanup",
      completedAt: "2026-06-07T14:00:00+00:00",
      catalogVersion: 69,
      legacyControlsVisible: 0,
      migrationControlsVisible: 0,
      planSettingsSimplified: true,
      removedFromStudioUi: [
        "titleFieldKey picker",
        "statusFieldKey picker",
        "descriptionFieldKey picker",
        "nextStepsFieldKey picker",
        "Legacy field markers",
        "Legacy / dual-read / Migration user-facing copy",
      ],
      preservedInDraft: [
        "titleFieldKey",
        "statusFieldKey",
        "descriptionFieldKey",
        "nextStepsFieldKey",
      ],
      planSettingsRemaining: [
        "hierarchyRelationKey",
        "issuesRelationKey",
      ],
      migrationAssistant: {
        utility: "shouldShowPlanRoleMappingMigrationAssistant",
        visibleWhen: "roleMapping empty AND legacy draft keys present",
        hiddenWhen: "roleMapping filled",
        codePreserved: "generatePlanRoleMappingFromLegacy",
      },
      projectionTitleFieldRecommendation: "keep — object-type entity display layer; nodeTitle is Plan-view role",
    },
    planInlineFieldEditing: {
      title: "Plan Inline Field Editing",
      completedAt: "2026-06-09T00:00:00+00:00",
      auditCompletedAt: "2026-06-08T24:00:00+00:00",
      location: "Plan Info tab (right card) — not left tree",
      startupRegressionFix:
        "FieldValueRenderer path corrected to shared/fieldTypes/FieldValueRenderer",
      catalogVersion: 69,
      sharedPipeline: "persistRuntimeEntityFieldUpdate → runtimeWriteGateway.updateEntity",
      uiComponent: "RuntimeFieldCell (exported from ObjectEntityCardFieldsGrid)",
      hook: "usePlanInfoFieldSave",
      treeSync: "applyPlanEntityPatches — left tree reflects saved values without editors",
      removedFromTree: [
        "PlanInlineFieldCell",
        "planTreeGrid dynamic columns",
        "resolvePlanInlineEditableFields",
      ],
      tableRefactor: "useObjectTableInlineEdit uses same persist helper",
    },
    planTreeVisualPolish: {
      title: "Plan Tree Visual Polish",
      completedAt: "2026-06-08T18:00:00+00:00",
      catalogVersion: 69,
      columnHeaders: {
        contrast: "#0f172a",
        fontSizePreserved: "10px uppercase",
      },
      globalExpandCollapse: {
        control: "ChevronRight / ChevronDown in column header",
        position: "left of Название",
        wiring: "handleToggleExpandAll via existing expand/collapse handlers",
      },
      rowLayout: {
        removedElement: "GripVertical drag handle icon",
        uniformGap: "8px",
        structure: "toggle → icon → number → title",
        verticalAlign: "align-items: center on row and columns",
      },
      dataLogicUnchanged: true,
    },
    planUiReferenceLayout: {
      title: "Plan UI — Reference Layout",
      completedAt: "2026-06-07T16:00:00+00:00",
      referenceDriven: true,
      layout: "tree + resizable work area",
      treeFeatures: [
        "hierarchy numbering (1, 1.1, 1.2)",
        "compact columns: Название / Готовность / Статус",
        "context menu (ПКМ)",
        "resize handle 280-600px with localStorage",
      ],
      workAreaTabs: [
        "Инфо",
        "Комментарии",
        "История",
        "Файлы",
        "Задачи",
      ],
      infoTab: "Projection + Role Mapping + Runtime Entity fields",
      dataArchitecture: "unchanged — no new tables/API",
      components: [
        "PlanViewShell",
        "PlanTreePanel",
        "PlanWorkArea",
        "PlanInfoTab",
        "PlanTreeContextMenu",
      ],
    },
    planStatusDisplayBugfix: {
      title: "Plan status display uses object field settings",
      completedAt: "2026-06-07T15:00:00+00:00",
      resolver: "resolvePlanFieldDisplayValue",
      choiceResolver: "normalizeChoiceValue (choiceUtils)",
      fieldSource: "catalog object type field settings_json.options",
      statusFieldKey: "roleMapping.nodeStatus → status",
      fixedSymptoms: [
        "option_1780780345... shown instead of Не начато",
        "parent Активное replaced by rollup Не начато",
      ],
      ownStatusLabelSeparatedFromRollup: true,
      rollupPreservedFor: ["readiness", "statusCategory", "rollupStatusCategory"],
      tests: [
        "planFieldUtils.test.js",
        "buildPlanTree.test.js — option key → label, parent label preserved",
      ],
    },
    entityTitleArchitecture: {
      title: "Entity Title Architecture",
      completedAt: "2026-06-07T13:33:00+00:00",
      resolver: "resolveEntityDisplayTitle",
      titleFieldResolver: "resolveEntityTitleFieldKey",
      auditScript: "frontend/scripts/auditEntityTitleFallbacks.mjs",
      runtimeTitleFallbacks: 0,
      entityTitleResolverCoverage: "object-platform-runtime",
      componentsMigrated: 9,
      removedFallbacks: ["F7 resolvePlanEntityTitle", "title||name entity chain"],
      migratedComponents: [
        "ObjectPlanView Issues Panel",
        "RelationFieldPeerSelect",
        "RelationFilterPeerSelect",
        "ObjectEntityRelatedEntities",
        "HierarchyChildRelationsGroup",
        "mapRelationInstancesToGroups",
        "mapRuntimeEntityToCardModel",
        "resolveParentContextFromRelations",
        "resolveSubtasksFromRelations",
      ],
      resolutionChain: "Projection.titleFieldKey → Object Type Title Field → [id]",
      remainingOutOfScope: [
        "shared/shell/header (portal navigation)",
        "modules/universalTable (legacy)",
        "backend platform search API",
      ],
    },
    planLegacyDualReadRemoval: {
      title: "Plan Legacy Dual-Read Removal",
      completedAt: "2026-06-07T13:25:00+00:00",
      catalogVersion: 69,
      legacyDualReadTier: "removed",
      planRuntimeSource: "roleMapping only",
      runtimeLegacyReferences: 0,
      resolver: "resolvePlanRoleMapping",
      deprecatedAlias: "resolvePlanRoleMappingDualRead",
      buildPlanTreeF8: "EMPTY_PLAN_ROLE_MAPPING when planRoleMapping omitted",
      studioLegacyPreserved: true,
      migrationAssistantPreserved: true,
      publishDiagnosticPreserved: true,
      issuesPanelF7Preserved: true,
    },
    planLegacyDualReadAudit: {
      title: "Plan Legacy Dual-Read Audit",
      auditedAt: "2026-06-07T10:17:32+00:00",
      catalogVersion: 69,
      auditScript: "backend/scripts/audit_plan_legacy_dual_read_usage.py",
      publishedLegacyPlans: 0,
      legacyKeysInSnapshot: 0,
      publishedPlansWithoutRoleMapping: 0,
      runtimeLegacyReferences: 5,
      testsDependingOnLegacy: 2,
      draftPlanCount: 1,
      draftWithLegacyKeys: 1,
      draftRuntimeDependency: false,
      studioPreviewUsesLegacyTier: false,
      canRemoveLegacyTier: "yes_after_tests",
      recommendationCategory: "B",
      recommendation:
        "Да, runtime не использует legacy tier; legacy tier — тесты и F8 safety path",
      usageTable: [
        {
          area: "Published Runtime",
          usesLegacyTier: false,
          canRemove: true,
          comment: "Office → published catalog v69; roleMapping-only",
        },
        {
          area: "Studio Preview",
          usesLegacyTier: false,
          canRemove: true,
          comment: "buildPlanPreviewMock(); дерево не читает dual-read",
        },
        {
          area: "Draft",
          usesLegacyTier: true,
          canRemove: true,
          comment: "Legacy keys в Studio draft; Office runtime draft не читает",
        },
        {
          area: "Tests",
          usesLegacyTier: true,
          canRemove: true,
          comment: "resolvePlanRoleMapping.test.js + buildPlanTree.test.js",
        },
        {
          area: "Dev scripts",
          usesLegacyTier: true,
          canRemove: true,
          comment: "Migration assistant; не Office runtime",
        },
      ],
      draftLegacyPreserved: {
        titleFieldKey: "nazvanie",
        descriptionFieldKey: "opisanie",
      },
    },
    planRuntimeFallbackAudit: {
      title: "Plan Runtime Fallback Audit",
      auditedAt: "2026-06-08T12:00:00+00:00",
      completedAt: "2026-06-07T13:10:00+00:00",
      catalogVersion: 69,
      planTreeFallbackCount: 0,
      planTreeRuntimeSource: "roleMapping only",
      totalFallbackMechanisms: 2,
      roleMappingChainFallbacks: 0,
      removedIn5C2: ["F1", "F2", "F3", "F4", "F5", "F6"],
      usedInPublishedPlanTree: 0,
      usedInStudioPreview: 0,
      usedInUnitTests: 0,
      usedInIssuesPanel: 1,
      remainingFallbacks: ["F8"],
      cannotRemoveWithoutAdr: ["buildPlanTree safety path (EMPTY_PLAN_ROLE_MAPPING)"],
      stage5C2Status: "DONE",
      stage5C2Result:
        "F1–F6 удалены; dual-read roleMapping → legacy; Issues panel F7 сохранён",
      registry: [
        {
          id: "F8",
          name: "buildPlanTree internal dual-read",
          file: "buildPlanTree.js",
          category: "B",
          publishedRuntime: false,
          note: "Safety path when planRoleMapping omitted; legacy tier, not field fallback",
        },
      ],
      publishedSnapshotConfirmed: {
        roleMapping: {
          nodeTitle: "nazvanie",
          nodeStatus: "status",
          nodeDescription: "opisanie",
        },
        usesLegacyPlanFields: false,
        legacyInSnapshot: {},
      },
      draftLegacyPreserved: {
        titleFieldKey: "nazvanie",
        descriptionFieldKey: "opisanie",
      },
      registry: [
        {
          id: "463d34a1-9a4b-43e0-81e7-81c923173051",
          workspace: "Разработка",
          object: "Направления (napravleniya)",
          tab: "Архитектура (arhitektura)",
          usesLegacyPlanFields: false,
          roleMapping: {
            nodeTitle: "nazvanie",
            nodeStatus: "status",
            nodeDescription: "opisanie",
          },
          legacy: {},
          category: "roleMapping",
          risk: "low",
        },
      ],
    },
    risks: [
      "Plan: legacy titleFieldKey/statusFieldKey/descriptionFieldKey дублируют Projection",
      "Card: sections.fieldKeys без обязательной привязки к projection",
      "Studio: нерабочие view types (board, calendar, tree, card tab)",
      "legacy universalTable title/name (вне object platform)",
      "Две модели иерархии: Table tree-mode vs Plan",
    ],
    stages: [
      {
        key: "object-view-architecture-docs",
        number: 0,
        title: "Документация",
        status: "DONE",
        readiness: 100,
        steps: [
          "Аудит всех представлений",
          "Матрица Projection / Query / View Settings",
          "Утверждённая целевая архитектура v1.1",
          "Roadmap этапов 0–6",
        ],
        completionCriterion:
          "OBJECT_VIEW_ARCHITECTURE.md содержит матрицу, отклонения, legacy, roadmap.",
      },
      {
        key: "object-view-architecture-contract",
        number: 1,
        title: "Контракт представлений",
        status: "DONE",
        readiness: 100,
        steps: [
          "roleMapping в ObjectViewContract (draft/save/publish/catalog)",
          "Publish validation: projection + roleMapping ⊆ projection",
          "Dual-read adapter resolvePlanRoleMappingDualRead",
          "OBJECT_VIEW_CONTRACT.md",
        ],
        completionCriterion:
          "Контракт хранит roleMapping; publish валидирует; legacy keys сохранены; runtime не изменён.",
      },
      {
        key: "object-view-architecture-projection",
        number: 2,
        title: "Projection для всех view types",
        status: "DONE",
        readiness: 100,
        steps: [
          "ObjectProjectionPanel — единый UI для всех Studio view types",
          "Plan: Projection над настройками Плана",
          "resolveStudioDraftProjection + scaffold для form/card/list",
        ],
        completionCriterion:
          "Table/Plan/Form/Card/List используют единый Projection UI; fieldKeys сохраняются в контракт.",
      },
      {
        key: "object-view-architecture-role-mapping",
        number: 3,
        title: "Role Mapping",
        status: "DONE",
        readiness: 100,
        steps: [
          "ObjectRoleMappingPanel — универсальный компонент платформы",
          "Plan: nodeTitle/nodeStatus/nodeDescription/nextSteps pickers",
          "syncViewSettingsRoleMapping + Studio validation",
        ],
        completionCriterion:
          "Role Mapping настраивается в Studio и публикуется; legacy *FieldKey сохранены; runtime не изменён.",
      },
      {
        key: "object-view-architecture-dual-read",
        number: 4,
        title: "Runtime dual-read",
        status: "DONE",
        readiness: 100,
        steps: [
          "resolvePlanRoleMappingDualRead в ObjectPlanView",
          "buildPlanTree/usePlanHierarchy через planRoleMapping",
          "Приоритет roleMapping → legacy",
        ],
        completionCriterion:
          "Plan runtime читает единый planRoleMapping; старые вкладки работают через legacy.",
      },
      {
        key: "object-view-architecture-legacy-deprecation",
        number: "5A",
        title: "Plan Legacy Deprecation",
        status: "DONE",
        readiness: 100,
        steps: [
          "presentation.plan.*FieldKey @deprecated (frontend + backend + docs)",
          "publish snapshot: usesLegacyPlanFields",
          "Plan debug: planViewDebug (import.meta.env.DEV), без window.__*",
        ],
        completionCriterion:
          "Legacy помечен deprecated; диагностический флаг в snapshot; dual-read и fallback сохранены.",
      },
      {
        key: "object-view-architecture-legacy-usage-audit",
        number: "5A.1",
        title: "Legacy Usage Audit",
        status: "DONE",
        readiness: 100,
        steps: [
          "audit_plan_legacy_usage.py — read-only аудит published catalog",
          "Реестр Plan: roleMapping / legacy / risk",
          "Dashboard: Plan Legacy Usage + removalReadinessPercent",
        ],
        completionCriterion:
          "Фактическая картина legacy зафиксирована; рекомендация по этапу 5B определена.",
      },
      {
        key: "object-view-architecture-legacy-removal",
        number: "5B",
        title: "Очистка legacy из snapshot",
        status: "DONE",
        readiness: 100,
        steps: [
          "sanitize_presentation_plan: strip *FieldKey при usesLegacyPlanFields=false",
          "Publish v69: snapshot без legacy keys",
          "Draft/Studio: legacy сохранены",
        ],
        completionCriterion:
          "Published snapshot без *FieldKey; Mixed=0; draft/Studio/dual-read без изменений.",
      },
      {
        key: "object-view-architecture-fallback-audit",
        number: "5C.1",
        title: "Runtime Fallback Audit",
        status: "DONE",
        readiness: 100,
        steps: [
          "Карта F1–F8 fallback в Plan runtime",
          "Проверка Published / Preview / Tests",
          "planRuntimeFallbackAudit в Dashboard",
        ],
        completionCriterion:
          "Реестр fallback; Published Plan v69 не использует role-mapping fallback.",
      },
      {
        key: "object-view-architecture-fallback-removal",
        number: "5C.2",
        title: "Fallback Removal",
        status: "DONE",
        readiness: 100,
        steps: [
          "Удалить F1–F6 из resolvePlanRoleMapping/buildPlanTree/planEntityUtils",
          "Обновить тесты scenario 3 (null keys, source=legacy)",
          "Сохранить F7 (Issues) и F8 (buildPlanTree safety)",
        ],
        completionCriterion:
          "Plan Tree Fallback Count = 0; runtime source roleMapping + legacy.",
      },
      {
        key: "object-view-architecture-legacy-dual-read-audit",
        number: "5D.1",
        title: "Legacy Dual-Read Usage Audit",
        status: "DONE",
        readiness: 100,
        steps: [
          "audit_plan_legacy_dual_read_usage.py",
          "Published / Draft / Studio Preview / Tests",
          "planLegacyDualReadAudit в Dashboard",
        ],
        completionCriterion:
          "Реестр legacy tier; published runtime не использует legacy; рекомендация 5D.2.",
      },
      {
        key: "object-view-architecture-legacy-dual-read-removal",
        number: "5D.2",
        title: "Legacy Dual-Read Removal",
        status: "DONE",
        readiness: 100,
        steps: [
          "resolvePlanRoleMapping — roleMapping only",
          "buildPlanTree: EMPTY_PLAN_ROLE_MAPPING, без legacy F8",
          "Тесты + Studio draft legacy сохранены",
        ],
        completionCriterion:
          "Plan runtime roleMapping only; Runtime Legacy References = 0.",
      },
      {
        key: "object-view-architecture-entity-title-unification",
        number: "5E",
        title: "Entity Title Resolution",
        status: "DONE",
        readiness: 100,
        steps: [
          "resolveEntityDisplayTitle + resolveEntityTitleFieldKey",
          "Issues Panel / Related / Lookup → единый resolver",
          "Удалить F7 resolvePlanEntityTitle",
        ],
        completionCriterion:
          "Runtime Title Fallbacks = 0 в object platform; Projection → Title Field → [id].",
      },
      {
        key: "object-view-architecture-plan-ui-cleanup",
        number: "5F",
        title: "UI Cleanup Plan Settings",
        status: "DONE",
        readiness: 100,
        steps: [
          "Удалить legacy *FieldKey controls из PlanViewSettingsPanel",
          "Скрыть Migration Assistant при заполненном roleMapping",
          "Убрать Legacy / dual-read / Migration copy из Studio UI",
        ],
        completionCriterion:
          "Legacy Controls Visible = 0; Migration Controls Visible = 0; Plan Settings Simplified = true.",
      },
      {
        key: "object-view-architecture-plan-tree-visual-polish",
        number: "5G",
        title: "Plan Tree Visual Polish",
        status: "DONE",
        readiness: 100,
        steps: [
          "Контрастные заголовки колонок (#0f172a)",
          "Глобальное раскрытие Chevron слева от «Название»",
          "Удалить GripVertical; единый gap 8px в строке",
        ],
        completionCriterion:
          "Дерево компактное и единообразное; логика дерева/статусов/готовности без изменений.",
      },
      {
        key: "object-view-architecture-unification",
        number: 6,
        title: "Финальная унификация",
        status: "PLANNED",
        readiness: 0,
        steps: [
          "Runtime adapters: board, calendar, tree, diagram",
          "Единый ObjectViewHost",
          "Studio gate для неготовых types",
        ],
        completionCriterion:
          "Все целевые представления следуют Projection + Query + View Settings.",
      },
    ],
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
      readiness: 73,
      objectViewArchitectureProgramReadiness: 99,
      objectViewArchitectureProgramStatus: "IN_PROGRESS",
      objectViewArchitectureNextStage: "Этап 6 — Финальная унификация",
      dependencies: ["Object Type", "Publish", "Runtime Entity"],
      risks: [
        "Legacy-зависимости",
        "Разрыв между Studio и Runtime",
        "Plan legacy *FieldKey vs Projection",
        "Нерабочие view types в Studio",
        "Plan/Table hierarchy из каталога, не из settings",
      ],
    },
    {
      key: "object-type",
      title: "Object Type",
      description:
        "Конструктор типов объектов в Studio: поля, связи, представления и жизненный цикл типа.",
      status: "review",
      readiness: 86,
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
        "Завершить перевод legacy страниц на объектную платформу",
        "Запрет создания новых UT blocks — COMPLETED",
        "Legacy block types из новых сценариев — COMPLETED",
        "Placeholder для existing UT blocks — COMPLETED",
        "Убрать переходы в Universal Tables",
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
        "Подготовить стратегию миграции данных Universal Tables",
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
      key: "object-table-ut-parity",
      title: "Object Table vs Universal Tables",
      description:
        "Остаточные работы по аудиту функционального соответствия перед полным отказом от Universal Tables.",
      status: "in_progress",
      readiness: 32,
      ownerFocus:
        "Закрыть пользовательские пробелы Object Table, выявленные аудитом UT vs OT.",
      result:
        "Object Table покрывает ключевой функционал Universal Tables; legacy можно отключить.",
      nextMilestone: "Реализовать перетаскивание строк.",
      linkedContours: ["Object Platform", "Object Card", "Views Engine"],
      linkedDebt: ["Universal Table Retirement"],
      keyWorks: [
        "Реализовать чек-листы в карточке",
        "Реализовать многоколоночную сортировку (после MVP)",
        "Реализовать фильтрацию по связям (MVP)",
        "Реализовать перетаскивание строк",
        "Реализовать режим дерева",
        "Реализовать поиск по таблице",
        "Реализовать дублирование записей",
        "Реализовать массовое изменение записей",
        "Сохранять выбранный быстрый фильтр",
        "Вернуть номер строки таблицы",
        "Реализовать редактирование связей в таблице",
        "Реализовать экспорт Excel",
        "Реализовать импорт Excel",
        "Реализовать закрепление колонок",
        "Реализовать виртуализацию строк",
        "Реализовать тип поля Ссылка",
      ],
      risks: [
        "Преждевременное отключение UT до закрытия пробелов",
        "Дублирование работ с relation-field-type без координации",
      ],
      completionCriteria: [
        "Object Table покрывает пользовательский функционал Universal Tables",
        "Universal Tables можно отключить без потери ключевых возможностей",
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
      key: "plan-studio-office-info-parity",
      date: "2026-06-09",
      title: "Унификация вкладки Инфо Plan: Studio и Office",
      type: "fix",
      description:
        "Проведён аудит расхождения Studio/Office в Plan View: Office ошибочно рендерил RuntimeFieldCell (layout карточки объекта), Studio — plan info grid из published projection. Office приведён к той же сетке; inline-edit встроен в PlanInfoFieldValue без смены layout.",
      impact:
        "Настраиваем в Studio — видим то же в Office; допустимое отличие — только элементы конструктора (drag handles) в Studio preview.",
      relatedContours: ["Object Platform", "Plan View", "Designer Foundation"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "plan-inline-editing-moved-to-card",
      date: "2026-06-09",
      title: "Inline-редактирование Plan перенесено в правую карточку",
      type: "fix",
      description:
        "Исправлена реализация Plan Inline Editing: редактирование убрано из левого дерева, восстановлено компактное дерево (название / готовность / статус); inline-редактирование полей — на вкладке Инфо справа через RuntimeFieldCell.",
      impact:
        "Plan снова читаем как иерархия; пользователь редактирует поля в карточке выбранной записи; дерево обновляется после сохранения.",
      relatedContours: ["Object Platform", "Plan View", "Object Card"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "plan-inline-editing-audit-fix",
      date: "2026-06-08",
      title: "Аудит Plan Inline Editing — устранён регресс запуска frontend",
      type: "fix",
      description:
        "Проведён аудит реализации Plan Inline Editing. Причина падения Vite: неверный импорт FieldValueRenderer из shared/fieldEditors (модуль не существует). Исправлено: shared/fieldTypes/FieldValueRenderer + fieldDefToRendererColumn как в ViewEngineCell.",
      impact:
        "Frontend снова собирается; Plan переиспользует платформенные FieldEditor/FieldValueRenderer и общий persistRuntimeEntityFieldUpdate с Object Table.",
      relatedContours: ["Object Platform", "Plan View", "Object Table"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "plan-view-inline-field-editing",
      date: "2026-06-08",
      title: "Добавлено inline-редактирование полей в представлении Plan",
      type: "milestone",
      description:
        "В дереве Plan можно менять статус, ответственного, приоритет, срок и процент готовности без открытия карточки; колонки резолвятся из projection/roleMapping, сохранение через общий runtime pipeline с Object Table.",
      impact:
        "Plan становится рабочим представлением управления задачами; карточка справа и rollup готовности обновляются после сохранения.",
      relatedContours: ["Object Platform", "Plan View", "Object Table", "Runtime Entity"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-type-actions-rules-tabs",
      date: "2026-06-08",
      title: "Добавлены вкладки «Действия» и «Правила»",
      type: "milestone",
      description:
        "В настройках любого Object Type появились системные вкладки Действия (/actions) и Правила (/rules) с заглушками ObjectActionsTab и ObjectRulesTab — инфраструктура для Action Engine и Rule Engine.",
      impact:
        "Studio → Object Type → любой объект: навигация и URL для будущей настройки действий и правил без смешения с Полями/Связями/Вкладками.",
      relatedContours: ["Object Platform", "Designer Foundation", "Action Engine", "Rule Engine"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "action-engine-target-object-create-record",
      date: "2026-06-09",
      title: "Action Engine: Target Object для create_record",
      type: "milestone",
      description:
        "Action Definition получил target_object_type_id: Designer показывает «Целевой объект», Action Form маппит поля target object, publish snapshot включает target_object_type, Runtime Resolver и executor создают запись в целевом объекте.",
      impact:
        "Сценарий «Проект → Создать задачу → запись в Задачах» работает без привязки формы к объекту-владельцу действия.",
      relatedContours: [
        "Object Platform",
        "Action Engine",
        "Designer Foundation",
        "Publish",
        "Runtime Entity",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "action-engine-executor-create-record",
      date: "2026-06-08",
      title: "Action Engine: Executor create_record (MVP)",
      type: "milestone",
      description:
        "Runtime Action Form для action_type_key=create_record вызывает executeCreateRecordAction: buildCreateEntityPayload → runtimeWriteGateway.createEntity → submitPendingRelationLinks; без нового backend endpoint.",
      impact:
        "Office → объект → действие «Создать …» (top_panel / row_menu): форма создаёт запись, показывает toast «Запись успешно создана», таблица обновляется без F5.",
      relatedContours: [
        "Object Platform",
        "Action Engine",
        "Runtime Entity",
        "Office Object Table",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
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
      key: "studio-preview-demo-data-toolbar-badge",
      date: "2026-06-06",
      title: "Studio Preview: badge демо-данных в toolbar",
      type: "ux",
      description:
        "Уведомление о mock-данных перенесено из строки над таблицей в компактный warning-badge «Демо-данные» по центру Object Table toolbar; tooltip поясняет отсутствие реальных записей Office.",
      impact:
        "Studio → Объект → Предпросмотр → Table Toolbar: [Фильтры] [Все] [Демо-данные] [...] [+ Представление]; Office без badge.",
      relatedContours: ["Studio", "Preview UX", "Object Platform"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "studio-object-type-header-icon",
      date: "2026-06-06",
      title: "Studio: иконка объекта в шапке workspace",
      type: "fix",
      description:
        "getObjectTypeAppearanceFields больше не затирает icon_type/icon_file_url пустыми display_*; Studio workspace резолвит иконку через mergeObjectTypeAppearance с navigation fallback — тот же контракт, что PortalObjectDataPage.",
      impact:
        "Studio → Object Type Header: настроенная иконка объекта вместо дефолтной папки; визуальный паритет с Office.",
      relatedContours: ["Studio", "Object Platform", "Object Header", "Icon UX"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "studio-preview-mock-data",
      date: "2026-06-06",
      title: "Studio Preview: демонстрационные данные",
      type: "feature",
      description:
        "Studio Preview генерирует 7 demo-строк из схемы объекта; runtime/query для строк и relation instances не вызывается; единый ViewEngine render path сохранён.",
      impact:
        "Studio → Объект → Предпросмотр: «Показаны демонстрационные данные»; реальные записи, пользователи и связи скрыты.",
      relatedContours: ["Studio", "Object Platform", "Preview UX", "Security", "Data Privacy"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "studio-preview-tab-bar-ux",
      date: "2026-06-06",
      title: "Studio Preview: dropdown в tab-bar и office-only usage",
      type: "feature",
      description:
        "Dropdown «Предпросмотр ▾» перенесён из содержимого страницы в tab-bar; мета-строка вкладки использует платформенные designer-pages-badge; «Используется» показывает только маршруты Офис.",
      impact:
        "Studio → Объект → Предпросмотр: единый UX с tab-bar dropdown, компактная шапка вкладки и реальные места использования без Studio-маршрутов.",
      relatedContours: ["Studio", "Object Platform", "Preview UX", "Object Tabs"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "studio-preview-tab-selector-ux",
      date: "2026-06-06",
      title: "Studio: предпросмотр выбранной вкладки объекта",
      type: "feature",
      description:
        "Вкладка Studio «Предпросмотр ▾» выбирает одну из вкладок объекта (listViews); ниже — название, badge статуса и «Используется»; ObjectViewHost в режиме studio-preview.",
      impact:
        "Studio → Object Type → Предпросмотр: dropdown вкладок, статус вкладки, маршруты Офис/Студия; без «Отображается» и технических runtime-строк.",
      relatedContours: ["Studio", "Object Platform", "Object Tabs", "Preview UX"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "studio-preview-business-context-ux",
      date: "2026-06-06",
      title: "Studio: бизнес-контекст вкладки «Предпросмотр»",
      type: "feature",
      description:
        "Вкладка переименована в «Предпросмотр»; вместо GET /runtime/query показываются использование в меню, статус публикации и текущее представление.",
      impact:
        "Studio → Объект → Предпросмотр: компактный блок «Используется / Статус / Отображается» перед таблицей.",
      relatedContours: ["Studio", "Object Platform", "Preview UX"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-studio-preview-parity",
      date: "2026-06-06",
      title: "Object Table: Studio Preview parity с Office",
      type: "feature",
      description:
        "Studio Preview больше не отключает иерархию и selection column; единый ObjectTableView + ViewEngineTable с режимом studio-preview (readOnly rowActions, disabled checkboxes, без inline edit/карточки/массовых действий).",
      impact:
        "Studio → Runtime Preview: таблица выглядит как Office Object Table; метка «Предпросмотр»; данные не изменяются.",
      relatedContours: [
        "Object Platform",
        "View Engine",
        "Studio Preview",
        "Office Parity",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-selection-tree-expand-all-fix",
      date: "2026-06-06",
      title: "Bugfix: Object Table — глобальное раскрытие дерева",
      type: "quality",
      description:
        "expandableRowIds для expandAll строился через Object.values(parentByChild), хотя parentByChild — Map; из свернутого дерева список был пустым.",
      impact:
        "Office → Object Table: tree toggle в шапке раскрывает все узлы даже когда видны только корневые строки.",
      relatedContours: ["Object Platform", "Object Table", "Hierarchy UX"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-selection-tree-toggle-ux",
      date: "2026-06-06",
      title: "Object Table: раскрытие дерева в колонке чекбокса",
      type: "feature",
      description:
        "Чекбокс и стрелка раскрытия объединены в первой колонке; шапка получила глобальный tree toggle на базе expandedRowIds (expandAll/collapseAll).",
      impact:
        "Office → Object Table: первая колонка [✓][›/v] — выбор строк и управление деревом; строки без детей показывают только чекбокс.",
      relatedContours: ["Object Platform", "Object Table", "Hierarchy UX"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-title-hierarchy-number-ux",
      date: "2026-06-06",
      title: "Object Table: иерархический номер в Title Field",
      type: "feature",
      description:
        "Единая разметка Title Field: фиксированные зоны меню, раскрытия, hierarchyNumber и названия; приоритет row.hierarchy.hierarchyNumber над positionNumber.",
      impact:
        "Office → Object Table: номера 1 / 2.1 / 3.1.1 в Title Field; меню ⋮ по hover без сдвига; колонка № показывает record_number.",
      relatedContours: ["Object Platform", "Object Table", "Hierarchy UX"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-export-runtime-422-fix",
      date: "2026-06-06",
      title: "Bugfix: Excel Export — Runtime query 422",
      type: "quality",
      description:
        "Экспорт отправлял limit=500 при допустимом максимуме Runtime API 200; добавлен exportRuntimeQuery с cap limit и fallback без sort при 422.",
      impact:
        "Office → Объект → Экспорт Excel: файл формируется без аварийного завершения при сортировке по системным и пользовательским полям.",
      relatedContours: ["Object Platform", "Object Table", "Excel Export"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-export-hierarchy-column-ux",
      date: "2026-06-06",
      title: "Excel Export: колонка «Иерархия» после «№»",
      type: "ux",
      description:
        "Колонка иерархии в .xlsx переименована в «Иерархия» и вставляется сразу после «№»; hierarchyNumber, tree order и экспорт свёрнутых узлов не менялись.",
      impact:
        "Office → Object Table → Export Excel: № | Иерархия | Название задачи | …",
      relatedContours: [
        "Object Platform",
        "Object Table",
        "Excel Export",
        "Hierarchy Export",
        "UT Parity",
      ],
      relatedDebt: ["Universal Table Retirement"],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-export-hierarchy-labels",
      date: "2026-06-06",
      title: "Excel Export: иерархия и label для списков/статусов",
      type: "enhancement",
      description:
        "prepareExportTableRows переиспользует buildObjectTableHierarchyDisplayRows с полным раскрытием дерева; добавлена колонка «Иерархический №»; formatExportCellValue/choiceUtils резолвят key → label из settings_json.options.",
      impact:
        "Office → Object Table → Export Excel: tree order 1 / 2 / 2.1 / 2.2 / 3; «Средний», «В работе», «Не начато» вместо sredniy, v_rabote, ne_nachato.",
      relatedContours: [
        "Object Platform",
        "Object Table",
        "Excel Export",
        "Hierarchy Export",
        "Field Formatting",
        "UT Parity",
      ],
      relatedDebt: ["Universal Table Retirement"],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-default-values-fix",
      date: "2026-06-06",
      title: "Excel Import: fix default values для обязательных полей без колонки",
      type: "fix",
      description:
        "Значения по умолчанию сохраняются между шагами, применяются при валидации и импорте; добавлены «Текущий пользователь», select колонки Excel и предупреждения на шаге «Колонки».",
      impact:
        "Office → Object → Импорт Excel → Колонки: «Постановщик» без колонки в Excel больше не блокирует импорт после выбора default value.",
      relatedContours: [
        "Object Platform",
        "Excel Import",
        "Required Fields",
        "Default Values",
        "Import Wizard",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-default-values",
      date: "2026-06-06",
      title: "Excel Import: значения по умолчанию для обязательных полей",
      type: "feature",
      description:
        "Шаг «Колонки» поддерживает источник данных для обязательных полей: колонка Excel или значение по умолчанию (пользователь, статус, список, текст, число, дата).",
      impact:
        "Office → Object → Импорт Excel → Колонки: «Постановщик = Михаил Запевалов» подставляется во все импортируемые строки без колонки в Excel.",
      relatedContours: [
        "Object Platform",
        "Excel Import",
        "Default Values",
        "Import Wizard",
        "Office Object Table",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-review-ux",
      date: "2026-06-06",
      title: "Excel Import: UX шага «Проверка»",
      type: "quality",
      description:
        "Шаг проверки показывает блок обязательных несопоставленных полей, подсказку при нуле валидных строк и кнопку «Исправить сопоставление»; footer [Назад][Исправить][Импорт] справа.",
      impact:
        "Office → Object → Импорт Excel → Проверка: пользователь не попадает в тупик при «Обязательное поле не сопоставлено».",
      relatedContours: [
        "Object Platform",
        "Excel Import",
        "Import Wizard UX",
        "Validation UX",
        "Office Object Table",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-value-mapping-auth-api-fix",
      date: "2026-06-06",
      title: "Excel Import: исправлен импорт authApi для сопоставления пользователей",
      type: "fix",
      description:
        "loadImportUsersForSelect.js импортировал getUsers из неверного относительного пути (на уровень выше, чем нужно) — Vite не собирал frontend.",
      impact:
        "Office → Object → Импорт Excel → Сопоставление значений: шаг снова открывается, список пользователей загружается через существующий authApi.getUsers.",
      relatedContours: [
        "Object Platform",
        "Excel Import",
        "Value Mapping",
        "Import Wizard",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-value-mapping",
      date: "2026-06-06",
      title: "Excel Import: сопоставление значений",
      type: "feature",
      description:
        "Мастер импорта получил шаг «Сопоставление значений» между колонками и проверкой: статусы, списки и пользователи сопоставляются вручную, если автоматическое разрешение не сработало.",
      impact:
        "Office → Object → Импорт Excel: «Выполняется → В работе», «Средняя → Средний», ручной выбор пользователя; шаг пропускается, если все значения распознаны.",
      relatedContours: [
        "Object Platform",
        "Excel Import",
        "Value Mapping",
        "Import Wizard",
        "Office Object Table",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-wizard-clean-ux",
      date: "2026-06-06",
      title: "Excel Import: чистый UX шага «Файл»",
      type: "quality",
      description:
        "Убраны лишние пояснения, шапка сведена к «Импорт Excel» и названию объекта, stepper идёт сразу под заголовком, footer [Отмена][Далее →] справа.",
      impact:
        "Office → Object Menu → Импорт Excel: минималистичный первый шаг без перегруза текстом.",
      relatedContours: [
        "Object Platform",
        "Excel Import",
        "Import Wizard UX",
        "Office Object Table",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-wizard-compact-ux",
      date: "2026-06-06",
      title: "Excel Import: компактный UX шага «Файл»",
      type: "quality",
      description:
        "Шаг «Файл» доведён до завершённого вида: компактная модалка без пустого пространства, уменьшенная dropzone, иконка Excel, подсказка формата, карточка файла и видимая кнопка «Далее →».",
      impact:
        "Office → Object Menu → Импорт Excel: пользователь сразу видит сценарий, формат .xlsx и может перейти дальше после чтения файла.",
      relatedContours: [
        "Object Platform",
        "Excel Import",
        "Import Wizard UX",
        "Office Object Table",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-wizard-ux",
      date: "2026-06-06",
      title: "Excel Import: UX мастера (шаг «Файл»)",
      type: "quality",
      description:
        "Первый шаг импорта оформлен как полноценный мастер: индикатор прогресса, drag-and-drop зона, карточка файла, статистика листа и компактные badge найденных колонок.",
      impact:
        "Office → Object Menu → Импорт Excel: пользователь видит этап, содержимое файла и может перейти «Далее →» только после успешного чтения.",
      relatedContours: [
        "Object Platform",
        "Excel Import",
        "Import Wizard UX",
        "Office Object Table",
      ],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-import-mvp",
      date: "2026-06-06",
      title: "Object Platform: импорт Excel (MVP)",
      type: "feature",
      description:
        "Пункт «Импорт Excel» в контекстном меню объекта открывает PlatformModal-мастер: выбор .xlsx и листа, автосопоставление колонок с полями объекта, предпросмотр ошибок, импорт валидных строк.",
      impact:
        "Office → Object Header Menu → Импорт Excel: создаются новые записи через runtimeWriteGateway.createEntity (чанки по 50); таблица обновляется после импорта; Studio Preview без импорта.",
      relatedContours: [
        "Object Platform",
        "Object Table",
        "UT Parity",
        "Excel Import",
        "Office Object Table",
      ],
      relatedDebt: ["Universal Table Retirement"],
      relatedAdr: null,
    },
    {
      key: "object-table-excel-export-mvp",
      date: "2026-06-06",
      title: "Object Platform: экспорт Excel (MVP)",
      type: "feature",
      description:
        "Пункт «Экспорт Excel» в контекстном меню объекта выгружает текущее табличное представление Object Table: видимые колонки, порядок, фильтры, сортировка; читаемые значения пользователей, статусов, связей, дат и ссылок.",
      impact:
        "Office → Объект → Таблица → «Название ▾ → Экспорт Excel»: скачивается .xlsx до 10 000 записей без Universal Tables.",
      relatedContours: ["Object Platform", "Object Table", "UT Parity", "Excel Export"],
      relatedDebt: ["Universal Table Retirement"],
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
      key: "object-type-actions-menu-restore",
      date: "2026-06-07",
      title: "Восстановлено меню действий типа объекта в Studio",
      type: "quality",
      description:
        "Меню «…» в ObjectTypeWorkspaceHeader рендерится через portal с fixed-позиционированием (не обрезается overflow shell). Минимальный состав: Переименовать, Дублировать, Удалить. Удаление открывает ObjectTypeDeleteConfirmModal с GET /object-types/{id}/delete-preview.",
      impact:
        "Studio → Object Type → любой объект: пользователь снова может удалить объект и увидеть использование во вкладках, представлениях, связях, навигации и пространствах независимо от show_in_navigation.",
      relatedContours: ["Object Platform", "Designer Foundation", "Object Lifecycle"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "object-publish-navigation-decoupling",
      date: "2026-06-07",
      title: "Разделение публикации объекта и навигации",
      type: "architecture",
      description:
        "Публикация типа объекта переносит его в Runtime-каталог без автоматического пункта меню. В settings_json добавлен show_in_navigation (default false); enrichment скрывает объект в навигации при false; миграция выставляет true для объектов, уже присутствующих в navigation_items.",
      impact:
        "Служебные справочники и внутренние объекты можно публиковать для связей и вкладок пространств, не засоряя левое меню; «Разместить в меню» — отдельный шаг после включения «Отображать в навигации».",
      relatedContours: ["Object Platform", "Publish", "Designer Foundation"],
      relatedDebt: [],
      relatedAdr: null,
    },
    {
      key: "workspace-object-view-tab-binding",
      date: "2026-06-07",
      title: "Вкладки пространства привязаны к вкладкам объекта",
      type: "milestone",
      description:
        "designer_workspace_tabs получил object_view_id; вкладка пространства типа object всегда открывает конкретную опубликованную вкладку объекта (object_view_key в runtime). Studio: поля «Объект» + «Вкладка объекта» с фильтром по published views.",
      impact:
        "Пространство «Разработка» может показывать «Карта платформы» и «Все направления» как разные вкладки одного объекта «Направления»; объект-контейнер не открывается напрямую.",
      relatedContours: ["Object Platform", "Publish", "Designer Foundation"],
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
