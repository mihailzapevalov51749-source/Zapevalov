import { useContext } from "react";

import { AppShellShadowContext } from "./AppShellShadowProvider";

/**
 * Dev-only diagnostics panel for shadow mode.
 * Keep isolated from production layouts/routes.
 */
export default function AppShellShadowDiagnostics({ className = "" }) {
  const context = useContext(AppShellShadowContext);

  if (!context) {
    return null;
  }

  const { diagnostics, sidebarContract, headerContract } = context;
  const parityChecks = Array.isArray(diagnostics?.parityChecks)
    ? diagnostics.parityChecks
    : [];
  const designerParityChecks = Array.isArray(diagnostics?.designerParityChecks)
    ? diagnostics.designerParityChecks
    : [];

  function resolveStatusColor(status) {
    if (status === "pass") return "#22c55e";
    if (status === "warn") return "#f59e0b";
    if (status === "fail") return "#ef4444";
    return "#94a3b8";
  }

  return (
    <section
      className={className}
      data-appshell-shadow-diagnostics="true"
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.4,
        background: "#0f172a",
        color: "#e2e8f0",
        borderRadius: 8,
        padding: 12,
        overflow: "auto",
        maxHeight: 420,
      }}
    >
      <div style={{ marginBottom: 8, fontWeight: 700 }}>
        AppShell Shadow Diagnostics (DEV)
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Runtime/Shadow Parity Checklist
        </div>
        <div style={{ marginBottom: 6 }}>
          parityStatus:{" "}
          <strong style={{ color: resolveStatusColor(diagnostics?.parityStatus) }}>
            {diagnostics?.parityStatus ?? "unknown"}
          </strong>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {parityChecks.map((check) => (
            <div
              key={check.key}
              style={{
                border: "1px solid #1e293b",
                borderRadius: 6,
                padding: "6px 8px",
              }}
            >
              <div>
                <strong>{check.label}</strong>
              </div>
              <div>
                status:{" "}
                <span style={{ color: resolveStatusColor(check.status) }}>
                  {check.status}
                </span>
              </div>
              <div style={{ color: "#94a3b8" }}>{check.details}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Designer/Shadow Parity Checklist
        </div>
        <div style={{ marginBottom: 6 }}>
          designerParityStatus:{" "}
          <strong
            style={{
              color: resolveStatusColor(diagnostics?.designerParityStatus),
            }}
          >
            {diagnostics?.designerParityStatus ?? "unknown"}
          </strong>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {designerParityChecks.map((check) => (
            <div
              key={check.key}
              style={{
                border: "1px solid #1e293b",
                borderRadius: 6,
                padding: "6px 8px",
              }}
            >
              <div>
                <strong>{check.label}</strong>
              </div>
              <div>
                status:{" "}
                <span style={{ color: resolveStatusColor(check.status) }}>
                  {check.status}
                </span>
              </div>
              <div style={{ color: "#94a3b8" }}>{check.details}</div>
            </div>
          ))}
        </div>
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(
          {
            diagnostics,
            sidebarSummary: {
              mode: sidebarContract?.mode,
              collapsed: sidebarContract?.collapsed,
              sections: sidebarContract?.sections?.length ?? 0,
            },
            headerSummary: {
              mode: headerContract?.mode,
              title: headerContract?.title,
              subtitle: headerContract?.subtitle,
            },
          },
          null,
          2
        )}
      </pre>
    </section>
  );
}
