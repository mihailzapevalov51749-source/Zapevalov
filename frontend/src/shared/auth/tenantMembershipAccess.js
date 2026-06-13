function normalizeTenantId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function collectUserTenantIds(user) {
  const tenantIds = new Set();

  const primaryTenantId = normalizeTenantId(user?.tenant_id);
  if (primaryTenantId != null) {
    tenantIds.add(primaryTenantId);
  }

  const memberships = Array.isArray(user?.tenant_memberships)
    ? user.tenant_memberships
    : [];

  for (const membership of memberships) {
    if (membership?.is_active === false) {
      continue;
    }

    const membershipTenantId = normalizeTenantId(membership?.tenant_id);
    if (membershipTenantId != null) {
      tenantIds.add(membershipTenantId);
    }
  }

  return tenantIds;
}

export function userHasTenantAccess(user, tenantId) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (normalizedTenantId == null) {
    return false;
  }

  return collectUserTenantIds(user).has(normalizedTenantId);
}
