import usersIcon from "../../../assets/icons/users.png";

export const adminSections = [
  {
    id: "users",
    title: "Пользователи системы",
    subtitle: "Аккаунты входа в платформу",
    description:
      "Управление пользователями, профилями, статусами и привязкой к сотрудникам.",
    route: "/admin/users",
    icon: usersIcon,
    actionLabel: "Все пользователи",
    metrics: [
      { label: "Всего пользователей", value: "—", tone: "primary" },
      { label: "Активных", value: "—", tone: "success" },
      { label: "Неактивных", value: "—", tone: "muted" },
    ],
  },

  {
    id: "roles",
    title: "Роли и доступы",
    subtitle: "Настройка прав",
    description:
      "Управление ролями, правами доступа и политиками безопасности.",
    route: "/admin/roles",
    actionLabel: "Управление ролями",
    metrics: [
      { label: "Ролей", value: "32", tone: "primary" },
      { label: "Политик доступа", value: "15" },
      { label: "Назначений", value: "186" },
    ],
  },

  {
    id: "workspaces",
    title: "Рабочие пространства",
    subtitle: "Управление workspace",
    description:
      "Включение, настройка и управление рабочими пространствами компании.",
    route: "/admin/workspaces",
    actionLabel: "Настроить",
    metrics: [
      { label: "Всего пространств", value: "8", tone: "primary" },
      { label: "Активных", value: "7", tone: "success" },
      { label: "Отключённых", value: "1", tone: "warning" },
    ],
  },

  {
    id: "modules",
    title: "Модули",
    subtitle: "Подключаемые блоки платформы",
    description:
      "Управление таблицами, библиотеками, чатами, отчётами, процессами и другими модулями.",
    route: "/admin/modules",
    actionLabel: "Управление",
    metrics: [
      { label: "Всего модулей", value: "24", tone: "primary" },
      { label: "Активных", value: "20", tone: "success" },
      { label: "Доступно", value: "4" },
    ],
  },

  {
    id: "navigation",
    title: "Навигация",
    subtitle: "Управление левым меню",
    description:
      "Настройка структуры меню, видимости пунктов и доступности разделов по ролям.",
    route: "/admin/navigation",
    actionLabel: "Настроить",
    metrics: [
      { label: "Пунктов меню", value: "5", tone: "primary" },
      { label: "Правил видимости", value: "38" },
      { label: "Ролей", value: "27" },
    ],
  },

  {
    id: "system",
    title: "Настройки системы",
    subtitle: "Общие параметры платформы",
    description:
      "Брендинг, локализация, уведомления, лимиты, резервное копирование и безопасность.",
    route: "/portal/1/page/41",
    actionLabel: "Открыть настройки",
    metrics: [],
  },

  {
    id: "integrations",
    title: "Интеграции",
    subtitle: "Связь с внешними системами",
    description:
      "Подключение 1С, SharePoint, Telegram, почты, BI и других внешних сервисов.",
    route: "/admin/integrations",
    actionLabel: "Настроить",
    metrics: [
      { label: "Интеграций", value: "12", tone: "primary" },
      { label: "Активных", value: "8", tone: "success" },
      { label: "С ошибками", value: "1", tone: "danger" },
    ],
  },

  {
    id: "audit",
    title: "Журнал событий",
    subtitle: "Аудит действий",
    description:
      "Просмотр системных событий, действий пользователей и изменений данных.",
    route: "/admin/audit",
    actionLabel: "Открыть журнал",
    metrics: [
      { label: "Событий сегодня", value: "1 248", tone: "primary" },
      { label: "Ошибок", value: "12", tone: "danger" },
      { label: "Предупреждений", value: "45", tone: "warning" },
    ],
  },

  {
    id: "ai",
    title: "AI-ассистенты",
    subtitle: "Настройка ИИ-помощников",
    description:
      "Управление ролями, поведением и доступами ИИ-ассистентов в рабочих пространствах.",
    route: "/admin/ai-assistants",
    actionLabel: "Управление ассистентами",
    metrics: [
      { label: "Ассистентов", value: "6", tone: "primary" },
      { label: "Активных", value: "5", tone: "success" },
      { label: "Настроек", value: "18" },
    ],
  },
];