import { slugifyPlatformKey } from "../../../shared/keys/generatePlatformKey.js";
import { normalizePlatformKey, validatePlatformKey } from "../../../shared/keys/platformKeyValidation.js";

export const PLATFORM_ROLE_TYPE_SYSTEM = "system";
export const PLATFORM_ROLE_TYPE_CUSTOM = "custom";
export const PLATFORM_ROLE_STATUS_ACTIVE = "active";
export const PLATFORM_ROLE_STATUS_INACTIVE = "inactive";

export const PLATFORM_CONTOURS = [
  { key: "control_plane", label: "Control Plane" },
  { key: "dev", label: "DEV" },
  { key: "template", label: "TEMPLATE" },
  { key: "demo", label: "DEMO" },
  { key: "clients", label: "CLIENTS" },
];

export const PLATFORM_CP_SECTIONS = [
  { key: "companies", label: "Компании" },
  { key: "templates", label: "Шаблоны" },
  { key: "platform", label: "Платформа" },
  { key: "system", label: "Система" },
  { key: "event_journal", label: "Журнал событий" },
];

export const PLATFORM_SECTION_PERMISSION_GROUPS = {
  companies: [
    { key: "companies_view", label: "Просмотр" },
    { key: "companies_create", label: "Создание" },
    { key: "companies_edit", label: "Изменение" },
    { key: "companies_delete", label: "Удаление" },
    { key: "companies_clone", label: "Клонирование" },
    { key: "companies_switch", label: "Переключение" },
  ],
  templates: [
    { key: "templates_view", label: "Просмотр" },
    { key: "templates_create_version", label: "Создание версии" },
    { key: "templates_edit", label: "Изменение" },
    { key: "templates_delete", label: "Удаление" },
    { key: "templates_dev_to_template", label: "Передача DEV → TEMPLATE" },
    { key: "templates_publish", label: "Публикация" },
  ],
  platform: [
    { key: "platform_view", label: "Просмотр" },
    { key: "platform_settings", label: "Изменение настроек" },
    { key: "platform_licenses", label: "Управление лицензиями" },
    { key: "platform_monitoring", label: "Мониторинг" },
    { key: "platform_backup", label: "Резервное копирование" },
  ],
  system: [
    { key: "system_view", label: "Просмотр" },
    { key: "system_platform_users", label: "Пользователи платформы" },
    { key: "system_roles_access", label: "Роли и доступы" },
    { key: "system_assign_roles", label: "Назначение ролей" },
    { key: "system_event_journal", label: "Управление журналом событий" },
  ],
};

export const PLATFORM_ADMIN_CAPABILITIES = [
  { key: "admin_manage_platform_users", label: "Управление пользователями платформы" },
  { key: "admin_manage_roles", label: "Управление ролями" },
  { key: "admin_assign_roles", label: "Назначение ролей" },
  { key: "admin_manage_licenses", label: "Управление лицензиями" },
  { key: "admin_transfer_ownership", label: "Передача владения платформой" },
];

function buildPermissionMap(groups, enabledKeys) {
  const map = {};
  Object.entries(groups).forEach(([sectionKey, items]) => {
    map[sectionKey] = {};
    items.forEach((item) => {
      map[sectionKey][item.key] = enabledKeys.includes(item.key);
    });
  });
  return map;
}

function buildContourMap(enabledKeys) {
  const map = {};
  PLATFORM_CONTOURS.forEach((item) => {
    map[item.key] = enabledKeys.includes(item.key);
  });
  return map;
}

function buildCpSectionMap(enabledKeys) {
  const map = {};
  PLATFORM_CP_SECTIONS.forEach((item) => {
    map[item.key] = enabledKeys.includes(item.key);
  });
  return map;
}

function buildAdminMap(enabledKeys) {
  const map = {};
  PLATFORM_ADMIN_CAPABILITIES.forEach((item) => {
    map[item.key] = enabledKeys.includes(item.key);
  });
  return map;
}

function createSystemRole({
  key,
  label,
  description,
  tone,
  legacyRoleNames,
  contours,
  cpSections,
  sectionPermissions,
  adminCapabilities,
}) {
  return {
    id: key,
    key,
    label,
    description,
    tone,
    type: PLATFORM_ROLE_TYPE_SYSTEM,
    status: PLATFORM_ROLE_STATUS_ACTIVE,
    isSystem: true,
    legacyRoleNames,
    contours: buildContourMap(contours),
    cpSections: buildCpSectionMap(cpSections),
    sectionPermissions: buildPermissionMap(PLATFORM_SECTION_PERMISSION_GROUPS, sectionPermissions),
    adminCapabilities: buildAdminMap(adminCapabilities),
    createdAt: null,
    updatedAt: null,
  };
}

const ALL_SECTION_PERMISSIONS = Object.values(PLATFORM_SECTION_PERMISSION_GROUPS)
  .flat()
  .map((item) => item.key);

const ALL_ADMIN = PLATFORM_ADMIN_CAPABILITIES.map((item) => item.key);
const ALL_CONTOURS = PLATFORM_CONTOURS.map((item) => item.key);
const ALL_CP_SECTIONS = PLATFORM_CP_SECTIONS.map((item) => item.key);

export function buildSystemPlatformRoles() {
  return [
    createSystemRole({
      key: "platform_owner",
      label: "Platform Owner",
      description: "Полный контроль над платформой и всеми её компонентами.",
      tone: "owner",
      legacyRoleNames: ["superadmin"],
      contours: ALL_CONTOURS,
      cpSections: ALL_CP_SECTIONS,
      sectionPermissions: ALL_SECTION_PERMISSIONS,
      adminCapabilities: ALL_ADMIN,
    }),
    createSystemRole({
      key: "platform_administrator",
      label: "Platform Administrator",
      description: "Администрирование Control Plane, компаний и пользователей платформы.",
      tone: "admin",
      legacyRoleNames: ["admin"],
      contours: ["control_plane", "dev", "template", "demo", "clients"],
      cpSections: ALL_CP_SECTIONS,
      sectionPermissions: ALL_SECTION_PERMISSIONS.filter(
        (key) => key !== "admin_transfer_ownership",
      ),
      adminCapabilities: ALL_ADMIN.filter((key) => key !== "admin_transfer_ownership"),
    }),
    createSystemRole({
      key: "platform_developer",
      label: "Platform Developer",
      description: "Разработка и тестирование платформы.",
      tone: "developer",
      legacyRoleNames: ["editor"],
      contours: ["control_plane", "dev", "template", "demo"],
      cpSections: ["templates", "platform", "event_journal"],
      sectionPermissions: [
        "templates_view",
        "templates_create_version",
        "templates_edit",
        "templates_dev_to_template",
        "platform_view",
        "platform_monitoring",
        "system_view",
      ],
      adminCapabilities: [],
    }),
    createSystemRole({
      key: "release_manager",
      label: "Release Manager",
      description: "Публикации, передача в Template и контроль релизов.",
      tone: "release",
      legacyRoleNames: ["release_manager", "release-manager"],
      contours: ["control_plane", "template", "demo", "clients"],
      cpSections: ["companies", "templates", "event_journal"],
      sectionPermissions: [
        "companies_view",
        "templates_view",
        "templates_create_version",
        "templates_edit",
        "templates_dev_to_template",
        "templates_publish",
      ],
      adminCapabilities: [],
    }),
    createSystemRole({
      key: "support",
      label: "Support",
      description: "Поддержка пользователей и ограниченный доступ к операциям платформы.",
      tone: "support",
      legacyRoleNames: ["user", "support"],
      contours: ["control_plane", "clients"],
      cpSections: ["companies", "system"],
      sectionPermissions: [
        "companies_view",
        "companies_switch",
        "system_view",
        "system_platform_users",
      ],
      adminCapabilities: [],
    }),
    createSystemRole({
      key: "auditor",
      label: "Auditor",
      description: "Просмотр журнала событий и аудит операций платформы.",
      tone: "auditor",
      legacyRoleNames: ["auditor"],
      contours: ["control_plane"],
      cpSections: ["companies", "templates", "platform", "system", "event_journal"],
      sectionPermissions: [
        "companies_view",
        "templates_view",
        "platform_view",
        "system_view",
        "system_event_journal",
      ],
      adminCapabilities: [],
    }),
  ];
}

export function createEmptyCustomRole() {
  const timestamp = Date.now();
  const key = `custom_role_${timestamp}`;

  return {
    id: key,
    key,
    label: "",
    description: "",
    tone: "support",
    type: PLATFORM_ROLE_TYPE_CUSTOM,
    status: PLATFORM_ROLE_STATUS_ACTIVE,
    isSystem: false,
    legacyRoleNames: [],
    contours: buildContourMap([]),
    cpSections: buildCpSectionMap([]),
    sectionPermissions: buildPermissionMap(PLATFORM_SECTION_PERMISSION_GROUPS, []),
    adminCapabilities: buildAdminMap([]),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function clonePlatformRole(role) {
  return JSON.parse(JSON.stringify(role));
}

export function resolvePlatformRoleTypeLabel(role) {
  return role?.type === PLATFORM_ROLE_TYPE_CUSTOM || role?.isSystem === false
    ? "Пользовательская"
    : "Системная";
}

export function resolvePlatformRoleStatusLabel(status) {
  return status === PLATFORM_ROLE_STATUS_INACTIVE ? "Неактивна" : "Активна";
}

export function resolveLegacyPlatformPermissions(role) {
  const permissions = new Set();
  if (!role) {
    return [];
  }

  Object.entries(role.contours || {}).forEach(([key, enabled]) => {
    if (enabled) {
      permissions.add(key);
    }
  });

  if (role.cpSections?.event_journal) {
    permissions.add("event_journal");
  }
  if (role.sectionPermissions?.templates) {
    const templatePerms = role.sectionPermissions.templates;
    if (templatePerms.templates_publish) {
      permissions.add("publications");
    }
  }
  if (role.sectionPermissions?.platform?.platform_licenses || role.adminCapabilities?.admin_manage_licenses) {
    permissions.add("licenses");
  }
  if (role.adminCapabilities?.admin_manage_platform_users || role.cpSections?.system) {
    permissions.add("platform_users");
  }

  return [...permissions];
}

export function resolvePlatformRoleCatalogEntry(role) {
  return {
    key: role.key,
    label: role.label,
    description: role.description,
    tone: role.tone,
    legacyRoleNames: role.legacyRoleNames || [],
  };
}

export function countUsersForRole(users = [], roleKey) {
  return users.filter((user) => user.platformRoleKey === roleKey).length;
}

export function matchesPlatformRoleSearch(role, query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [role.label, role.key, role.description]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function sanitizeRoleKey(value = "") {
  return slugifyPlatformKey(value);
}

export function validateRoleKey(value, reservedKeys = []) {
  return validatePlatformKey(value, reservedKeys);
}

export function normalizeRoleKey(value = "") {
  return normalizePlatformKey(value);
}
