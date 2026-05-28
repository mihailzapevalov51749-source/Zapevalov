import usersIcon from "../../../assets/icons/users.png";

const ADMIN_BASE = "/designer/tenant/1/administration";

export const adminSections = [
  {
    id: "users",
    title: "Пользователи системы",
    subtitle: "Аккаунты входа в платформу",
    description:
      "Управление пользователями, профилями, статусами и привязкой к сотрудникам.",
    route: `${ADMIN_BASE}/users`,
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
    route: `${ADMIN_BASE}/roles`,
    actionLabel: "Управление ролями",
    metrics: [
      { label: "Ролей", value: "32", tone: "primary" },
      { label: "Политик доступа", value: "15" },
      { label: "Назначений", value: "186" },
    ],
  },

  {
    id: "modules",
    title: "Модули",
    subtitle: "Подключаемые блоки платформы",
    description:
      "Управление таблицами, библиотеками, чатами, отчётами, процессами и другими модулями.",
    route: `${ADMIN_BASE}/modules`,
    actionLabel: "Управление",
    metrics: [
      { label: "Всего модулей", value: "24", tone: "primary" },
      { label: "Активных", value: "20", tone: "success" },
      { label: "Доступно", value: "4" },
    ],
  },

  {
    id: "system",
    title: "Настройка системы",
    subtitle: "Общие параметры платформы",
    description:
      "Брендинг, локализация, уведомления, лимиты, резервное копирование и безопасность.",
    route: `${ADMIN_BASE}/system-settings`,
    actionLabel: "Открыть настройки",
    metrics: [],
  },

  {
    id: "integrations",
    title: "Интеграции",
    subtitle: "Связь с внешними системами",
    description:
      "Подключение 1С, SharePoint, Telegram, почты, BI и других внешних сервисов.",
    route: `${ADMIN_BASE}/integrations`,
    actionLabel: "Настроить",
    metrics: [
      { label: "Интеграций", value: "12", tone: "primary" },
      { label: "Активных", value: "8", tone: "success" },
      { label: "С ошибками", value: "1", tone: "danger" },
    ],
  },

  {
    id: "audit-log",
    title: "Журнал событий",
    subtitle: "Аудит действий",
    description:
      "Просмотр системных событий, действий пользователей и изменений данных.",
    route: `${ADMIN_BASE}/audit-log`,
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
    route: `${ADMIN_BASE}/ai-assistants`,
    actionLabel: "Управление ассистентами",
    metrics: [
      { label: "Ассистентов", value: "6", tone: "primary" },
      { label: "Активных", value: "5", tone: "success" },
      { label: "Настроек", value: "18" },
    ],
  },
];