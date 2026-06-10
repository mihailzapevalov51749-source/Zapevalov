import "./tenantEnvironment.css";

export default function TenantEnvironmentTopBar({ environment }) {
  if (!environment) {
    return null;
  }

  return (
    <div
      className="tenant-environment-top-bar"
      style={{
        "--tenant-environment-color": environment.color,
      }}
      data-tenant-environment={environment.code}
      data-tenant-id={environment.tenantId}
      aria-hidden="true"
    />
  );
}
