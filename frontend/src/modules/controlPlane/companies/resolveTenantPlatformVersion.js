/**
 * Canonical platform version for Control Plane company views.
 * Source of Truth: platform_environment_versions (API field platform_version).
 */
export function resolveTenantPlatformVersion(company) {
  const fromRegistry = String(company?.platform_version ?? "").trim();
  if (fromRegistry) {
    return fromRegistry;
  }

  const legacy = String(company?.template_version ?? "").trim();
  return legacy || "—";
}
