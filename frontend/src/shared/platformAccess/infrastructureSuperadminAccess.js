export function isInfrastructureSuperadmin(user) {
  return Boolean(
    user?.is_infrastructure_superadmin ?? user?.isInfrastructureSuperadmin,
  );
}
