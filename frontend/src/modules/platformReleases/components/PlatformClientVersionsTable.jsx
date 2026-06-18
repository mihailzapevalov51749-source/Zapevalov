import PlatformVersionStatusBadge from "./PlatformVersionStatusBadge";

/**
 * Reserved for Client Rollout UI — columns defined but hidden until rollout data is available in API.
 * Set to true when update offers / template lag fields are wired.
 */
export const CLIENT_ROLLOUT_COLUMNS_ENABLED = false;

export const CLIENT_ROLLOUT_RESERVED_COLUMNS = [
  { key: "update_available", label: "Доступно обновление" },
  { key: "behind_template", label: "Отстаёт от эталона" },
  { key: "template_version", label: "Версия эталона" },
  { key: "last_updated_at", label: "Дата обновления" },
];

function formatDateTime(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("ru-RU");
}

function resolveCompanyName(row) {
  return row?.tenant_name || row?.tenant_code || `ID ${row?.tenant_id ?? "—"}`;
}

function renderRolloutPlaceholder(columnKey, templateVersion) {
  if (columnKey === "template_version" && templateVersion) {
    return templateVersion;
  }
  return "—";
}

export default function PlatformClientVersionsTable({ rows, templateVersion = null }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <p className="platform-versions-page__client-empty">
        Клиентские компании с зарегистрированной версией пока отсутствуют.
      </p>
    );
  }

  return (
    <div
      className="platform-versions-page__client-panel"
      data-rollout-ready={CLIENT_ROLLOUT_COLUMNS_ENABLED ? "active" : "reserved"}
    >
      <table className="platform-versions-page__client-table">
        <thead>
          <tr>
            <th>Компания</th>
            <th>Версия</th>
            <th>Дата установки</th>
            <th>Статус</th>
            {CLIENT_ROLLOUT_COLUMNS_ENABLED
              ? CLIENT_ROLLOUT_RESERVED_COLUMNS.map((column) => (
                  <th key={column.key} className="platform-versions-page__rollout-col">
                    {column.label}
                  </th>
                ))
              : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || `${row.tenant_id}-${row.platform_version}`}>
              <td className="platform-versions-page__client-company">{resolveCompanyName(row)}</td>
              <td>
                <span className="platform-versions-page__client-version">
                  {row.platform_version || "—"}
                </span>
              </td>
              <td className="platform-versions-page__history-muted">
                {formatDateTime(row.installed_at)}
              </td>
              <td>
                <PlatformVersionStatusBadge status={row.status} />
              </td>
              {CLIENT_ROLLOUT_COLUMNS_ENABLED
                ? CLIENT_ROLLOUT_RESERVED_COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className="platform-versions-page__rollout-col platform-versions-page__history-muted"
                    >
                      {renderRolloutPlaceholder(column.key, templateVersion)}
                    </td>
                  ))
                : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
