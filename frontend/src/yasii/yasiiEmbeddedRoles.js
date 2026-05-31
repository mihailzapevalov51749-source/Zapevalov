const ROLE_LABELS = {
  "yasii-developer": "Developer Assistant",
  "yasii-owner-assistant": "Owner Assistant",
};

export function resolveEmbeddedRoleLabel(roleIds) {
  const ids = Array.isArray(roleIds) ? roleIds : [];

  for (const roleId of ids) {
    if (ROLE_LABELS[roleId]) {
      return ROLE_LABELS[roleId];
    }
  }

  return "Assistant";
}

export function resolveEmbeddedContextLabel(dashboardId) {
  if (dashboardId === "owner") {
    return "Owner Dashboard";
  }

  return "Platform Development";
}
