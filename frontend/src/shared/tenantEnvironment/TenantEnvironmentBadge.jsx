import "./tenantEnvironment.css";

export default function TenantEnvironmentBadge({
  environment,
  collapsed = false,
  className = "",
}) {
  if (!environment) {
    return null;
  }

  const isDev = environment.code === "DEV";

  const classNames = [
    "tenant-environment-badge",
    collapsed ? "tenant-environment-badge--collapsed" : "",
    isDev ? "tenant-environment-badge--dev" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classNames}
      style={{
        "--tenant-environment-color": environment.color,
      }}
      title={`Tenant ${environment.tenantId} · ${environment.label}`}
      data-tenant-environment={environment.code}
      data-tenant-id={environment.tenantId}
    >
      {environment.label}
    </span>
  );
}
