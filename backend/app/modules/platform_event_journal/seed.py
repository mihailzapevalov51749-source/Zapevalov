from dataclasses import dataclass

from app.modules.platform_event_journal.constants import (
    PlatformEventJournalStatus,
    PlatformEventJournalType,
)


@dataclass(frozen=True)
class PlatformEventJournalSeedEntry:
    slug: str
    title: str
    description: str
    event_type: str = PlatformEventJournalType.ARCHITECTURE.value
    status: str = PlatformEventJournalStatus.DONE.value
    author: str = "Cursor"


PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES: tuple[PlatformEventJournalSeedEntry, ...] = (
    PlatformEventJournalSeedEntry(
        slug="platform-section-removed",
        title="Удалён раздел Платформа из Studio",
        description=(
            "Раздел «Платформа» убран из меню Studio. "
            "Вместо контейнера с Dashboard добавлен прямой пункт «Журнал событий»."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="dashboard-disabled-studio",
        title="Отключён Dashboard в Studio",
        description=(
            "PlatformDevelopmentPage отключена от маршрутов Studio. "
            "Dashboard, готовность, компоненты, стадии и связанные вкладки больше не отображаются."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="event-journal-created",
        title="Создан Журнал событий",
        description=(
            "В DEV Studio добавлен раздел «Журнал событий» — "
            "единый источник истории развития платформы."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="dashboard-hidden-template",
        title="Скрыт Dashboard в TEMPLATE",
        description=(
            "В контуре TEMPLATE скрыты пункты «Платформа», «Журнал событий» и Dashboard. "
            "Legacy-маршруты перенаправляются в рабочие разделы Studio."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="dashboard-hidden-demo",
        title="Скрыт Dashboard в DEMO",
        description=(
            "В контуре DEMO скрыты пункты «Платформа», «Журнал событий» и Dashboard."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="dashboard-hidden-client",
        title="Скрыт Dashboard в CLIENT",
        description=(
            "В контуре CLIENT скрыты пункты «Платформа», «Журнал событий» и Dashboard."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="event-journal-improved",
        title="Усовершенствован Журнал событий",
        description=(
            "Журнал очищен от Dashboard-событий, введено обязательное логирование "
            "всех задач платформы, оптимизирован интерфейс отображения."
        ),
    ),
    PlatformEventJournalSeedEntry(
        slug="event-journal-display-improved",
        title="Улучшено отображение Журнала событий",
        description=(
            "Скорректированы отступы, визуальная иерархия и читаемость карточки события "
            "без потери компактности журнала."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="companies-workspace-reorganized",
        title="Реорганизовано пространство Компании",
        description=(
            "Раздел Компании преобразован в пространство с вкладкой Клиенты. "
            "Tenant Registry, создание и клонирование компаний перенесены в единый экран "
            "управления компаниями."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="companies-workspace-structure-fixed",
        title="Исправлена структура пространства Компании",
        description=(
            "Вкладка Клиенты перенесена из левого меню в верхнюю панель вкладок пространства "
            "Компании. Удалена лишняя шапка Control Plane, улучшено соответствие UX паттерну "
            "рабочих пространств."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="control-plane-modals-unified",
        title="Унифицированы модалки Control Plane",
        description=(
            "Модалки Control Plane переведены на PlatformModal и используют единый механизм "
            "перемещения, изменения размера и сохранения состояния."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="event-journal-filters-added",
        title="Добавлены фильтры Журнала событий",
        description=(
            "В Журнал событий добавлены поиск, фильтр по типу события, выбор одной даты "
            "или диапазона дат через существующий платформенный Date Picker, сортировка "
            "и пустое состояние."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="sidebar-activity-modal-added",
        title="Добавлена модалка активности из левого меню",
        description=(
            "Индикатор активного времени в левом меню стал кликабельным и открывает "
            "PlatformModal с полной статистикой активности пользователя, переиспользуя "
            "данные и компонент личного кабинета."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-users-page-redesigned",
        title="Переработана страница Пользователи платформы",
        description=(
            "Страница пользователей платформы приведена к новой модели Control Plane "
            "с отдельным блоком владельца платформы, карточкой пользователя, правами "
            "доступа и ролями платформы."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-users-interface-refined",
        title="Уточнён интерфейс Пользователей платформы",
        description=(
            "Исправлено отображение аватара владельца платформы, увеличена высота "
            "карточки пользователя, устранён внутренний скролл, оптимизирован "
            "информационный блок."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-owner-block-refined",
        title="Уточнён блок владельца платформы",
        description=(
            "Блок Platform Owner приведён ближе к утверждённому макету: улучшена сетка, "
            "добавлен разделитель, переработано отображение email, статуса и действий."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-owner-card-rebuilt",
        title="Пересобрана карточка владельца платформы",
        description=(
            "Карточка Platform Owner перестроена на новую композицию: единая колонка "
            "информации, удалены отдельные блоки роли и статуса, упрощена структура "
            "и улучшена визуальная иерархия."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-owner-block-improved",
        title="Улучшен блок владельца платформы",
        description=(
            "Увеличен аватар владельца платформы, уменьшен визуальный вес текстовой "
            "информации, оптимизированы отступы и уменьшен информационный баннер."
        ),
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-roles-access-section",
        title="Реализован раздел Роли и доступы",
        description=(
            "Раздел Роли платформы преобразован в полноценный раздел Роли и доступы "
            "с управлением ролями, правами, контурами и административными полномочиями."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="users-roles-workspace-reorganized",
        title="Реорганизовано пространство Пользователи и роли",
        description=(
            "Раздел Система преобразован в пространство Пользователи и роли. "
            "Пользователи и роли разделены на отдельные вкладки. "
            "Исключено дублирование управления ролями."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="users-roles-navigation-fixed",
        title="Исправлена навигация пространства Пользователи и роли",
        description=(
            "Удалены лишние пункты Пользователи и Роли из левого меню. "
            "Управление перенесено во вкладки пространства Пользователи и роли."
        ),
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-role-create-modal-unified",
        title="Унифицирована модалка создания роли",
        description=(
            "Модалка создания роли переведена на общий платформенный механизм "
            "PlatformModal и приведена к единому стилю ЯсноПро."
        ),
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-role-code-autogeneration",
        title="Добавлена автогенерация кода роли",
        description=(
            "Код роли в модалке создания роли теперь автоматически формируется "
            "из названия роли по принципу генерации key для полей объекта, "
            "с возможностью ручной корректировки."
        ),
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-roles-workspace-scroll-fix",
        title="Исправлена прокрутка пространства Роли",
        description=(
            "Убран внутренний scroll карточки роли. Пространство Пользователи и роли "
            "переведено на общий механизм прокрутки рабочей области."
        ),
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-users-workspace-scroll-fix",
        title="Исправлена прокрутка вкладки Пользователи",
        description=(
            "На вкладке Пользователи пространства Пользователи и роли убран внутренний scroll "
            "правой карточки пользователя, увеличена высота панели и включена единая "
            "прокрутка рабочей области."
        ),
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-user-detail-card-header",
        title="Улучшена карточка пользователя",
        description=(
            "В карточку пользователя пространства Пользователи и роли добавлены аватар, "
            "ФИО и должность выбранного пользователя. Шапка карточки стала информативнее "
            "и использует единый источник аватаров."
        ),
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="control-plane-platform-profile",
        title="Создан профиль платформы",
        description=(
            "В Control Plane добавлено пространство Профиль платформы с главной страницей "
            "и вкладками настроек, переиспользующими наработки Настроек компании для будущего "
            "управления данными платформы."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-profile-general-settings-aligned",
        title="Уточнены общие настройки профиля платформы",
        description=(
            "Вкладка Общие настройки в Профиле платформы приведена к структуре tenant-настроек "
            "компании с адаптацией полей и текстов под уровень платформы."
        ),
        event_type=PlatformEventJournalType.DEVELOPMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="control-plane-sidebar-platform-name",
        title="Название платформы подключено к левому меню",
        description=(
            "Левый верхний блок Control Plane теперь использует название платформы из профиля "
            "платформы вместо hardcode YasnoPro."
        ),
        event_type=PlatformEventJournalType.UX_IMPROVEMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-profile-home-tab-removed",
        title="Убрана главная вкладка профиля платформы",
        description=(
            "Из пространства Профиль платформы удалена вкладка Главная. "
            "При открытии профиля платформы сразу отображаются Общие настройки."
        ),
        event_type=PlatformEventJournalType.UX_IMPROVEMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="control-plane-menu-dnd-fixed",
        title="Исправлен Drag & Drop меню Control Plane",
        description=(
            "Восстановлена фактическая работа перетаскивания пунктов левого меню Control Plane "
            "в режиме редактирования. Порядок пунктов сохраняется и восстанавливается после "
            "обновления страницы."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-navigation-menu-blocks",
        title="Добавлены навигационные блоки меню",
        description=(
            "Левое меню платформы разделено на четыре навигационных блока. "
            "Пункты можно свободно перемещать между блоками. "
            "Главная страница всегда закреплена в первом блоке. "
            "Блоки визуально разделяются только отступами."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-navigation-menu-blocks-fixed",
        title="Исправлены навигационные блоки меню",
        description=(
            "Добавлено визуальное отображение блоков меню в режиме редактирования "
            "и исправлен перенос пунктов между блоками с корректным сохранением "
            "block_id и sort_order."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-navigation-menu-blocks-studio-office",
        title="Исправлена работа навигационных блоков Studio и Office",
        description=(
            "Навигационные блоки, Drag & Drop между блоками и сохранение структуры "
            "меню приведены к единому поведению в Control Plane, Studio и Office."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-primary-owner-source",
        title="Реализован первичный владелец платформы",
        description=(
            "Владелец платформы стал первичным источником данных. "
            "При создании владельца автоматически создаётся пользователь платформы "
            "с ролью Platform Owner и полным доступом к платформе."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-owner-profile-tab",
        title="Создана вкладка владельца платформы",
        description=(
            "Управление владельцем платформы вынесено в отдельную вкладку профиля платформы. "
            "Владелец платформы стал самостоятельной сущностью управления и источником "
            "данных для пользователей платформы."
        ),
        event_type=PlatformEventJournalType.UX_IMPROVEMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-users-reset",
        title="Выполнен сброс платформенных пользователей",
        description=(
            "Удалены тестовые пользователи платформы. Источником создания Platform Owner "
            "стала вкладка Профиль платформы → Владелец платформы."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-bootstrap-owner",
        title="Реализован Bootstrap Owner",
        description=(
            "Добавлен системный скрытый владелец платформы для первичной инициализации "
            "и аварийного восстановления доступа."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-bootstrap-owner-email-fix",
        title="Исправлен email Bootstrap Owner",
        description=(
            "Email системного Bootstrap Owner изменён с bootstrap@yasnopro.local "
            "на bootstrap@yasnopro.dev, чтобы проходить стандартную валидацию email."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="users-schema-bootstrap-owner-fix",
        title="Исправлена схема пользователей для Bootstrap Owner",
        description=(
            "Схема таблицы users приведена в соответствие с моделью User. "
            "Добавлены отсутствующие поля tenant_id и role_id, необходимые для запуска "
            "Bootstrap Owner и авторизации."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="company-created-with-first-admin",
        title="Создана компания с первым администратором",
        description=(
            "Создана компания, первый пользователь компании и назначена роль Company Superadmin."
        ),
        event_type=PlatformEventJournalType.COMPANY_CREATION.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-owner-avatar-display",
        title="Уточнено отображение аватара владельца платформы",
        description=(
            "Во вкладке Владелец платформы удалено локальное управление аватаром. "
            "Аватар теперь отображается только через единый механизм avatar setting платформы."
        ),
        event_type=PlatformEventJournalType.UX_IMPROVEMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="company-invite-link-tenant-scoped",
        title="Исправлена ссылка приглашения компании",
        description=(
            "Ссылка приглашения первого администратора компании теперь ведёт в tenant "
            "созданной компании, а не в tenant по умолчанию."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="platform-event-audit-journal",
        title="Реализован журнал событий платформы",
        description=(
            "Журнал событий Control Plane преобразован в аудит действий платформы. "
            "Добавлена фиксация событий создания компаний, изменений пользователей, ролей, "
            "настроек, владельца платформы, лицензий и Bootstrap Owner."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="studio-trash-bulk-selection",
        title="Добавлен массовый выбор в корзине",
        description=(
            "В корзине добавлен общий чекбокс выбора записей и поддержка массовых действий "
            "восстановления и окончательного удаления."
        ),
        event_type=PlatformEventJournalType.UX_IMPROVEMENT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="studio-trash-deleted-by-fix",
        title="Исправлена фиксация удалившего пользователя",
        description=(
            "Soft delete операции корзины приведены к единому механизму. При удалении представлений, "
            "связей и зависимых сущностей теперь фиксируется пользователь, выполнивший удаление."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="studio-trash-bulk-purge-engine",
        title="Исправлено массовое удаление из корзины",
        description=(
            "Массовое окончательное удаление переведено на batch-планирование с дедупликацией зависимостей, "
            "единой транзакцией и итоговым summary-ответом."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="universal-table-external-consumers-detached",
        title="Отвязка последних потребителей Universal Table",
        description=(
            "Удалены последние внешние зависимости от modules/universalTable и shared/legacy. "
            "PortalPageView, navigation, blocks API и canvas guards переведены на legacyTableBlockTypes. "
            "Подготовлена платформа к физическому удалению legacy-модуля Universal Table."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="universal-table-frontend-removed",
        title="Физическое удаление frontend Universal Table",
        description=(
            "Удалены frontend-модуль Universal Table, shared/legacy слой и маршрут /universal-table. "
            "Frontend полностью переведён на Object Types, Object Views и runtime_entities "
            "без зависимости от legacy Universal Table."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="universal-table-backend-data-audit",
        title="Backend и Data аудит Universal Table",
        description=(
            "Категория: Universal Table Removal. "
            "Построена полная карта backend-зависимостей, данных БД (72 таблицы, 197 строк, 86 представлений), "
            "63 CMS-страниц с legacy-блоками, 3 navigation items и сервисов clone/trash/delete/pages "
            "перед окончательным удалением Universal Table из платформы."
        ),
        event_type=PlatformEventJournalType.AUDIT.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="universal-table-legacy-data-cleanup",
        title="Очистка legacy-данных Universal Table",
        description=(
            "Категория: Universal Table Removal. "
            "Удалены legacy-страницы, navigation items, блоки, orphan tables, comments "
            "и файловые артефакты Universal Table. Подготовка к удалению backend-кода и схемы БД."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="universal-table-backend-removed",
        title="Удаление backend-кода Universal Table",
        description=(
            "Категория: Universal Table Removal. "
            "Удалены backend-модули Universal Table и Universal Views, связанные API, сервисы, "
            "clone/delete/reset интеграции и тесты. Подготовка к финальному удалению схемы БД."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="universal-table-schema-dropped",
        title="Финальное удаление схемы Universal Table",
        description=(
            "Категория: Universal Table Removal. "
            "Удалена схема БД Universal Table (universal_tables, universal_table_rows, "
            "universal_table_columns, universal_views). Платформа полностью переведена на Object Types, "
            "Object Views и runtime_entities. Universal Table полностью исключён из архитектуры ЯсноПро."
        ),
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
    PlatformEventJournalSeedEntry(
        slug="navigation-menu-filter-after-ut-removal-fix",
        title="Исправление фильтра меню после удаления Universal Table",
        description=(
            "Категория: Navigation. "
            "Фильтр удалённых системных пунктов меню больше не скрывает Object Type пункты по названию. "
            "Скрываются только legacy Universal Table пункты. "
            "Object Type «Задачник» снова отображается в Office меню."
        ),
        event_type=PlatformEventJournalType.FIX.value,
        status=PlatformEventJournalStatus.DONE.value,
    ),
)
