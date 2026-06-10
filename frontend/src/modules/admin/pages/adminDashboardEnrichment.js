export function isActiveUser(user) {
  const value = String(user?.status || "").toLowerCase();

  if (user?.is_active === true) return true;
  if (user?.is_active === false) return false;

  if (["active", "активен", "enabled"].includes(value)) return true;
  if (["inactive", "неактивен", "disabled", "blocked"].includes(value)) {
    return false;
  }

  return true;
}

function getUserTitle(user) {
  return (
    user?.full_name
    || user?.fullName
    || user?.name
    || user?.email
    || "Пользователь"
  );
}

function getUserSubtitle(user) {
  return user?.email || user?.role_name || user?.role || "Без email";
}

function getUserAvatarUrl(user) {
  return user?.avatar_url || user?.avatarUrl || null;
}

function getUserAvatarSettings(user) {
  return user?.avatar_settings || user?.avatarSettings || null;
}

export function buildUsersSectionEnrichment(users, isLoading) {
  const totalUsers = users.length;
  const activeUsers = users.filter(isActiveUser).length;
  const inactiveUsers = Math.max(totalUsers - activeUsers, 0);

  const latestUsers = users.slice(0, 4).map((user) => ({
    id: user?.id || user?.email,
    title: getUserTitle(user),
    subtitle: getUserSubtitle(user),
    avatarUrl: getUserAvatarUrl(user),
    avatarSettings: getUserAvatarSettings(user),
    meta: isActiveUser(user) ? "Активен" : "Неактивен",
  }));

  return {
    metrics: [
      {
        label: "Всего",
        value: isLoading ? "…" : String(totalUsers),
        tone: "primary",
      },
      {
        label: "Активных",
        value: isLoading ? "…" : String(activeUsers),
        tone: "success",
      },
      {
        label: "Неактивных",
        value: isLoading ? "…" : String(inactiveUsers),
        tone: "muted",
      },
    ],
    previewTitle: "Последние пользователи",
    previewItems: isLoading ? [] : latestUsers,
  };
}

export function buildRolesSectionEnrichment(roles, users, isLoading) {
  const roleList = Array.isArray(roles) ? roles : [];
  const userList = Array.isArray(users) ? users : [];
  const assignments = userList.filter(
    (user) => user?.role_id != null || user?.role || user?.role_name,
  ).length;

  return {
    metrics: [
      {
        label: "Ролей",
        value: isLoading ? "…" : String(roleList.length),
        tone: "primary",
      },
      {
        label: "Назначений",
        value: isLoading ? "…" : String(assignments),
        tone: "muted",
      },
    ],
    statuses: [
      {
        label: "Политик",
        text: "Нет данных",
        tone: "muted",
      },
    ],
  };
}

export function buildInDevelopmentSectionEnrichment(section) {
  return {
    ...section,
    metrics: [],
    status: "В разработке",
    previewItems: [],
    previewTitle: undefined,
  };
}
